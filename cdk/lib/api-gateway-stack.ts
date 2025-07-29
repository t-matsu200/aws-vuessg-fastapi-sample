import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import { AppConstants } from './app-constants';

/**
 * ApiGatewayStackのプロパティ。
 * @interface ApiGatewayStackProps
 * @extends cdk.StackProps
 */
interface ApiGatewayStackProps extends cdk.StackProps {
  /**
   * API Gatewayへのアクセスを制限するために使用される、API GatewayのVPCエンドポイントID。
   */
  apiGatewayEndpointId: string;
  /**
   * API Gatewayが統合するネットワークロードバランサー（NLB）のARN。
   */
  nlbArn: string;
  /**
   * API Gateway統合のためのネットワークロードバランサー（NLB）のDNS名。
   */
  nlbDnsName: string;
}

/**
 * API GatewayをデプロイするためのAWS CDKスタックを定義します。
 * このAPI GatewayはプライベートAPIとして設定され、VPCリンクを介してネットワークロードバランサー（NLB）と統合され、
 * VPCエンドポイントを介してのみアクセス可能です。
 */
export class ApiGatewayStack extends cdk.Stack {
  /**
   * 作成されたAPI Gateway RestApiインスタンス。
   */
  public readonly api: apigateway.RestApi;

  /**
   * ApiGatewayStackのインスタンスを作成します。
   * @param {Construct} scope このコンストラクトを定義するスコープ。
   * @param {string} id コンストラクトのID。
   * @param {ApiGatewayStackProps} props このスタックのプロパティ。
   */
  constructor(scope: Construct, id: string, props: ApiGatewayStackProps) {
    super(scope, id, props);

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
    this.api = new apigateway.RestApi(this, `${systemName}-ApiGateway`, {
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

    this.createVpcLinkAndIntegration(systemName, props.nlbArn, props.nlbDnsName);
    this.createCfnOutputs(systemName);
  }

  /**
   * NLBに接続するためにVPCリンクを作成し、API Gatewayと統合します。
   * @param {string} systemName リソース命名に使用されるシステム名。
   * @param {string} nlbArn ネットワークロードバランサーのARN。
   * @param {string} nlbDnsName ネットワークロードバランサーのDNS名。
   */
  private createVpcLinkAndIntegration(systemName: string, nlbArn: string, nlbDnsName: string) {
    // VPCリンクを作成するために既存のNLBをインポートします。
    const nlb = elbv2.NetworkLoadBalancer.fromNetworkLoadBalancerAttributes(this, 'ImportedNlbForApiGw', {
      loadBalancerArn: nlbArn,
    });

    // API GatewayがVPC内でNLBに接続できるようにVPCリンクを作成します。
    const vpcLink = new apigateway.VpcLink(this, `${systemName}-VpcLink`, {
      targets: [nlb],
    });

    // ルートパス ('/') にANYメソッドでHTTPプロキシ統合を追加します。
    // https://github.com/aws/aws-cdk/issues/28545
    this.api.root.addProxy({
      anyMethod: true,
      defaultIntegration: new apigateway.HttpIntegration(
        `http://${nlbDnsName}/${AppConstants.API_PATH}/{proxy}`,
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

  /**
   * CloudFormationのoutputを作成します
   * これらの出力はエクスポートされ、他のスタックや外部参照に使用できます
   * @param {string} systemName エクスポート名に使用されるシステム名
   */
  private createCfnOutputs(systemName: string) {
    // プライベートAPI GatewayのURLを出力します。
    new cdk.CfnOutput(this, 'PrivateApiGatewayUrl', {
      value: `${this.api.url}${AppConstants.API_PATH}`,
      description: 'URL of the private API Gateway',
      exportName: AppConstants.getPrivateApiGatewayUrlExportName(systemName),
    });

    // API GatewayのIDを出力します。
    new cdk.CfnOutput(this, 'ApiId', {
      value: this.api.restApiId,
      description: 'ID of the API Gateway',
      exportName: AppConstants.getApiIdExportName(systemName),
    });
  }
}
