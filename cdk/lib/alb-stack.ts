import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as elbv2_targets from 'aws-cdk-lib/aws-elasticloadbalancingv2-targets';
import * as cr from 'aws-cdk-lib/custom-resources';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { AppConstants } from './app-constants';

/**
 * AlbStackのプロパティ。
 * @interface AlbStackProps
 * @extends cdk.StackProps
 */
interface AlbStackProps extends cdk.StackProps {
  /**
   * ALBがデプロイされるVPC。
   */
  vpc: ec2.IVpc;
  /**
   * ALBを介してS3トラフィックをルーティングするために使用されるS3 VPCエンドポイントID。
   */
  s3EndpointId: string;
  /**
   * ALBを介してAPI Gatewayトラフィックをルーティングするために使用されるAPI Gateway VPCエンドポイントID。
   */
  apiGatewayEndpointId: string;
  /**
   * ホストベースのルーティングルールに使用されるAPI GatewayのID。
   */
  apiId: string;
}

/**
 * アプリケーションロードバランサー（ALB）をデプロイするためのAWS CDKスタックを定義します。
 * このALBは、S3（VPCエンドポイント経由）とプライベートAPI Gateway（VPCエンドポイント経由）の両方にトラフィックをルーティングするように設定されており、
 * これらのAWSサービスへの内部アクセスを可能にします。
 */
export class AlbStack extends cdk.Stack {
  private internalAlb: elbv2.ApplicationLoadBalancer;
  private albSg: ec2.SecurityGroup;

  /**
   * AlbStackのインスタンスを作成します。
   * @param {Construct} scope このコンストラクトを定義するスコープ。
   * @param {string} id コンストラクトのID。
   * @param {AlbStackProps} props このスタックのプロパティ。
   */
  constructor(scope: Construct, id: string, props: AlbStackProps) {
    super(scope, id, props);

    const systemName = this.node.tryGetContext('systemName');
    const vpc = props.vpc;

    // 内部ALBとそれに関連するセキュリティグループを作成します。
    this.createAlbAndSecurityGroup(systemName, vpc);

    // ALBのアクセスログを有効にします。
    this.enableAccessLogs(systemName);

    // S3とAPI Gatewayのターゲットグループを作成し、それぞれのVPCエンドポイントにマッピングします。
    const { s3TargetGroup, apiGatewayTargetGroup } = this.createTargetGroups(systemName, vpc, props.s3EndpointId, props.apiGatewayEndpointId);

    // ALBのリスナーとルーティングルールを設定し、トラフィックを正しいターゲットグループに転送します。
    this.createListenersAndRules(systemName, s3TargetGroup, apiGatewayTargetGroup, props.apiId);

    // 重要なスタックリソースのCloudFormation出力を作成します。
    this.createCfnOutputs(systemName);
  }

  /**
   * CloudFormationのoutputを作成します
   * これらの出力はエクスポートされ、他のスタックや外部参照に使用できます
   * @param {string} systemName エクスポート名に使用されるシステム名
   */
  private createCfnOutputs(systemName: string) {
    // 内部ALBのURLを出力します。
    new cdk.CfnOutput(this, 'InternalAlbUrl', {
      value: `http://${this.internalAlb.loadBalancerDnsName}`,
      description: 'Internal ALB URL',
      exportName: AppConstants.getInternalAlbUrlExportName(systemName),
    });
  }

  /**
   * 内部アプリケーションロードバランサー（ALB）とそれに対するセキュリティグループを作成します。
   * ALBはプライベートサブネットに配置され、VPC内からのHTTPトラフィックを許可します。
   * @param {string} systemName リソース命名に使用されるシステム名。
   * @param {ec2.IVpc} vpc ALBを作成するVPC。
   */
  private createAlbAndSecurityGroup(systemName: string, vpc: ec2.IVpc) {
    // 内部ALBを作成します。
    this.internalAlb = new elbv2.ApplicationLoadBalancer(this, `${systemName}-InternalAlb`, {
      vpc: vpc,
      internetFacing: false,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      idleTimeout: cdk.Duration.seconds(60), // ロードバランサーが非アクティブな接続を閉じるまでの時間
    });

    // すべてのアウトバウンドトラフィックを許可するALBのセキュリティグループを作成します。
    this.albSg = new ec2.SecurityGroup(this, `${systemName}-InternalAlbSg`, {
      vpc: vpc,
      allowAllOutbound: true,
    });
    // VPC CIDRブロック内からのインバウンドHTTPトラフィックを許可します。
        this.albSg.addIngressRule(ec2.Peer.ipv4(vpc.vpcCidrBlock), ec2.Port.tcp(80), 'Allow HTTP traffic from VPC');
    // セキュリティグループをALBに関連付けます。
    this.internalAlb.addSecurityGroup(this.albSg);
  }

