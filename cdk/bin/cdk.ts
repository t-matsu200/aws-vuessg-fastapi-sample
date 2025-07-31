#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { DebugStack } from '../lib/debug-stack';
import { VpcStack } from '../lib/vpc-stack';
import { BackendStack } from '../lib/backend-stack';
import { FrontendStack } from '../lib/frontend-stack';
import { ApiGatewayStack } from '../lib/api-gateway-stack';
import { AlbStack } from '../lib/alb-stack';

/**
 * このファイルは、様々なインフラストラクチャスタックのデプロイをオーケストレーションする主要なCDKアプリケーションを定義します。
 * 各スタックは、アプリケーションの特定の部分に対するAWSリソースの論理的なグループとして扱います。
 */
const app = new cdk.App();

// CDKコンテキストからシステム名を取得し、リソース命名の一貫性に利用します。
const systemName = app.node.tryGetContext('systemName');

// スタックデプロイのためのAWS環境（アカウントとリージョン）を定義します。
const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION,
};

/**
 * VPCスタック: VPC、サブネット、VPCエンドポイントを含むコアネットワークインフラストラクチャをデプロイします。
 * 他のスタックはネットワーク接続のためにこれに依存します。
 */
const vpcStack = new VpcStack(app, `${systemName}-VpcStack`, {
  env: env,
});

/**
 * バックエンドスタック: EC2インスタンスとネットワークロードバランサー（NLB）を含むバックエンドアプリケーションコンポーネントをデプロイします。
 * ネットワークリソースのためにVPCスタックに依存し、API Gateway VPCエンドポイントセキュリティグループをインポートします。
 */
const backendStack = new BackendStack(app, `${systemName}-BackendStack`, {
  vpc: vpcStack.vpc,
  apiGatewayVpcEndpointSecurityGroupId: vpcStack.apiGatewayEndpointSgId,
  env: env,
});
backendStack.addDependency(vpcStack);

/**
 * フロントエンドスタック: 静的フロントエンドアセットをS3バケットにデプロイします。
 * セキュアなアクセスのためにS3 VPCエンドポイントIDを取得するためにVPCスタックに依存します。
 */
const frontendStack = new FrontendStack(app, `${systemName}-FrontendStack`, {
  s3EndpointId: vpcStack.s3EndpointId,
  env: env,
});
frontendStack.addDependency(vpcStack);

/**
 * API Gatewayスタック: バックエンドサービスを公開するためのAPI Gatewayをデプロイします。
 * API Gateway VPCエンドポイントのためにVPCスタックに依存し、NLBの詳細のためにバックエンドスタックに依存します。
 */
const apiGatewayStack = new ApiGatewayStack(app, `${systemName}-ApiGatewayStack`, {
  apiGatewayEndpointId: vpcStack.apiGatewayEndpointId,
  nlbArn: backendStack.nlbArn,
  nlbDnsName: backendStack.nlbDnsName,
  env: env,
});
apiGatewayStack.addDependency(vpcStack);
apiGatewayStack.addDependency(backendStack);

/**
 * ALBスタック: S3とAPI Gatewayにトラフィックをルーティングするためのアプリケーションロードバランサー（ALB）をデプロイします。
 * ネットワークリソースのためにVPCスタックに依存し、API GatewayのARNのためにAPI Gatewayスタックに依存します。
 */
const albStack = new AlbStack(app, `${systemName}-AlbStack`, {
  vpc: vpcStack.vpc,
  s3EndpointId: vpcStack.s3EndpointId,
  apiGatewayEndpointId: vpcStack.apiGatewayEndpointId,
  apiGatewayArn: apiGatewayStack.apiArn,
  env: env,
});
albStack.addDependency(vpcStack);
albStack.addDependency(apiGatewayStack);

/**
 * デバッグスタック: デバッグ目的のリソース（例：VPC内のEC2インスタンス）をデプロイします。
 * ネットワークリソースのためにVPCスタックに依存します。
 */
const debugStack = new DebugStack(app, `${systemName}-DebugStack`, {
  vpc: vpcStack.vpc,
  env: env
});
debugStack.addDependency(vpcStack);

// 定義されたスタックからCloudFormationテンプレートを合成します。
app.synth();
