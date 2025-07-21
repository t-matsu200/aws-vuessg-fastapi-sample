import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as elbv2_targets from 'aws-cdk-lib/aws-elasticloadbalancingv2-targets';
import * as iam from 'aws-cdk-lib/aws-iam';

interface PythonAppStackProps extends cdk.StackProps {
  vpc: ec2.Vpc;
}

export class PythonAppStack extends cdk.Stack {
  public readonly nlb: elbv2.NetworkLoadBalancer;
  public readonly listener: elbv2.NetworkListener;

  constructor(scope: Construct, id: string, props: PythonAppStackProps) {
    super(scope, id, props);

    const systemName = this.node.tryGetContext('systemName');

    this.nlb = new elbv2.NetworkLoadBalancer(this, `${systemName}-PythonNlb`, {
      vpc: props.vpc,
      internetFacing: false,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
    });

    const ec2Sg = new ec2.SecurityGroup(this, `${systemName}-PythonEc2Sg`, {
      vpc: props.vpc,
      allowAllOutbound: true,
    });

    const ec2Role = new iam.Role(this, `${systemName}-PythonEc2Role`, {
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore'),
      ],
    });

    const ec2Instance = new ec2.Instance(this, `${systemName}-PythonEc2Instance`, {
      vpc: props.vpc,
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
      machineImage: ec2.MachineImage.latestAmazonLinux2(),
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      securityGroup: ec2Sg,
      role: ec2Role,
    });

    this.listener = this.nlb.addListener('Listener', { port: 80 });
    this.listener.addTargets('Ec2Target', {
      port: 80,
      targets: [new elbv2_targets.InstanceTarget(ec2Instance)],
    });
  }
}