
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';

/**
 * DebugStackに渡すプロパティのインターフェース
 * @property {ec2.IVpc} vpc - EC2インスタンスを配置するVPC
 */
export interface DebugStackProps extends cdk.StackProps {
  readonly vpc: ec2.IVpc;
}

export class DebugStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: DebugStackProps) {
    super(scope, id, props);

    const systemName = this.node.tryGetContext('systemName');

    // Session Manager接続用のIAMロールを作成
    const role = new iam.Role(this, `${systemName}-DebugInstanceRole`, {
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore'),
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonS3FullAccess'),
      ],
    });

    // セキュリティグループを作成（アウトバウンドは全許可）
    const securityGroup = new ec2.SecurityGroup(this, `${systemName}-DebugInstanceSg`, {
      vpc: props.vpc,
      allowAllOutbound: true,
    });

    // 疎通確認用のEC2インスタンスを作成
    new ec2.Instance(this, `${systemName}-DebugInstance`, {
      vpc: props.vpc,
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
      machineImage: ec2.MachineImage.latestAmazonLinux2(),
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS }, // プライベートサブネットに配置
      role: role,
      securityGroup: securityGroup,
    });
  }
}
