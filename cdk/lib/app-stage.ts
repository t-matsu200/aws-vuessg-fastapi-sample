
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { VpcStack } from './stacks/vpc-stack';
import { ApplicationStack } from './stacks/application-stack';
import { DebugStack } from './stacks/debug-stack';

export class AppStage extends cdk.Stage {
  constructor(scope: Construct, id: string, props?: cdk.StageProps) {
    super(scope, id, props);

    const systemName = this.node.tryGetContext('systemName');

    const vpcStack = new VpcStack(this, `${systemName}-VpcStack`);

    const applicationStack = new ApplicationStack(this, `${systemName}-ApplicationStack`, {
      vpc: vpcStack.vpc,
      s3EndpointId: vpcStack.s3EndpointId,
      apiGatewayEndpointId: vpcStack.apiGatewayEndpointId,
      apiGatewayVpcEndpointSecurityGroupId: vpcStack.apiGatewayEndpointSgId,
    });
    applicationStack.addDependency(vpcStack);

    const debugStack = new DebugStack(this, `${systemName}-DebugStack`, {
      vpc: vpcStack.vpc,
    });
    debugStack.addDependency(vpcStack);
  }
}
