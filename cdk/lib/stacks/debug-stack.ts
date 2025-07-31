import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { DebugConstruct } from '../constructs/debug';

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

    new DebugConstruct(this, 'DebugConstruct', {
      vpc: props.vpc,
    });
  }
}