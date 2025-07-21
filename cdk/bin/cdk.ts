#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { VpcStack } from '../lib/vpc-stack';
import { PythonAppStack } from '../lib/python-app-stack';
import { VueAppStack } from '../lib/vue-app-stack';

const app = new cdk.App();

const systemName = app.node.tryGetContext('systemName');

const vpcStack = new VpcStack(app, `${systemName}-VpcStack`);

const pythonAppStack = new PythonAppStack(app, `${systemName}-PythonAppStack`, {
  vpc: vpcStack.vpc,
});

const vueAppStack = new VueAppStack(app, `${systemName}-VueAppStack`, {
  vpc: vpcStack.vpc,
  s3Endpoint: vpcStack.s3Endpoint,
  apiGatewayEndpoint: vpcStack.apiGatewayEndpoint,
  pythonNlb: pythonAppStack.nlb,
  s3EndpointIPs: vpcStack.s3EndpointIPs,
  apiGatewayEndpointIPs: vpcStack.apiGatewayEndpointIPs,
});

vueAppStack.addDependency(pythonAppStack);