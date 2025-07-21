import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as elbv2_targets from 'aws-cdk-lib/aws-elasticloadbalancingv2-targets';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as iam from 'aws-cdk-lib/aws-iam';

interface VueAppStackProps extends cdk.StackProps {
  vpc: ec2.Vpc;
  s3Endpoint: ec2.InterfaceVpcEndpoint;
  apiGatewayEndpoint: ec2.InterfaceVpcEndpoint;
  pythonNlb: elbv2.NetworkLoadBalancer;
  s3EndpointIPs: string[];
  apiGatewayEndpointIPs: string[];
}

export class VueAppStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: VueAppStackProps) {
    super(scope, id, props);

    const systemName = this.node.tryGetContext('systemName');

    // S3 Bucket for Vue.js app
    const bucket = new s3.Bucket(this, `${systemName}-VueAppBucket`, {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    const bucketPolicy = new iam.PolicyStatement({
      actions: ['s3:GetObject'],
      resources: [bucket.bucketArn + '/*'],
      principals: [new iam.AnyPrincipal()], // Simplified for now, will be restricted
    });
    bucket.addToResourcePolicy(bucketPolicy);

    // API Gateway (REST API)
    const api = new apigateway.RestApi(this, `${systemName}-VueApiGateway`, {
        restApiName: `${systemName}-VueApiGateway`,
        endpointConfiguration: {
            types: [apigateway.EndpointType.PRIVATE],
            vpcEndpoints: [props.apiGatewayEndpoint]
        },
        policy: new iam.PolicyDocument({
            statements: [
                new iam.PolicyStatement({
                    actions: ['execute-api:Invoke'],
                    resources: ['execute-api:/*'],
                    effect: iam.Effect.ALLOW,
                    principals: [new iam.AnyPrincipal()],
                })
            ]
        })
    });

    const vpcLink = new apigateway.VpcLink(this, `${systemName}-VpcLink`, {
      targets: [props.pythonNlb],
    });

    const integration = new apigateway.Integration({
        type: apigateway.IntegrationType.HTTP_PROXY,
        integrationHttpMethod: 'ANY',
        options: {
            connectionType: apigateway.ConnectionType.VPC_LINK,
            vpcLink: vpcLink,
        },
        uri: `http://${props.pythonNlb.loadBalancerDnsName}`
    });

    api.root.addProxy({ defaultIntegration: integration });

    // ALB for Vue app
    const albSg = new ec2.SecurityGroup(this, `${systemName}-VueAlbSg`, {
      vpc: props.vpc,
      allowAllOutbound: true,
    });
    albSg.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(80), 'Allow HTTP traffic from anywhere for now');

    const alb = new elbv2.ApplicationLoadBalancer(this, `${systemName}-VueAlb`, {
      vpc: props.vpc,
      internetFacing: false,
      securityGroup: albSg,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
    });

    // --- Target for S3 ---
    const s3Targets = props.s3EndpointIPs.map(ip => new elbv2_targets.IpTarget(ip));
    const s3TargetGroup = new elbv2.ApplicationTargetGroup(this, `${systemName}-S3TargetGroup`, {
        vpc: props.vpc,
        port: 443,
        protocol: elbv2.ApplicationProtocol.HTTPS,
        protocolVersion: elbv2.ApplicationProtocolVersion.HTTP1,
        targets: s3Targets,
        healthCheck: {
            protocol: elbv2.Protocol.HTTPS,
            path: '/', // S3 root object
            healthyHttpCodes: '200',
            healthyThresholdCount: 2,
            unhealthyThresholdCount: 5,
            interval: cdk.Duration.seconds(30),
            timeout: cdk.Duration.seconds(10),
        }
    });

    // --- Target for API Gateway ---
    const apiGatewayTargets = props.apiGatewayEndpointIPs.map(ip => new elbv2_targets.IpTarget(ip));
    const apiGatewayTargetGroup = new elbv2.ApplicationTargetGroup(this, `${systemName}-ApiGatewayTargetGroup`, {
        vpc: props.vpc,
        port: 443,
        protocol: elbv2.ApplicationProtocol.HTTPS,
        protocolVersion: elbv2.ApplicationProtocolVersion.HTTP1,
        targets: apiGatewayTargets,
        healthCheck: {
            protocol: elbv2.Protocol.HTTPS,
            path: '/', // API Gateway root path
            healthyHttpCodes: '200-499', // Allow a wide range for proxy
            healthyThresholdCount: 2,
            unhealthyThresholdCount: 5,
            interval: cdk.Duration.seconds(30),
            timeout: cdk.Duration.seconds(10),
        }
    });

    const listener = alb.addListener('Listener', {
        port: 80,
        defaultAction: elbv2.ListenerAction.forward([s3TargetGroup]) // Default action to S3
    });

    listener.addAction('ApiGatewayRule', {
        priority: 1,
        conditions: [
            elbv2.ListenerCondition.hostHeaders([`${api.restApiId}.execute-api.${this.region}.amazonaws.com`]),
            elbv2.ListenerCondition.pathPatterns(['/*'])
        ],
        action: elbv2.ListenerAction.forward([apiGatewayTargetGroup])
    });

    // Add a rule for the API Gateway proxy path
    listener.addAction('ApiProxyRule', {
        priority: 2,
        conditions: [elbv2.ListenerCondition.pathPatterns(['/api/*'])],
        action: elbv2.ListenerAction.forward([apiGatewayTargetGroup])
    });
  }
}