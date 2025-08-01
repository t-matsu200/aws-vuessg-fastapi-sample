import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';

/**
 * 仮想プライベートクラウド（VPC）をデプロイするためのAWS CDKスタックを定義します。
 * このVPCにはパブリックサブネットとプライベートサブネットが含まれ、S3およびAPI Gateway用のVPCエンドポイントを設定して、
 * これらのAWSサービスとのプライベートでセキュアな通信を可能にします。
 */
export class VpcStack extends cdk.Stack {
  /**
   * 作成されたVPCインスタンス。
   */
  public readonly vpc: ec2.IVpc;
  /**
   * S3 VPCエンドポイントのID。
   */
  public readonly s3EndpointId: string;
  /**
   * API Gateway VPCエンドポイントのID。
   */
  public readonly apiGatewayEndpointId: string;
  /**
   * API Gateway VPCエンドポイントに関連付けられたセキュリティグループのID。
   */
  public readonly apiGatewayEndpointSgId: string;

  /**
   * VpcStackのインスタンスを作成します。
   * @param {Construct} scope このコンストラクトを定義するスコープ。
   * @param {string} id コンストラクトのID。
   * @param {cdk.StackProps} [props] このスタックのプロパティ。
   */
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const systemName = this.node.tryGetContext('systemName');

    // パブリックサブネットとプライベートサブネットを持つ新しいVPCを2つのアベイラビリティゾーンに作成します。
    this.vpc = new ec2.Vpc(this, `${systemName}-AppVpc`, {
      maxAzs: 2,
      subnetConfiguration: [
        { cidrMask: 24, name: 'public', subnetType: ec2.SubnetType.PUBLIC },
        { cidrMask: 24, name: 'private', subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      ],
    });

    // VPCエンドポイントに必要なセキュリティグループを作成します。
    const apiGatewayEndpointSg = this.createSecurityGroups(systemName);

    // S3用のVPCインターフェースエンドポイントを作成し、VPC内からS3へのプライベートアクセスを許可します。
    const s3Endpoint = this.vpc.addInterfaceEndpoint(`${systemName}-S3VpcEndpoint`, {
      service: ec2.InterfaceVpcEndpointAwsService.S3,
      subnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      privateDnsEnabled: true,
      // Route 53 Resolver Inbound Endpoint経由の名前解決を強制します。
      privateDnsOnlyForInboundResolverEndpoint: ec2.VpcEndpointPrivateDnsOnlyForInboundResolverEndpoint.ALL_RESOLVERS
    });

    // API Gateway用のVPCインターフェースエンドポイントを作成し、VPC内からAPI Gatewayへのプライベートアクセスを許可します。
    const apiGatewayEndpoint = this.vpc.addInterfaceEndpoint(`${systemName}-ApiGatewayVpcEndpoint`, {
      service: ec2.InterfaceVpcEndpointAwsService.APIGATEWAY,
      subnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      privateDnsEnabled: true,
      securityGroups: [apiGatewayEndpointSg], // カスタムセキュリティグループを関連付けます。
    });

    this.s3EndpointId = s3Endpoint.vpcEndpointId;
    this.apiGatewayEndpointId = apiGatewayEndpoint.vpcEndpointId;
    this.apiGatewayEndpointSgId = apiGatewayEndpointSg.securityGroupId;
  }

  /**
   * VPCエンドポイントに必要なセキュリティグループを作成します。
   * 特に、API Gateway VPCエンドポイント用のセキュリティグループが作成されます。
   * @param {string} systemName リソース命名に使用されるシステム名。
   */
  private createSecurityGroups(systemName: string): ec2.SecurityGroup {
    // API Gateway VPCエンドポイントのセキュリティグループ。
    const apiGatewayEndpointSg = new ec2.SecurityGroup(this, `${systemName}-ApiGatewayEndpointSg`, {
      vpc: this.vpc,
      allowAllOutbound: false, // デフォルトですべてのアウトバウンドトラフィックを明示的に制限します。
    });
    // API Gateway VPCエンドポイントからNLBへのアウトバウンドHTTPトラフィック（ポート80）を許可します。
    apiGatewayEndpointSg.addEgressRule(ec2.Peer.ipv4(this.vpc.vpcCidrBlock), ec2.Port.tcp(80), 'Allow HTTP to NLB');
    return apiGatewayEndpointSg;
  }
}
