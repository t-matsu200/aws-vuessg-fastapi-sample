import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';

/**
 * DebugStackのプロパティ。
 * @interface DebugStackProps
 * @extends cdk.StackProps
 */
export interface DebugStackProps extends cdk.StackProps {
  /**
   * デバッグ用EC2インスタンスが配置されるVPC。
   */
  readonly vpc: ec2.IVpc;
}

/**
 * デバッグ用EC2インスタンスをデプロイするためのAWS CDKスタックを定義します。
 * このインスタンスはSession Managerアクセス用に設定されており、プライベートサブネットに配置されるため、
 * パブリックIPを公開せずにVPC内でトラブルシューティングが可能です。
 */
export class DebugStack extends cdk.Stack {
  /**
   * DebugStackのインスタンスを作成します。
   * @param {Construct} scope このコンストラクトを定義するスコープ。
   * @param {string} id コンストラクトのID。
   * @param {DebugStackProps} props このスタックのプロパティ。
   */
  constructor(scope: Construct, id: string, props: DebugStackProps) {
    super(scope, id, props);

    const systemName = this.node.tryGetContext('systemName');

    // EC2インスタンスのIAMロールを作成し、SSMアクセスとS3フルアクセスを有効にします。
    const role = new iam.Role(this, `${systemName}-DebugInstanceRole`, {
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore'),
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonS3FullAccess'), // S3とのデバッグニーズのために追加。
      ],
    });

    // デバッグ用EC2インスタンスのセキュリティグループを作成し、すべてのアウトバウンドトラフィックを許可します。
    const securityGroup = new ec2.SecurityGroup(this, `${systemName}-DebugInstanceSg`, {
      vpc: props.vpc,
      allowAllOutbound: true,
    });
    // Session Managerはオープンポートを必要としないため、ここではインバウンドルールは明示的に追加されません。

    // デバッグ目的のEC2インスタンスを作成します。
    new ec2.Instance(this, `${systemName}-DebugInstance`, {
      vpc: props.vpc,
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
      machineImage: ec2.MachineImage.latestAmazonLinux2(),
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS }, // セキュリティのためにプライベートサブネットに配置します。
      role: role,
      securityGroup: securityGroup,
    });
  }
}
