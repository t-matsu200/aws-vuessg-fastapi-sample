
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { BackendConstruct } from '../constructs/backend';
import { FrontendConstruct } from '../constructs/frontend';
import { ApiGatewayConstruct } from '../constructs/api-gateway';
import { AlbConstruct } from '../constructs/alb';

/**
 * ApplicationStackのプロパティ。
 * @interface ApplicationStackProps
 * @extends cdk.StackProps
 */
interface ApplicationStackProps extends cdk.StackProps {
  /**
   * アプリケーションがデプロイされるVPC。
   */
  vpc: ec2.IVpc;
  /**
   * S3 VPCエンドポイントID。
   */
  s3EndpointId: string;
  /**
   * API Gateway VPCエンドポイントID。
   */
  apiGatewayEndpointId: string;
  /**
   * API Gateway VPCエンドポイントのセキュリティグループID。
   */
  apiGatewayVpcEndpointSecurityGroupId: string;
}

/**
 * 主要なアプリケーションコンポーネントをデプロイするためのAWS CDKスタックを定義します。
 * これには、バックエンド、フロントエンド、API Gateway、およびALBが含まれます。
 */
export class ApplicationStack extends cdk.Stack {
  /**
   * ApplicationStackのインスタンスを作成します。
   * @param {Construct} scope このコンストラクトを定義するスコープ。
   * @param {string} id コンストラクトのID。
   * @param {ApplicationStackProps} props このスタックのプロパティ。
   */
  constructor(scope: Construct, id: string, props: ApplicationStackProps) {
    super(scope, id, props);

    const backend = new BackendConstruct(this, 'BackendConstruct', {
      vpc: props.vpc,
      apiGatewayVpcEndpointSecurityGroupId: props.apiGatewayVpcEndpointSecurityGroupId,
    });

    new FrontendConstruct(this, 'FrontendConstruct', {
      s3EndpointId: props.s3EndpointId,
    });

    const apiGateway = new ApiGatewayConstruct(this, 'ApiGatewayConstruct', {
      apiGatewayEndpointId: props.apiGatewayEndpointId,
      nlbArn: backend.nlbArn,
      nlbDnsName: backend.nlbDnsName,
    });

    new AlbConstruct(this, 'AlbConstruct', {
      vpc: props.vpc,
      s3EndpointId: props.s3EndpointId,
      apiGatewayEndpointId: props.apiGatewayEndpointId,
      apiGatewayArn: apiGateway.apiArn,
    });
  }
}
