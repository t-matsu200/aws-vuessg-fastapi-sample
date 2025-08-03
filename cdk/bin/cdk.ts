#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { AppStage } from '../lib/app-stage';
import { devConfig } from '../parameter/dev';
import { stgConfig } from '../parameter/stg';

const app = new cdk.App();

const devStage = new AppStage(app, 'Dev', {
  envConfig: devConfig,
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});

const stgStage = new AppStage(app, 'Stg', {
  envConfig: stgConfig,
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});
