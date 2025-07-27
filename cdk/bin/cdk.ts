#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { UnifiedStack } from '../lib/unified-stack';
import { DebugStack } from '../lib/debug-stack';

const app = new cdk.App();

const systemName = app.node.tryGetContext('systemName');

const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION,
};

const unifiedStack = new UnifiedStack(app, `${systemName}-UnifiedStack`, {
  env: env
});

const debugStack = new DebugStack(app, `${systemName}-DebugStack`, {
  vpc: unifiedStack.vpc,
  env: env
});

debugStack.addDependency(unifiedStack);

app.synth();
