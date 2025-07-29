import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import { AppConstants } from './app-constants';

/**
 * FrontendStackのプロパティ。
 * @interface FrontendStackProps
 * @extends cdk.StackProps
 */
interface FrontendStackProps extends cdk.StackProps {
  /**
   * S3バケットへのアクセスを制限するために使用されるS3 VPCエンドポイントID。
   */
  s3EndpointId: string;
}

/**
 * 静的フロントエンドアプリケーションをS3バケットにデプロイするためのAWS CDKスタックを定義します。
 * S3バケットは、指定されたVPCエンドポイント経由でのみアクセスを許可し、
 * CDKデプロイ/削除操作を許可するポリシーで設定されています。
 */
export class FrontendStack extends cdk.Stack {
  /**
   * フロントエンドアプリケーション用に作成されたS3バケットインスタンス。
   */
  public readonly bucket: s3.Bucket;

  /**
   * FrontendStackのインスタンスを作成します。
   * @param {Construct} scope このコンストラクトを定義するスコープ。
   * @param {string} id コンストラクトのID。
   * @param {FrontendStackProps} props このスタックのプロパティ。
   */
  constructor(scope: Construct, id: string, props: FrontendStackProps) {
    super(scope, id, props);

    const systemName = this.node.tryGetContext('systemName');

    const serverAccessLogsBucket = this.createServerAccessLogsBucket(systemName);

    // TODO: ALBのFQDNと同名のS3バケットを作成する必要があります
    // https://aws.amazon.com/jp/blogs/news/internal-static-web-hosting/
    // フロントエンドアプリケーションをホストするためのS3バケットを作成します。
    this.bucket = new s3.Bucket(this, `${systemName}-FrontendAppBucket`, {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL, // バケットがパブリックにアクセスできないようにします。
      removalPolicy: cdk.RemovalPolicy.DESTROY, // スタック削除時にバケットとそのコンテンツを自動的に破棄します。
      autoDeleteObjects: true, // バケットが破棄されたときにオブジェクトを自動的に削除します。
      serverAccessLogsBucket: serverAccessLogsBucket,
    });

    // アクセスを制限し、CDK操作を許可するためにバケットポリシーを適用します。
    this.createBucketPolicies(props.s3EndpointId);
    // 重要なスタックリソースのCloudFormation出力を作成します。
    this.createCfnOutputs(systemName);
  }

  /**
   * S3サーバーアクセスログを保存するバケットを作成します。
   * @param {string} systemName リソース命名に使用されるシステム名。
   * @returns {s3.Bucket} 作成されたS3バケット。
   */
  private createServerAccessLogsBucket(systemName: string): s3.Bucket {
    return new s3.Bucket(this, `${systemName}-FrontendS3AccessLogsBucket`, {
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
  }

  /**
   * アクセスを制御するためにS3バケットポリシーを設定します。
   * アクセスは指定されたS3 VPCエンドポイントに制限され、CDKデプロイロールに許可されます。
   * @param {string} s3EndpointId S3のVPCエンドポイントID。
   */
  private createBucketPolicies(s3EndpointId: string) {
    // 指定されたS3 VPCエンドポイントからのみGetObjectアクションを許可するポリシー。
    this.bucket.addToResourcePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      principals: [new iam.AnyPrincipal()], // 任意のプリンシパルに適用されますが、条件によって制限されます。
      actions: ['s3:GetObject'],
      resources: [
        this.bucket.bucketArn,
        this.bucket.arnForObjects('*'),
      ],
      conditions: {
        'StringEquals': { 'aws:sourceVpce': s3EndpointId },
      },
    }));

    // CDKデプロイおよびリソース削除操作を許可するポリシー。
    this.bucket.addToResourcePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      principals: [new iam.AnyPrincipal()], // 任意のプリンシパルに適用されますが、ARNによって制限されます。
      actions: ['s3:*'], // CDK操作のための広範なS3権限。
      resources: [
        this.bucket.bucketArn,
        this.bucket.arnForObjects('*'),
      ],
      conditions: {
        'ArnLike': {
          'aws:PrincipalArn': [
            `arn:aws:iam::${this.account}:role/cdk-*`, // CDKデプロイロール。
            `arn:aws:iam::${this.account}:role/*CustomS3AutoDeleteObjects*` // S3オブジェクトの自動削除用ロール。
          ]
        },
      },
    }));
  }

  /**
   * CloudFormationのoutputを作成します
   * これらの出力はエクスポートされ、他のスタックや外部参照に使用できます
   * @param {string} systemName エクスポート名に使用されるシステム名
   */
  private createCfnOutputs(systemName: string) {
    // 内部ルーティングに使用できるS3バケットのホスト名を出力します。
    new cdk.CfnOutput(this, 'S3HostName', {
      value: `${this.bucket.bucketName}.s3.${cdk.Stack.of(this).region}.amazonaws.com`,
      description: 'Hostname of the frontend S3 bucket',
      exportName: AppConstants.getFrontendBucketNameExportName(systemName),
    });
  }
}
