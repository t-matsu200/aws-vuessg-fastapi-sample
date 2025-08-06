#!/bin/bash
set -e

# Load environment variables from deploy.env
if [ -f ./deploy.env ]; then
    source ./deploy.env
else
    echo "Error: deploy.env file not found." >&2
    exit 1
fi

# Check if required variables are set
required_vars=("AWS_REGION" "STACK_NAME")
for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        echo "Error: Environment variable $var is not set in deploy.env" >&2
        exit 1
    fi
done

echo "This script will delete the CloudFormation stack: $STACK_NAME in region: $AWS_REGION"
read -p "Are you sure you want to continue? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]
then
    echo "Deletion cancelled."
    exit 1
fi

echo "Deleting CloudFormation stack: $STACK_NAME..."

# Execute the AWS CloudFormation delete-stack command
aws cloudformation delete-stack \
  --region "$AWS_REGION" \
  --stack-name "$STACK_NAME"

echo "CloudFormation delete-stack command executed successfully."
echo "Check the AWS CloudFormation console for the status of the stack deletion."

