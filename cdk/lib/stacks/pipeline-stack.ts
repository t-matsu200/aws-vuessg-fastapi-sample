import * as cdk from 'aws-cdk-lib';
import * as codebuild from "aws-cdk-lib/aws-codebuild";
import * as codecommit from "aws-cdk-lib/aws-codecommit";
import * as codepipeline from "aws-cdk-lib/aws-codepipeline";
import * as codepipeline_actions from 'aws-cdk-lib/aws-codepipeline-actions';
import * as events_targets from "aws-cdk-lib/aws-events-targets";
import { aws_codestarconnections as codestar_connections } from 'aws-cdk-lib';
import * as logs from "aws-cdk-lib/aws-logs";
import * as s3 from "aws-cdk-lib/aws-s3";
import { Construct } from 'constructs';
import * as path from 'path';

export interface PipelineStackProps extends cdk.StackProps {
  readonly repositoryName: string;
  readonly branchName: string;
  readonly frontendBucketName: string;
  readonly systemName: string;
}

export class PipelineStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: PipelineStackProps) {
    super(scope, id, props);

    // アーティファクトバケットとライフサイクルルールの作成
    const artifactBucket = new s3.Bucket(this, "PipelineArtifactBucket", {
      bucketName: `${props.systemName}-pipeline-artifact-bucket`,
      autoDeleteObjects: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      lifecycleRules: [
        {
          id: "expire-after-3-days",
          expiration: cdk.Duration.days(3),
        },
      ],
    });

    // CodeCommitリポジリをインポート
    // const repository = codecommit.Repository.fromRepositoryName(this, 'CodeCommitRepo', props.repositoryName);

    // フロントエンドバケットをARNからインポート
    const frontendBucket = s3.Bucket.fromBucketName(this, 'FrontendBucket', props.frontendBucketName);

    // CodeBuild ビルドプロジェクトの作成
    const project = new codebuild.PipelineProject(this, "CodeBuildProject", {
      projectName: `${props.systemName}-codebuild-project`,
      environment: {
        buildImage: codebuild.LinuxBuildImage.AMAZON_LINUX_2_5,
        computeType: codebuild.ComputeType.SMALL,
        environmentVariables: {
          S3_BUCKET_NAME: { value: frontendBucket.bucketName },
        },
      },
      buildSpec: codebuild.BuildSpec.fromSourceFilename('vueapp/buildspec.yml'),
      // ログ保持期間の設定
      logging: {
        cloudWatch: {
          logGroup: new logs.LogGroup(this, "LogGroup", {
            logGroupName: `/aws/codebuild/${props.systemName}-codebuild-project`,
            retention: logs.RetentionDays.THREE_DAYS,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
          }),
        },
      },
    });
    // CodeBuildのサービスロールに必要なIAMポリシーを追加
    frontendBucket.grantReadWrite(project.role!);

    // ソースステージの追加
    const sourceOutput = new codepipeline.Artifact("SourceOutput");
    // const sourceAction = new codepipeline_actions.CodeCommitSourceAction({
    //   actionName: "Source",
    //   repository,
    //   output: sourceOutput,
    //   branch: props.branchName,
    //   // vプレフィックスのついたGitタグをパイプラインのトリガーに設定
    //   customEventRule: {
    //     eventPattern: {
    //       source: ["aws.codecommit"],
    //       detailType: ["CodeCommit Repository State Change"],
    //       detail: {
    //         event: ["referenceCreated", "referenceUpdated"],
    //         referenceType: ["tag"],
    //         referenceName: [
    //           {
    //             prefix: "v",
    //           },
    //         ],
    //       },
    //     },
    //     target: new events_targets.CodePipeline(pipeline),
    //   },
    // });

    const githubConnection = new codestar_connections.CfnConnection(this, 'GithubConnection', {
      connectionName: 'CfnPipelineConnection',
      providerType: 'GitHub',
    });
    const sourceAction = new codepipeline_actions.CodeStarConnectionsSourceAction({
      actionName: 'source',
      owner: 't-matsu200',
      repo: props.repositoryName,
      branch: props.branchName,
      connectionArn: githubConnection.ref,
      output: sourceOutput,
      // デフォルトのトリガーを無効にする
      triggerOnPush: false,
    });

    // ビルドステージの追加
    const buildOutput = new codepipeline.Artifact("BuildOutput");
    const buildAction = new codepipeline_actions.CodeBuildAction({
      actionName: "Build",
      project,
      input: sourceOutput,
      outputs: [buildOutput],
    });

    // CodePipeline パイプラインの作成
    new codepipeline.Pipeline(this, "Pipeline", {
      pipelineName: `${props.systemName}-pipeline`,
      artifactBucket,
      pipelineType: codepipeline.PipelineType.V2,
      stages: [
        {
          stageName: 'Source',
          actions: [sourceAction],
        },
        {
          stageName: 'Build',
          actions: [buildAction],
        },
      ]
    });
  }
}
