#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { AppStage } from '../lib/app-stage';

const app = new cdk.App();

new AppStage(app, 'AppStage', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});
