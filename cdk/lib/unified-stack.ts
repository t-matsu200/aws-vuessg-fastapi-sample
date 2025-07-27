import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as elbv2_targets from 'aws-cdk-lib/aws-elasticloadbalancingv2-targets';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as cr from 'aws-cdk-lib/custom-resources';

export class UnifiedStack extends cdk.Stack {
  public readonly vpc: ec2.IVpc;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const systemName = this.node.tryGetContext('systemName');

    // 1. ネットワーク関連リソースの作成
    const { vpc, s3Endpoint, apiGatewayEndpoint } = this.createNetworkResources(systemName);
    this.vpc = vpc;

    // 2. バックエンド関連リソースの作成
    const { backendEc2Instance, nlb } = this.createBackendResources(systemName, vpc);

    // 3. フロントエンド関連リソースの作成
    const { bucket } = this.createFrontendResources(systemName, vpc, s3Endpoint);

    // 4. API Gateway の作成
    const { api } = this.createApiGatewayResources(systemName, apiGatewayEndpoint, nlb);

    // 5. ALB とルーティングの設定
    this.createAlbAndRouting(systemName, vpc, s3Endpoint, apiGatewayEndpoint, api);
  }

  /**
   * ネットワーク関連リソース（VPC、VPCエンドポイント）を作成します。
   */
  private createNetworkResources(systemName: string) {
    const vpc = new ec2.Vpc(this, `${systemName}-AppVpc`, {
      maxAzs: 2,
      subnetConfiguration: [
        { cidrMask: 24, name: 'public', subnetType: ec2.SubnetType.PUBLIC },
        { cidrMask: 24, name: 'private', subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      ],
    });

    const s3Endpoint = vpc.addInterfaceEndpoint(`${systemName}-S3VpcEndpoint`, {
      service: ec2.InterfaceVpcEndpointAwsService.S3,
      subnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      privateDnsEnabled: true,
      privateDnsOnlyForInboundResolverEndpoint: ec2.VpcEndpointPrivateDnsOnlyForInboundResolverEndpoint.ALL_RESOLVERS
    });

    const apiGatewayEndpoint = vpc.addInterfaceEndpoint(`${systemName}-ApiGatewayVpcEndpoint`, {
      service: ec2.InterfaceVpcEndpointAwsService.APIGATEWAY,
      subnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      privateDnsEnabled: true,
    });

    return { vpc, s3Endpoint, apiGatewayEndpoint };
  }

  /**
   * バックエンド関連リソース（EC2、NLB）を作成します。
   */
  private createBackendResources(systemName: string, vpc: ec2.IVpc) {
    const ec2Sg = new ec2.SecurityGroup(this, `${systemName}-BackendEc2Sg`, {
      vpc: vpc,
      allowAllOutbound: true,
    });

    const ec2Role = new iam.Role(this, `${systemName}-BackendEc2Role`, {
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore'),
      ],
    });

    const backendEc2Instance = new ec2.Instance(this, `${systemName}-BackendEc2Instance`, {
      vpc: vpc,
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
      machineImage: ec2.MachineImage.latestAmazonLinux2(),
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      securityGroup: ec2Sg,
      role: ec2Role,
    });

    const nlb = new elbv2.NetworkLoadBalancer(this, `${systemName}-BackendNlb`, {
      vpc: vpc,
      internetFacing: false,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
    });

    const backendListener = nlb.addListener(`${systemName}-BackendListener`, { port: 80 });
    backendListener.addTargets(`${systemName}-BackendTarget`, {
      port: 80,
      targets: [new elbv2_targets.InstanceTarget(backendEc2Instance)],
    });

    return { backendEc2Instance, nlb };
  }

  /**
   * フロントエンド関連リソース（S3バケット）を作成します。
   */
  private createFrontendResources(systemName: string, vpc: ec2.IVpc, s3Endpoint: ec2.IInterfaceVpcEndpoint) {
    const bucket = new s3.Bucket(this, `${systemName}-FrontendAppBucket`, {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // ALBからS3 VPCエンドポイント経由のアクセスのみを許可
    bucket.addToResourcePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      principals: [new iam.AnyPrincipal()],
      actions: ['s3:GetObject'],
      resources: [
        bucket.bucketArn,
        bucket.arnForObjects('*'),
      ],
      conditions: {
        'StringEquals': { 'aws:sourceVpce': s3Endpoint.vpcEndpointId },
      },
    }));

    // CDKからのデプロイやリソース削除を許可
    bucket.addToResourcePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      principals: [new iam.AnyPrincipal()],
      actions: ['s3:*'],
      resources: [
        bucket.bucketArn,
        bucket.arnForObjects('*'),
      ],
      conditions: {
        'ArnLike': {
          'aws:PrincipalArn': [
            `arn:aws:iam::${this.account}:role/cdk-*`,
            `arn:aws:iam::${this.account}:role/*CustomS3AutoDeleteObjects*`
          ]
        },
      },
    }));

    return { bucket };
  }

  /**
   * API Gateway関連リソースを作成します。
   */
  private createApiGatewayResources(systemName: string, apiGatewayEndpoint: ec2.IInterfaceVpcEndpoint, nlb: elbv2.INetworkLoadBalancer) {
    const api = new apigateway.RestApi(this, `${systemName}-ApiGateway`, {
      restApiName: `${systemName}-ApiGateway`,
      deployOptions: {
        stageName: 'api', // ステージ名を'api'に変更
      },
      endpointConfiguration: {
        types: [apigateway.EndpointType.PRIVATE],
        vpcEndpoints: [apiGatewayEndpoint]
      },
      policy: new iam.PolicyDocument({
        statements: [
          new iam.PolicyStatement({
            actions: ['execute-api:Invoke'],
            resources: ['execute-api:/*'],
            effect: iam.Effect.ALLOW,
            principals: [new iam.AnyPrincipal()],
            conditions: {
              StringEquals: {
                'aws:sourceVpce': apiGatewayEndpoint.vpcEndpointId,
              },
            },
          })
        ]
      })
    });

    const vpcLink = new apigateway.VpcLink(this, `${systemName}-VpcLink`, {
      targets: [nlb],
    });

    const integration = new apigateway.Integration({
      type: apigateway.IntegrationType.HTTP_PROXY,
      integrationHttpMethod: 'ANY',
      options: {
        connectionType: apigateway.ConnectionType.VPC_LINK,
        vpcLink: vpcLink,
      },
      uri: `http://${nlb.loadBalancerDnsName}`
    });
    api.root.addProxy({ defaultIntegration: integration });

    return { api };
  }

  /**
   * ALBとルーティング関連リソースを作成します。
   */
  private createAlbAndRouting(
    systemName: string,
    vpc: ec2.IVpc,
    s3Endpoint: ec2.IInterfaceVpcEndpoint,
    apiGatewayEndpoint: ec2.IInterfaceVpcEndpoint,
    api: apigateway.IRestApi
  ) {
    const internalAlb = new elbv2.ApplicationLoadBalancer(this, `${systemName}-InternalAlb`, {
      vpc: vpc,
      internetFacing: false,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
    });

    const albSg = new ec2.SecurityGroup(this, `${systemName}-InternalAlbSg`, {
      vpc: vpc,
      allowAllOutbound: true,
    });
    albSg.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(80), 'Allow HTTP traffic from anywhere for now');
    internalAlb.addSecurityGroup(albSg);

    const s3EndpointIPs = vpc.privateSubnets.map(
      (subnet, i) => this.getEndpointPrivateIpAddress(`s3-${i}`, vpc, s3Endpoint, subnet.subnetId)
    );
    const s3Targets = s3EndpointIPs.map(ip => new elbv2_targets.IpTarget(ip));
    const s3TargetGroup = new elbv2.ApplicationTargetGroup(this, `${systemName}-S3TargetGroup`, {
        vpc: vpc,
        port: 443,
        protocol: elbv2.ApplicationProtocol.HTTPS,
        protocolVersion: elbv2.ApplicationProtocolVersion.HTTP1,
        targets: s3Targets,
        healthCheck: {
          protocol: elbv2.Protocol.HTTPS,
          path: '/',
          healthyHttpCodes: '307',
          healthyThresholdCount: 2,
          unhealthyThresholdCount: 5,
          interval: cdk.Duration.seconds(30),
          timeout: cdk.Duration.seconds(10),
        }
    });

    const apiGatewayEndpointIPs = vpc.privateSubnets.map(
      (subnet, i) => this.getEndpointPrivateIpAddress(`apigw-${i}`, vpc, apiGatewayEndpoint, subnet.subnetId)
    );
    const apiGatewayTargets = apiGatewayEndpointIPs.map(ip => new elbv2_targets.IpTarget(ip));
    const apiGatewayTargetGroup = new elbv2.ApplicationTargetGroup(this, `${systemName}-ApiGatewayTargetGroup`, {
      vpc: vpc,
      port: 443,
      protocol: elbv2.ApplicationProtocol.HTTPS,
      protocolVersion: elbv2.ApplicationProtocolVersion.HTTP1,
      targets: apiGatewayTargets,
      healthCheck: {
        protocol: elbv2.Protocol.HTTPS,
        path: '/',
        healthyHttpCodes: '200-499',
        healthyThresholdCount: 2,
        unhealthyThresholdCount: 5,
        interval: cdk.Duration.seconds(30),
        timeout: cdk.Duration.seconds(10),
      }
    });

    const listener = internalAlb.addListener(`${systemName}-DefaultListener`, {
        port: 80,
        defaultAction: elbv2.ListenerAction.forward([s3TargetGroup])
    });

    listener.addAction('ApiGatewayRule', {
      priority: 1,
      conditions: [
        elbv2.ListenerCondition.hostHeaders([`${api.restApiId}.execute-api.${this.region}.amazonaws.com`]),
        elbv2.ListenerCondition.pathPatterns(['/*'])
      ],
      action: elbv2.ListenerAction.forward([apiGatewayTargetGroup])
    });

    listener.addAction('ApiProxyRule', {
      priority: 2,
      conditions: [elbv2.ListenerCondition.pathPatterns(['/api/*'])],
      action: elbv2.ListenerAction.forward([apiGatewayTargetGroup])
    });

    // 内部ALBのURLを出力
    new cdk.CfnOutput(this, 'InternalAlbUrl', {
      value: `http://${internalAlb.loadBalancerDnsName}`,
      description: 'The URL of the internal Application Load Balancer',
      exportName: `${systemName}-InternalAlbUrl`,
    });
  }

  /**
   * VPCエンドポイントのプライベートIPアドレスを取得します。
   */
  private getEndpointPrivateIpAddress(
    crid: string, vpc: ec2.IVpc, endpoint: ec2.IInterfaceVpcEndpoint, subnetId: string
  ): string {
    const privateIpAddressField = 'PrivateIpAddress';
    const resource = new cr.AwsCustomResource(this, `GetEndpointIp-${crid}` , {
      onUpdate: {
        service: "EC2",
        action: "describeNetworkInterfaces",
        outputPaths: [`NetworkInterfaces.0.${privateIpAddressField}`],
        parameters: { 
          Filters: [
            { Name: 'interface-type', Values: ['vpc_endpoint'] },
            { Name: 'vpc-id', Values: [vpc.vpcId] },
            { Name: 'subnet-id', Values: [subnetId] },
            { Name: 'description', Values: [`VPC Endpoint Interface ${endpoint.vpcEndpointId}`] },
          ]
        },
        physicalResourceId: cr.PhysicalResourceId.of(`GetEndpointIp-${crid}-${endpoint.vpcEndpointId}-${subnetId}`),
      },
      policy: cr.AwsCustomResourcePolicy.fromStatements([
        new iam.PolicyStatement({
          actions: ['ec2:DescribeNetworkInterfaces'],
          resources: ['*'],
        }),
      ]),
    });
    return resource.getResponseField(`NetworkInterfaces.0.${privateIpAddressField}`);
  };
}