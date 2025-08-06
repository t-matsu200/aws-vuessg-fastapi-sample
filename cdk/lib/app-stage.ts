
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { VpcStack } from './stacks/vpc-stack';
import { ApplicationStack } from './stacks/application-stack';
import { DebugStack } from './stacks/debug-stack';
import { EnvironmentConfig } from '../parameter';
import { PipelineStack } from './stacks/pipeline-stack';

export interface AppStageProps extends cdk.StageProps {
  envConfig: EnvironmentConfig;
}

export class AppStage extends cdk.Stage {
  public readonly frontendBucketArn: string;

  constructor(scope: Construct, id: string, props: AppStageProps) {
    super(scope, id, props);

    const systemName = props.envConfig.systemName;

    const vpcStack = new VpcStack(this, `${systemName}-VpcStack`, { systemName: systemName });

    const applicationStack = new ApplicationStack(this, `${systemName}-ApplicationStack`, {
      vpc: vpcStack.vpc,
      s3EndpointId: vpcStack.s3EndpointId,
      apiGatewayEndpointId: vpcStack.apiGatewayEndpointId,
      apiGatewayVpcEndpointSecurityGroupId: vpcStack.apiGatewayEndpointSgId,
      systemName: systemName,
      frontendBucketName: props.envConfig.frontendBucketName,
      parameterStoreCodePipelineArtifactBucketName: props.envConfig.parameterStoreCodePipelineArtifactBucketName,
    });
    applicationStack.addDependency(vpcStack);

    const pipelineStack = new PipelineStack(this, `${systemName}-PipelineStack`, {
      repositoryName: props.envConfig.repositoryName,
      branchName: props.envConfig.branchName,
      frontendBucketName: props.envConfig.frontendBucketName,
      systemName: props.envConfig.systemName,
    });

    const debugStack = new DebugStack(this, `${systemName}-DebugStack`, {
      vpc: vpcStack.vpc,
      systemName: systemName,
    });
    debugStack.addDependency(vpcStack);
  }
}
