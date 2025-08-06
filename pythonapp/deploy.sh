#!/bin/bash
set -e

# Load environment variables from deploy.env
if [ -f ./deploy.env ]; then
    source ./deploy.env
else
    echo "Error: deploy.env file not found." >&2
    exit 1
fi

# Check if all required variables are set
required_vars=("AWS_REGION" "STACK_NAME" "CODE_DEPLOY_APP_NAME" "CODE_DEPLOY_GROUP_NAME" "GITHUB_OWNER" "GITHUB_REPO" "GITHUB_BRANCH" "SSM_PARAM_NAME_FOR_CONNECTION_ARN" "SSM_PARAM_NAME_FOR_PIPELINE_ARTIFACT_BUCKET")
for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        echo "Error: Environment variable $var is not set in deploy.env" >&2
        exit 1
    fi
done

echo "Starting CloudFormation deployment for stack: $STACK_NAME in region: $AWS_REGION..."

# Execute the AWS CloudFormation deploy command
aws cloudformation deploy \
  --region "$AWS_REGION" \
  --stack-name "$STACK_NAME" \
  --template-file ./pipeline.yml \
  --parameter-overrides \
    GitHubOwner="$GITHUB_OWNER" \
    GitHubRepo="$GITHUB_REPO" \
    GitHubBranch="$GITHUB_BRANCH" \
    GitHubConnectionArnParameterName="$SSM_PARAM_NAME_FOR_CONNECTION_ARN" \
    CodeDeployApplicationName="$CODE_DEPLOY_APP_NAME" \
    CodeDeployDeploymentGroup="$CODE_DEPLOY_GROUP_NAME" \
    PipelineArtifactBucketParameterName="$SSM_PARAM_NAME_FOR_PIPELINE_ARTIFACT_BUCKET" \
  --capabilities CAPABILITY_IAM \
  --no-fail-on-empty-changeset

echo "CloudFormation deployment command executed successfully."
echo "Check the AWS CloudFormation console for the status of the stack: $STACK_NAME"
