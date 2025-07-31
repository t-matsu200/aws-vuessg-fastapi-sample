
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import { AppConstants } from '../app-constants';

/**
 * ApiGatewayConstructのプロパティ。
 * @interface ApiGatewayConstructProps
 */
export interface ApiGatewayConstructProps {
  /**
   * API Gatewayへのアクセスを制限するために使用される、API GatewayのVPCエンドポイントID。
   */
  apiGatewayEndpointId: string;
  /**
   * API Gatewayが統合するネットワークロードバランサー（NLB）のARN。
   */
  nlbArn: string;
  /**
   * API Gatewayが統合するネットワークロードバランサー（NLB）のDNS名。
   */
  nlbDnsName: string;
}

/**
 * API GatewayをデプロイするためのAWS CDKコンストラクトを定義します。
 * このAPI GatewayはプライベートAPIとして設定され、VPCリンクを介してネットワークロードバランサー（NLB）と統合され、
 * VPCエンドポイントを介してのみアクセス可能です。
 */
export class ApiGatewayConstruct extends Construct {
  /**
   * 作成されたAPI GatewayのID。
   */
  public readonly apiId: string;
  /**
   * 作成されたAPI GatewayのARN。
   */
  public readonly apiArn: string;

  /**
   * ApiGatewayConstructのインスタンスを作成します。
   * @param {Construct} scope このコンストラクトを定義するスコープ。
   * @param {string} id コンストラクトのID。
   * @param {ApiGatewayConstructProps} props このコンストラクトのプロパティ。
   */
  constructor(scope: Construct, id: string, props: ApiGatewayConstructProps) {
    super(scope, id);

    const systemName = this.node.tryGetContext('systemName');

    // API Gatewayのアクセスログを保存するためのCloudWatchロググループを作成します。
    const logGroup = new logs.LogGroup(this, `${systemName}-ApiGatewayAccessLogs`);

    // API GatewayがCloudWatch Logsに書き込むためのIAMロールを作成します。
    const apiGatewayCloudWatchRole = new iam.Role(this, `${systemName}-ApiGatewayCloudWatchRole`, {
      assumedBy: new iam.ServicePrincipal('apigateway.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonAPIGatewayPushToCloudWatchLogs'),
      ],
    });

    // プライベートAPI Gatewayに関連付けるために、API Gateway VPCエンドポイントをインポートします。
    const apiGatewayEndpoint = ec2.InterfaceVpcEndpoint.fromInterfaceVpcEndpointAttributes(this, 'ImportedApiGatewayEndpoint', {
      vpcEndpointId: props.apiGatewayEndpointId,
      port: 443,
    });

    // 指定されたVPCエンドポイントと統合するプライベートAPI Gatewayを作成します。
    const api = new apigateway.RestApi(this, `${systemName}-ApiGateway`, {
      restApiName: `${systemName}-ApiGateway`,
      deployOptions: {
        // API Gatewayデプロイのステージ名を設定します。
        stageName: AppConstants.API_PATH,
        accessLogDestination: new apigateway.LogGroupLogDestination(logGroup),
        accessLogFormat: apigateway.AccessLogFormat.jsonWithStandardFields({
          caller: true,
          httpMethod: true,
          ip: true,
          protocol: true,
          requestTime: true,
          resourcePath: true,
          responseLength: true,
          status: true,
          user: true,
        }),
      },
      endpointConfiguration: {
        types: [apigateway.EndpointType.PRIVATE],
        vpcEndpoints: [apiGatewayEndpoint]
      },
      // VPCエンドポイントからのAPI Gatewayへのアクセスを制限するリソースポリシーを定義します。
      policy: new iam.PolicyDocument({
        statements: [
          new iam.PolicyStatement({
            actions: ['execute-api:Invoke'],
            resources: ['execute-api:/*'],
            effect: iam.Effect.ALLOW,
            principals: [new iam.AnyPrincipal()],
            conditions: {
              StringEquals: {
                'aws:sourceVpce': props.apiGatewayEndpointId,
              },
            },
          }),
          new iam.PolicyStatement({
            actions: ['sts:AssumeRole'],
            resources: [apiGatewayCloudWatchRole.roleArn],
            effect: iam.Effect.ALLOW,
            principals: [new iam.ServicePrincipal('apigateway.amazonaws.com')],
          }),
        ]
      })
    });

    this.apiId = api.restApiId;
    this.apiArn = api.arnForExecuteApi();

    this.createVpcLinkAndIntegration(api, systemName, props.nlbArn, props.nlbDnsName);
  }

  /**
   * NLBに接続するためにVPCリンクを作成し、API Gatewayと統合します。
   * @param {string} systemName リソース命名に使用されるシステム名。
   * @param {string} nlbArn ネットワークロードバランサーのARN。
   * @param {string} nlbDnsName ネットワークロードバランサーのDNS名。
   */
  private createVpcLinkAndIntegration(api: apigateway.RestApi, systemName: string, nlbArn: string, nlbDnsName: string) {
    // VPCリンクを作成するために既存のNLBをインポートします。
    const nlb = elbv2.NetworkLoadBalancer.fromNetworkLoadBalancerAttributes(this, 'ImportedNlbForApiGw', {
      loadBalancerArn: nlbArn,
      loadBalancerDnsName: nlbDnsName,
    });

    // API GatewayがVPC内でNLBに接続できるようにVPCリンクを作成します。
    const vpcLink = new apigateway.VpcLink(this, `${systemName}-VpcLink`, {
      targets: [nlb],
    });

    // ルートパス ('/') にANYメソッドでHTTPプロキシ統合を追加します。
    // https://github.com/aws/aws-cdk/issues/28545
    api.root.addProxy({
      anyMethod: true,
      defaultIntegration: new apigateway.HttpIntegration(
        `http://${nlb.loadBalancerDnsName}/${AppConstants.API_PATH}/{proxy}`,
        {
          proxy: true,
          httpMethod: 'ANY',
          options: {
            vpcLink,
            connectionType: apigateway.ConnectionType.VPC_LINK,
            requestParameters: { 'integration.request.path.proxy': 'method.request.path.proxy' },
          }
        },
      ),
      defaultMethodOptions: {
        requestParameters: { 'method.request.path.proxy': true },
      },
    });
  }
}