  /**
   * ALBのアクセスログを有効にします。
   * @param {string} systemName リソース命名に使用されるシステム名。
   */
  private enableAccessLogs(systemName: string) {
    const logBucket = new s3.Bucket(this, `${systemName}-AlbAccessLogsBucket`, {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      // 30日経過したら、コールドストレージに移動する
      lifecycleRules: [
        {
          id: 'ArchiveAndThenDelete',
          enabled: true,
          transitions: [
            {
              storageClass: s3.StorageClass.GLACIER,
              transitionAfter: cdk.Duration.days(30),
            },
          ],
          expiration: cdk.Duration.days(365),
        },
      ],
    });

    this.internalAlb.logAccessLogs(logBucket, 'AccessLogs');
    this.internalAlb.logConnectionLogs(logBucket, 'ConnectionLogs');
  }

  /**
   * S3およびAPI Gateway VPCエンドポイントのターゲットグループを作成します。
   * これらのターゲットグループは、ALBによってトラフィックを正しいエンドポイントに転送するために使用されます。
   * @param {string} systemName リソース命名に使用されるシステム名。
   * @param {ec2.IVpc} vpc エンドポイントが存在するVPC。
   * @param {string} s3EndpointId S3のVPCエンドポイントID。
   * @param {string} apiGatewayEndpointId API GatewayのVPCエンドポイントID。
   * @returns {{ s3TargetGroup: elbv2.ApplicationTargetGroup, apiGatewayTargetGroup: elbv2.ApplicationTargetGroup }} 作成されたターゲットグループ。
   */
  private createTargetGroups(systemName: string, vpc: ec2.IVpc, s3EndpointId: string, apiGatewayEndpointId: string) {
    // 各プライベートサブネット内のS3 VPCエンドポイントネットワークインターフェースのプライベートIPアドレスを取得します。
    // ALBがVPCエンドポイントのIPアドレスをターゲットとして使用する必要があるためです
    const s3EndpointIPs = vpc.privateSubnets.map(
      (subnet, i) => this.getEndpointPrivateIpAddress(`s3-${i}`, vpc.vpcId, s3EndpointId, subnet.subnetId)
    );
    // 取得したプライベートIPアドレスを使用してS3のIPターゲットを作成します。
    const s3Targets = s3EndpointIPs.map(ip => new elbv2_targets.IpTarget(ip));
    // HTTPSトラフィック用に設定されたS3のアプリケーションターゲットグループを作成します。
    const s3TargetGroup = new elbv2.ApplicationTargetGroup(this, `${systemName}-S3TargetGroup`, {
      vpc: vpc,
      port: 443,
      protocol: elbv2.ApplicationProtocol.HTTPS,
      protocolVersion: elbv2.ApplicationProtocolVersion.HTTP1,
      targets: s3Targets,
      healthCheck: {
        protocol: elbv2.Protocol.HTTPS,
        path: '/',
        healthyHttpCodes: '307,405', // S3はルートでリダイレクトには307、メソッドが許可されていない場合は405を返します。
        healthyThresholdCount: 2,
        unhealthyThresholdCount: 5,
        interval: cdk.Duration.seconds(30),
        timeout: cdk.Duration.seconds(10),
      }
    });

    // 各プライベートサブネット内のAPI Gateway VPCエンドポイントネットワークインターフェースのプライベートIPアドレスを取得します。
    const apiGatewayEndpointIPs = vpc.privateSubnets.map(
      (subnet, i) => this.getEndpointPrivateIpAddress(`apigw-${i}`, vpc.vpcId, apiGatewayEndpointId, subnet.subnetId)
    );
    // 取得したプライベートIPアドレスを使用してAPI GatewayのIPターゲットを作成します。
    const apiGatewayTargets = apiGatewayEndpointIPs.map(ip => new elbv2_targets.IpTarget(ip));
    // HTTPSトラフィック用に設定されたAPI Gatewayのアプリケーションターゲットグループを作成します。
    const apiGatewayTargetGroup = new elbv2.ApplicationTargetGroup(this, `${systemName}-ApiGatewayTargetGroup`, {
      vpc: vpc,
      port: 443,
      protocol: elbv2.ApplicationProtocol.HTTPS,
      protocolVersion: elbv2.ApplicationProtocolVersion.HTTP1,
      targets: apiGatewayTargets,
      healthCheck: {
        protocol: elbv2.Protocol.HTTPS,
        path: '/',
        healthyHttpCodes: '200-499', // API Gatewayは様々な成功コードを返す可能性があります。
        healthyThresholdCount: 2,
        unhealthyThresholdCount: 5,
        interval: cdk.Duration.seconds(30),
        timeout: cdk.Duration.seconds(10),
      }
    });
    return { s3TargetGroup, apiGatewayTargetGroup };
  }

