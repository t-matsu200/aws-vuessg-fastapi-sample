import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { AppConstants } from './app-constants';

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
   * 作成されたS3 VPCエンドポイントインスタンス。
   */
  public readonly s3Endpoint: ec2.InterfaceVpcEndpoint;
  /**
   * 作成されたAPI Gateway VPCエンドポイントインスタンス。
   */
  public readonly apiGatewayEndpoint: ec2.InterfaceVpcEndpoint;

  private apiGatewayEndpointSg: ec2.SecurityGroup;

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
    this.createSecurityGroups(systemName);

    // S3用のVPCインターフェースエンドポイントを作成し、VPC内からS3へのプライベートアクセスを許可します。
    this.s3Endpoint = this.vpc.addInterfaceEndpoint(`${systemName}-S3VpcEndpoint`, {
      service: ec2.InterfaceVpcEndpointAwsService.S3,
      subnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      privateDnsEnabled: true,
      privateDnsOnlyForInboundResolverEndpoint: ec2.VpcEndpointPrivateDnsOnlyForInboundResolverEndpoint.ALL_RESOLVERS
    });

    // API Gateway用のVPCインターフェースエンドポイントを作成し、VPC内からAPI Gatewayへのプライベートアクセスを許可します。
    this.apiGatewayEndpoint = this.vpc.addInterfaceEndpoint(`${systemName}-ApiGatewayVpcEndpoint`, {
      service: ec2.InterfaceVpcEndpointAwsService.APIGATEWAY,
      subnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      privateDnsEnabled: true,
      securityGroups: [this.apiGatewayEndpointSg], // カスタムセキュリティグループを関連付けます。
    });

    // 重要なスタックリソースのCloudFormation出力を作成します。
    this.createCfnOutputs(systemName);
  }

  /**
   * VPCエンドポイントに必要なセキュリティグループを作成します。
   * 特に、API Gateway VPCエンドポイント用のセキュリティグループが作成されます。
   * @param {string} systemName リソース命名に使用されるシステム名。
   */
  private createSecurityGroups(systemName: string) {
    // API Gateway VPCエンドポイントのセキュリティグループ。
    this.apiGatewayEndpointSg = new ec2.SecurityGroup(this, `${systemName}-ApiGatewayEndpointSg`, {
      vpc: this.vpc,
      allowAllOutbound: false, // デフォルトですべてのアウトバウンドトラフィックを明示的に制限します。
    });
    // API Gateway VPCエンドポイントからNLBへのアウトバウンドHTTPトラフィック（ポート80）を許可します。
        this.apiGatewayEndpointSg.addEgressRule(ec2.Peer.ipv4(this.vpc.vpcCidrBlock), ec2.Port.tcp(80), 'Allow HTTP to NLB');
  }

  /**
   * CloudFormationのoutputを作成します
   * これらの出力はエクスポートされ、他のスタックや外部参照に使用できます
   * @param {string} systemName エクスポート名に使用されるシステム名
   */
  private createCfnOutputs(systemName: string) {
    // VPC IDを出力します。
    new cdk.CfnOutput(this, 'VpcId', {
      value: this.vpc.vpcId,
      description: 'ID of the VPC',
      exportName: AppConstants.getVpcIdExportName(systemName),
    });

    // S3 VPCエンドポイントIDを出力します。
    new cdk.CfnOutput(this, 'S3VpcEndpointId', {
      value: this.s3Endpoint.vpcEndpointId,
      description: 'ID of the S3 VPC Endpoint',
      exportName: AppConstants.getS3VpcEndpointIdExportName(systemName),
    });

    // API Gateway VPCエンドポイントIDを出力します。
    new cdk.CfnOutput(this, 'ApiGatewayVpcEndpointId', {
      value: this.apiGatewayEndpoint.vpcEndpointId,
      description: 'ID of the API Gateway VPC Endpoint',
      exportName: AppConstants.getApiGatewayVpcEndpointIdExportName(systemName),
    });

    // API Gateway VPCエンドポイントに関連付けられたセキュリティグループIDを出力します。
    new cdk.CfnOutput(this, 'ApiGatewayVpcEndpointSecurityGroupId', {
      value: this.apiGatewayEndpointSg.securityGroupId,
      description: 'Security Group ID of the API Gateway VPC Endpoint',
      exportName: AppConstants.getApiGatewayVpcEndpointSecurityGroupIdExportName(systemName),
    });
  }
}
