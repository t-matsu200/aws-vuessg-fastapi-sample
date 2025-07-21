import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as cr from 'aws-cdk-lib/custom-resources';
import * as iam from 'aws-cdk-lib/aws-iam';

export class VpcStack extends cdk.Stack {
  public readonly vpc: ec2.Vpc;
  public readonly s3Endpoint: ec2.InterfaceVpcEndpoint;
  public readonly apiGatewayEndpoint: ec2.InterfaceVpcEndpoint;
  public readonly s3EndpointIPs: string[];
  public readonly apiGatewayEndpointIPs: string[];

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const systemName = this.node.tryGetContext('systemName');

    this.vpc = new ec2.Vpc(this, `${systemName}-AppVpc`, {
      maxAzs: 2,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'public',
          subnetType: ec2.SubnetType.PUBLIC,
        },
        {
          cidrMask: 24,
          name: 'private',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
      ],
    });

    this.vpc.addGatewayEndpoint('S3GatewayEndpoint', {
      service: ec2.GatewayVpcEndpointAwsService.S3,
    });

    this.s3Endpoint = new ec2.InterfaceVpcEndpoint(this, `${systemName}-S3VpcEndpoint`, {
        vpc: this.vpc,
        service: ec2.InterfaceVpcEndpointAwsService.S3,
        privateDnsEnabled: true,
        subnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
    });

    this.apiGatewayEndpoint = new ec2.InterfaceVpcEndpoint(this, `${systemName}-ApiGatewayVpcEndpoint`, {
        vpc: this.vpc,
        service: ec2.InterfaceVpcEndpointAwsService.APIGATEWAY,
        privateDnsEnabled: true,
        subnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
    });

    // --- Helper function to create AwsCustomResource for getting ENI IP ---
    const getEniIp = (scope: Construct, id: string, eniId: string): string => {
      const getIpCr = new cr.AwsCustomResource(scope, id, {
        onUpdate: { // onUpdate is also needed for resource updates
          service: 'EC2',
          action: 'describeNetworkInterfaces',
          parameters: {
            NetworkInterfaceIds: [eniId],
          },
          physicalResourceId: cr.PhysicalResourceId.fromResponse('NetworkInterfaces.0.NetworkInterfaceId'),
        },
        policy: cr.AwsCustomResourcePolicy.fromStatements([
          new iam.PolicyStatement({
            actions: ['ec2:DescribeNetworkInterfaces'],
            resources: ['*'],
          }),
        ]),
      });
      return getIpCr.getResponseField('NetworkInterfaces.0.PrivateIpAddress');
    };

    // --- Get IPs for S3 Endpoint ---
    this.s3EndpointIPs = [
        getEniIp(this, 'S3EniIp0', cdk.Fn.select(0, this.s3Endpoint.vpcEndpointNetworkInterfaceIds)),
        getEniIp(this, 'S3EniIp1', cdk.Fn.select(1, this.s3Endpoint.vpcEndpointNetworkInterfaceIds)),
    ];

    // --- Get IPs for API Gateway Endpoint ---
    this.apiGatewayEndpointIPs = [
        getEniIp(this, 'ApiGwEniIp0', cdk.Fn.select(0, this.apiGatewayEndpoint.vpcEndpointNetworkInterfaceIds)),
        getEniIp(this, 'ApiGwEniIp1', cdk.Fn.select(1, this.apiGatewayEndpoint.vpcEndpointNetworkInterfaceIds)),
    ];
  }
}