  /**
   * ALBリスナーとルーティングルールを設定し、受信トラフィックを転送します。
   * トラフィックはホストヘッダーとパスパターンに基づいてS3またはAPI Gatewayにルーティングされます。
   * @param {string} systemName リソース命名に使用されるシステム名。
   * @param {elbv2.ApplicationTargetGroup} s3TargetGroup S3のターゲットグループ。
   * @param {elbv2.ApplicationTargetGroup} apiGatewayTargetGroup API Gatewayのターゲットグループ。
   * @param {string} apiId ホストヘッダーのマッチングに使用されるAPI GatewayのID。
   */
  private createListenersAndRules(systemName: string, s3TargetGroup: elbv2.ApplicationTargetGroup, apiGatewayTargetGroup: elbv2.ApplicationTargetGroup, apiId: string) {
    // ポート80にリスナーを追加し、S3ターゲットグループに転送するデフォルトアクションを設定します。
    const listener = this.internalAlb.addListener(`${systemName}-DefaultListener`, {
      port: 80,
      defaultAction: elbv2.ListenerAction.forward([s3TargetGroup])
    });

    // API Gatewayの特定のホストヘッダーに基づいてトラフィックをAPI Gatewayに転送するルール。
    listener.addAction('ApiGatewayRule', {
      priority: 1,
      conditions: [
        elbv2.ListenerCondition.hostHeaders([`${apiId}.execute-api.${this.region}.amazonaws.com`]),
        elbv2.ListenerCondition.pathPatterns(['/*']) // このホストヘッダーのすべてのパスにマッチします。
      ],
      action: elbv2.ListenerAction.forward([apiGatewayTargetGroup])
    });

    listener.addAction('ApiProxyRule', {
      priority: 2,
      conditions: [elbv2.ListenerCondition.pathPatterns([`/${AppConstants.API_PATH}/*`])],
      action: elbv2.ListenerAction.forward([apiGatewayTargetGroup])
    });
  }

  /**
   * VPCエンドポイントネットワークインターフェースのプライベートIPアドレスを取得します。
   * これは、EC2 DescribeNetworkInterfaces APIを呼び出すカスタムリソースを使用して実現されます。
   * @param {string} crid カスタムリソースの一意の識別子。
   * @param {string} vpcId エンドポイントが存在するVPCのID。
   * @param {string} vpcEndpointId VPCエンドポイントのID。
   * @param {string} subnetId ネットワークインターフェースが配置されているサブネットのID。
   * @returns {string} VPCエンドポイントネットワークインターフェースのプライベートIPアドレス。
   */
  private getEndpointPrivateIpAddress(
    crid: string, vpcId: string, vpcEndpointId: string, subnetId: string
  ): string {
    const privateIpAddressField = 'PrivateIpAddress';
    // EC2 DescribeNetworkInterfaces APIを呼び出すカスタムリソースを作成します。
    const resource = new cr.AwsCustomResource(this, `GetEndpointIp-${crid}` , {
      onUpdate: {
        service: "EC2",
        action: "describeNetworkInterfaces",
        outputPaths: [`NetworkInterfaces.0.${privateIpAddressField}`],
        parameters: { 
          Filters: [
            { Name: 'interface-type', Values: ['vpc_endpoint'] },
            { Name: 'vpc-id', Values: [vpcId] },
            { Name: 'subnet-id', Values: [subnetId] },
            { Name: 'description', Values: [`VPC Endpoint Interface ${vpcEndpointId}`] },
          ]
        },
        // 各エンドポイントIP取得に対して一意の物理リソースIDを保証します。
        physicalResourceId: cr.PhysicalResourceId.of(`GetEndpointIp-${crid}-${vpcEndpointId}-${subnetId}`),
      },
      // カスタムリソースがDescribeNetworkInterfacesを呼び出すために必要なIAMポリシーを定義します。
      policy: cr.AwsCustomResourcePolicy.fromStatements([
        new iam.PolicyStatement({
          actions: ['ec2:DescribeNetworkInterfaces'],
          resources: ['*'],
        }),
      ]),
    });
    // カスタムリソースの応答からプライベートIPアドレスを返します。
    return resource.getResponseField(`NetworkInterfaces.0.${privateIpAddressField}`);
  };
}
