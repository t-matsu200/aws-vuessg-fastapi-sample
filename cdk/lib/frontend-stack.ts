import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';

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
  /**
   * ALBのセキュリティグループID。
   */
  albSecurityGroupId: string;
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
  public readonly bucketName: string;

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
    const bucket = new s3.Bucket(this, `${systemName}-FrontendAppBucket`, {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL, // バケットがパブリックにアクセスできないようにします。
      removalPolicy: cdk.RemovalPolicy.DESTROY, // スタック削除時にバケットとそのコンテンツを自動的に破棄します。
      autoDeleteObjects: true, // バケットが破棄されたときにオブジェクトを自動的に削除します。
      serverAccessLogsBucket: serverAccessLogsBucket,
    });

    this.bucketName = bucket.bucketName;

    // アクセスを制限し、CDK操作を許可するためにバケットポリシーを適用します。
    this.createBucketPolicies(bucket, props.s3EndpointId, props.albSecurityGroupId);
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
  private createBucketPolicies(bucket: s3.Bucket, s3EndpointId: string, albSecurityGroupId: string) {
    // 指定されたS3 VPCエンドポイントからのみGetObjectアクションを許可するポリシー。
    bucket.addToResourcePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      principals: [new iam.AnyPrincipal()], // 任意のプリンシパルに適用されますが、条件によって制限されます。
      actions: ['s3:GetObject'],
      resources: [
        bucket.bucketArn,
        bucket.arnForObjects('*'),
      ],
      conditions: {
        'StringEquals': { 'aws:sourceVpce': s3EndpointId },
      },
    }));

    // CDKデプロイおよびリソース削除操作を許可するポリシー。
    bucket.addToResourcePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      principals: [new iam.AnyPrincipal()], // 任意のプリンシパルに適用されますが、ARNによって制限されます。
      actions: ['s3:*'], // CDK操作のための広範なS3権限。
      resources: [
        bucket.bucketArn,
        bucket.arnForObjects('*'),
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
}
