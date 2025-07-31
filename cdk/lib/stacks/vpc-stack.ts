import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { VpcConstruct } from '../constructs/vpc';

/**
 * 仮想プライベートクラウド（VPC）をデプロイするためのAWS CDKスタックを定義します。
 */
export class VpcStack extends cdk.Stack {
  /**
   * 作成されたVPCインスタンス。
   */
  public readonly vpc: ec2.IVpc;
  public readonly s3EndpointId: string;
  public readonly apiGatewayEndpointId: string;
  public readonly apiGatewayEndpointSgId: string;

  /**
   * VpcStackのインスタンスを作成します。
   * @param {Construct} scope このコンストラクトを定義するスコープ。
   * @param {string} id コンストラクトのID。
   * @param {cdk.StackProps} [props] このスタックのプロパティ。
   */
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const vpcConstruct = new VpcConstruct(this, 'VpcConstruct', {});
    this.vpc = vpcConstruct.vpc;
    this.s3EndpointId = vpcConstruct.s3EndpointId;
    this.apiGatewayEndpointId = vpcConstruct.apiGatewayEndpointId;
    this.apiGatewayEndpointSgId = vpcConstruct.apiGatewayEndpointSgId;
  }
}