/**
 * 異なるCDKスタック間で利用されるエクスポート名を生成するための定数値とユーティリティメソッドのコレクションを定義します。
 * これにより、他のスタックによってインポートされるCloudFormation出力の一貫した命名規則が保証されます。
 */
export class AppConstants {
  /**
   * VPC IDのエクスポート名を生成します。
   * @param {string} systemName エクスポート名のプレフィックスとして使用されるシステム名。
   * @returns {string} VPC IDのエクスポート名。
   */
  public static getVpcIdExportName(systemName: string): string {
    return `${systemName}-VpcId`;
  }

  /**
   * S3 VPCエンドポイントIDのエクスポート名を生成します。
   * @param {string} systemName エクスポート名のプレフィックスとして使用されるシステム名。
   * @returns {string} S3 VPCエンドポイントIDのエクスポート名。
   */
  public static getS3VpcEndpointIdExportName(systemName: string): string {
    return `${systemName}-S3VpcEndpointId`;
  }

  /**
   * API Gateway VPCエンドポイントIDのエクスポート名を生成します。
   * @param {string} systemName エクスポート名のプレフィックスとして使用されるシステム名。
   * @returns {string} API Gateway VPCエンドポイントIDのエクスポート名。
   */
  public static getApiGatewayVpcEndpointIdExportName(systemName: string): string {
    return `${systemName}-ApiGatewayVpcEndpointId`;
  }

  /**
   * ネットワークロードバランサー（NLB）ARNのエクスポート名を生成します。
   * @param {string} systemName エクスポート名のプレフィックスとして使用されるシステム名。
   * @returns {string} NLB ARNのエクスポート名。
   */
  public static getNlbArnExportName(systemName: string): string {
    return `${systemName}-NlbArn`;
  }

  /**
   * ネットワークロードバランサー（NLB）DNS名のエクスポート名を生成します。
   * @param {string} systemName エクスポート名のプレフィックスとして使用されるシステム名。
   * @returns {string} NLB DNS名のエクスポート名。
   */
  public static getNlbDnsNameExportName(systemName: string): string {
    return `${systemName}-NlbDnsName`;
  }

  /**
   * API Gateway IDのエクスポート名を生成します。
   * @param {string} systemName エクスポート名のプレフィックスとして使用されるシステム名。
   * @returns {string} API Gateway IDのエクスポート名。
   */
  public static getApiIdExportName(systemName: string): string {
    return `${systemName}-ApiId`;
  }

  /**
   * プライベートAPI Gateway URLのエクスポート名を生成します。
   * @param {string} systemName エクスポート名のプレフィックスとして使用されるシステム名。
   * @returns {string} プライベートAPI Gateway URLのエクスポート名。
   */
  public static getPrivateApiGatewayUrlExportName(systemName: string): string {
    return `${systemName}-PrivateApiGatewayUrl`;
  }

  /**
   * 内部ALB URLのエクスポート名を生成します。
   * @param {string} systemName エクスポート名のプレフィックスとして使用されるシステム名。
   * @returns {string} 内部ALB URLのエクスポート名。
   */
  public static getInternalAlbUrlExportName(systemName: string): string {
    return `${systemName}-InternalAlbUrl`;
  }

  /**
   * フロントエンドS3バケット名のエクスポート名を生成します。
   * @param {string} systemName エクスポート名のプレフィックスとして使用されるシステム名。
   * @returns {string} フロントエンドS3バケット名のエクスポート名。
   */
  public static getFrontendBucketNameExportName(systemName: string): string {
    return `${systemName}-FrontendBucketName`;
  }

  /**
   * API Gateway VPCエンドポイントセキュリティグループIDのエクスポート名を生成します。
   * @param {string} systemName エクスポート名のプレフィックスとして使用されるシステム名。
   * @returns {string} API Gateway VPCエンドポイントセキュリティグループIDのエクスポート名。
   */
  public static getApiGatewayVpcEndpointSecurityGroupIdExportName(systemName: string): string {
    return `${systemName}-ApiGatewayVpcEndpointSecurityGroupId`;
  }
}
