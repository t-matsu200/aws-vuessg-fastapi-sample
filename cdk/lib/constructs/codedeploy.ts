
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as codedeploy from 'aws-cdk-lib/aws-codedeploy';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';

/**
 * Props for the CodeDeployConstruct
 */
export interface CodeDeployConstructProps {
  /**
   * The system name for resource naming.
   */
  readonly systemName: string;
  /**
   * The EC2 instances to deploy to, targeted by tags.
   * The key is the tag name and the value is a list of tag values.
   * @example { 'Name': ['my-instance-name'] }
   */
  readonly ec2InstanceTags: { [key: string]: string[] };
}

/**
 * A construct that creates a CodeDeploy Application and a ServerDeploymentGroup.
 */
export class CodeDeployConstruct extends Construct {
  public readonly deploymentGroup: codedeploy.IServerDeploymentGroup;

  constructor(scope: Construct, id: string, props: CodeDeployConstructProps) {
    super(scope, id);

    // Create a CodeDeploy Application
    const application = new codedeploy.ServerApplication(this, 'CodeDeployApplication', {
      applicationName: `${props.systemName}-server-app`,
    });

    // Create a Server Deployment Group
    this.deploymentGroup = new codedeploy.ServerDeploymentGroup(this, 'ServerDeploymentGroup', {
      application,
      deploymentGroupName: `${props.systemName}-server-dg`,
      // Target EC2 instances using the provided tags
      ec2InstanceTags: new codedeploy.InstanceTagSet(
        props.ec2InstanceTags
      ),
      // Automatically install the CodeDeploy agent on the EC2 instances
      installAgent: true,
      // Define the deployment strategy
      deploymentConfig: codedeploy.ServerDeploymentConfig.ONE_AT_A_TIME,
      // Role for CodeDeploy to interact with AWS services
      // If not specified, a new role will be created with the necessary permissions.
      role: new iam.Role(this, 'CodeDeployRole', {
        assumedBy: new iam.ServicePrincipal('codedeploy.amazonaws.com'),
        managedPolicies: [
          iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSCodeDeployRole'),
        ],
        inlinePolicies: {
          S3GrandRead: new iam.PolicyDocument({
            statements: [
              new iam.PolicyStatement({
                actions: ['s3:GetObject', 's3:ListBucket'],
                resources: [
                  'arn:aws:s3:::tmatsu-fastapi-app-pipeline-artifactbucket-gyzfc53ze1qc/tmatsu-fastapi-app-p/',
                  'arn:aws:s3:::tmatsu-fastapi-app-pipeline-artifactbucket-gyzfc53ze1qc/tmatsu-fastapi-app-p/*'
                ],
                effect: iam.Effect.ALLOW,
              }),
            ]
          })
        }
      })
    });
  }
}
