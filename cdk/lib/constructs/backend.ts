
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as elbv2_targets from 'aws-cdk-lib/aws-elasticloadbalancingv2-targets';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as ssm from 'aws-cdk-lib/aws-ssm';

/**
 * BackendConstructのプロパティ。
 * @interface BackendConstructProps
 */
export interface BackendConstructProps {
  /**
   * バックエンドリソースがデプロイされるVPC。
   */
  vpc: ec2.IVpc;
  /**
   * API Gateway VPCエンドポイントのセキュリティグループID。
   */
  apiGatewayVpcEndpointSecurityGroupId: string;
  parameterStoreCodePipelineArtifactBucketName: string;
  systemName: string;
}

/**
 * バックエンドアプリケーションコンポーネントをデプロイするためのAWS CDKコンストラクトを定義します。
 * これには、EC2インスタンスと、それにトラフィックを分散するためのネットワークロードバランサー（NLB）が含まれます。
 * セキュリティグループは、VPCおよびAPI Gateway VPCエンドポイントからの通信を許可するように設定されています。
 */
export class BackendConstruct extends Construct {
  /**
   * 作成されたネットワークロードバランサー（NLB）のARN。
   */
  public readonly nlbArn: string;
  /**
   * 作成されたネットワークロードバランサー（NLB）のDNS名。
   */
  public readonly nlbDnsName: string;

  /**
   * BackendConstructのインスタンスを作成します。
   * @param {Construct} scope このコンストラクトを定義するスコープ。
   * @param {string} id コンストラクトのID。
   * @param {BackendConstructProps} props このコンストラクトのプロパティ。
   */
  constructor(scope: Construct, id: string, props: BackendConstructProps) {
    super(scope, id);

    const vpc = props.vpc;

    // EC2インスタンスのセキュリティグループを作成および設定します。
    const ec2SecurityGroup = this.createEc2SecurityGroup(props.systemName, vpc, props.apiGatewayVpcEndpointSecurityGroupId);

    // CodePipelineアーティファクトバケットを作成します。
    const artifactBucket = this.createArtifactBucket(props.systemName);

    // SSMアクセスを許可するEC2インスタンスのIAMロールを作成します。
    const ec2Role = this.createEc2Role(props.systemName, artifactBucket);

    // アーティファクトバケット名をSSM Parameter Storeに登録します。
    this.createSsmParameter(artifactBucket.bucketName, props.parameterStoreCodePipelineArtifactBucketName);

    // ユーザーデータスクリプトを追加し、EC2インスタンス起動時にアプリケーションをセットアップします。
    const userData = this.createUserData();

    // バックエンドアプリケーション用のEC2インスタンスを作成します。
    const backendEc2Instance = this.createBackendEc2Instance(props.systemName, vpc, ec2SecurityGroup, ec2Role, userData);

    // バックエンドEC2インスタンスにトラフィックを分散するための内部ネットワークロードバランサー（NLB）を作成します。
    const nlb = this.createNlb(props.systemName, vpc);
    this.nlbArn = nlb.loadBalancerArn;
    this.nlbDnsName = nlb.loadBalancerDnsName;

    // ポート80にリスナーを追加し、バックエンドEC2インスタンスにトラフィックを転送します。
    this.createNlbListenerAndTarget(props.systemName, nlb, backendEc2Instance);
  }

  /**
   * バックエンドEC2インスタンスのセキュリティグループを作成および設定します。
   * VPC内およびAPI Gateway VPCエンドポイントからのインバウンドHTTPトラフィックを許可します。
   * @param {string} systemName リソース命名に使用されるシステム名。
   * @param {ec2.IVpc} vpc セキュリティグループが作成されるVPC。
   * @param {string} apiGatewayVpcEndpointSecurityGroupId API Gateway VPCエンドポイントのセキュリティグループID。
   */
  private createEc2SecurityGroup(systemName: string, vpc: ec2.IVpc, apiGatewayVpcEndpointSecurityGroupId: string): ec2.SecurityGroup {
    // バックエンドEC2インスタンスのセキュリティグループ。すべてのアウトバウンドトラフィックを許可します。
    const ec2Sg = new ec2.SecurityGroup(this, `${systemName}-BackendEc2Sg`, {
      vpc: vpc,
      allowAllOutbound: true,
    });
    // VPC CIDRブロック内からのインバウンドHTTPトラフィックを許可します。
    ec2Sg.addIngressRule(ec2.Peer.ipv4(vpc.vpcCidrBlock), ec2.Port.tcp(80), 'Allow HTTP from VPC');
    // API Gateway VPCエンドポイントセキュリティグループをインポートします。
    const apiGatewayVpcEndpointSg = ec2.SecurityGroup.fromSecurityGroupId(this, 'ImportedApiGatewayVpcEndpointSg', apiGatewayVpcEndpointSecurityGroupId);
    // API Gateway VPCエンドポイントからのインバウンドHTTPトラフィックを許可します。
    ec2Sg.addIngressRule(apiGatewayVpcEndpointSg, ec2.Port.tcp(80), 'Allow HTTP from API Gateway VPC Endpoint');

    return ec2Sg;
  }

  /**
   * EC2インスタンス用のIAMロールを作成し、SSMアクセスと指定されたS3バケットへの読み取り権限を付与します。
   * @param {string} systemName リソース命名に使用されるシステム名。
   * @param {s3.Bucket} artifactBucket CodePipelineアーティファクトバケット。
   * @returns {iam.Role} 作成されたIAMロール。
   */
  private createEc2Role(systemName: string, artifactBucket: s3.Bucket): iam.Role {
    const ec2Role = new iam.Role(this, `${systemName}-BackendEc2Role`, {
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore'),
      ],
    });

    // EC2ロールにアーティファクトバケットの読み取り権限を付与します。
    ec2Role.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        's3:GetObject',
        's3:GetObjectVersion',
        's3:ListBucket', // CodeDeployがバケット内のオブジェクトをリストするために必要
      ],
      resources: [
        artifactBucket.bucketArn,
        artifactBucket.bucketArn + '/*',
      ],
    }));
    return ec2Role;
  }

  /**
   * CodePipelineアーティファクト用のS3バケットを作成します。
   * @param {string} systemName リソース命名に使用されるシステム名。
   * @returns {s3.Bucket} 作成されたS3バケット。
   */
  private createArtifactBucket(systemName: string): s3.Bucket {
    const artifactBucket = new s3.Bucket(this, `${systemName}-CodePipelineArtifactBucket`, {
      removalPolicy: cdk.RemovalPolicy.DESTROY, // 環境を削除する際にバケットも削除
      autoDeleteObjects: true, // バケット内のオブジェクトも自動削除
      enforceSSL: true, // SSL通信を強制
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL, // パブリックアクセスをブロック
      lifecycleRules: [
        {
          expiration: cdk.Duration.days(1),
          enabled: true,
        },
      ],
    });
    return artifactBucket;
  }

  /**
   * S3バケット名をSSM Parameter Storeに登録します。
   * @param {string} bucketName 登録するS3バケット名。
   * @param {string} parameterName SSM Parameter Storeのパラメータ名。
   * @returns {ssm.StringParameter} 作成されたSSM StringParameter。
   */
  private createSsmParameter(bucketName: string, parameterName: string): ssm.StringParameter {
    return new ssm.StringParameter(this, 'PipelineArtifactBucketNameParameter', {
      parameterName: parameterName,
      stringValue: bucketName,
      description: 'Name of the S3 bucket used by CodePipeline for artifacts.',
      tier: ssm.ParameterTier.STANDARD,
    });
  }

  /**
   * EC2インスタンスのユーザーデータスクリプトを作成します。
   * このスクリプトは、インスタンス起動時にDocker、Docker Compose、Git、CodeDeploy Agentをインストールします。
   * @returns {ec2.UserData} 作成されたユーザーデータスクリプト。
   */
  private createUserData(): ec2.UserData {
    const userData = ec2.UserData.forLinux({ shebang: "#!/bin/bash" });
    userData.addCommands(
      "echo '--- EC2 User Data Script Start ---",
      // OSパッケージの更新
      "yum update -y",
      // Dockerのインストールと起動
      "amazon-linux-extras install docker -y",
      "service docker start",
      "usermod -a -G docker ec2-user",
      "chkconfig docker on",
      // Docker Composeのインストール
      "curl -L https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m) -o /usr/local/bin/docker-compose",
      "chmod +x /usr/local/bin/docker-compose",
      "ln -s /usr/local/bin/docker-compose /usr/bin/docker-compose",
      // Gitのインストール
      "yum install -y git ruby",
      // アプリケーションコードを配置するディレクトリを作成する
      "mkdir -p -m 755 /app",
      // CodeDeploy Agentをインストール
      "cd /tmp",
      "curl -O https://aws-codedeploy-ap-northeast-1.s3.ap-northeast-1.amazonaws.com/latest/install",
      "chmod +x ./install",
      "./install auto",
      "echo '--- EC2 User Data Script End ---"
    );
    return userData;
  }

  /**
   * バックエンドアプリケーション用のEC2インスタンスを作成します。
   * @param {string} systemName リソース命名に使用されるシステム名。
   * @param {ec2.IVpc} vpc EC2インスタンスが配置されるVPC。
   * @param {ec2.SecurityGroup} securityGroup EC2インスタンスに適用されるセキュリティグループ。
   * @param {iam.Role} role EC2インスタンスにアタッチされるIAMロール。
   * @param {ec2.UserData} userData EC2インスタンスのユーザーデータスクリプト。
   * @returns {ec2.Instance} 作成されたEC2インスタンス。
   */
  private createBackendEc2Instance(systemName: string, vpc: ec2.IVpc, securityGroup: ec2.SecurityGroup, role: iam.Role, userData: ec2.UserData): ec2.Instance {
    const backendEc2Instance = new ec2.Instance(this, `${systemName}-BackendEc2Instance`, {
      vpc: vpc,
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
      machineImage: ec2.MachineImage.latestAmazonLinux2(),
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      securityGroup: securityGroup,
      role: role,
      userData: userData,
    });
    cdk.Tags.of(backendEc2Instance).add('DeployTarget', 'backend-app');
    return backendEc2Instance;
  }

  /**
   * バックエンドEC2インスタンスにトラフィックを分散するための内部ネットワークロードバランサー（NLB）を作成します。
   * @param {string} systemName リソース命名に使用されるシステム名。
   * @param {ec2.IVpc} vpc NLBが配置されるVPC。
   * @returns {elbv2.NetworkLoadBalancer} 作成されたNLB。
   */
  private createNlb(systemName: string, vpc: ec2.IVpc): elbv2.NetworkLoadBalancer {
    const nlb = new elbv2.NetworkLoadBalancer(this, `${systemName}-BackendNlb`, {
      vpc: vpc,
      internetFacing: false,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
    });
    return nlb;
  }

  /**
   * NLBにリスナーとターゲットグループを追加し、バックエンドEC2インスタンスにトラフィックを転送します。
   * @param {string} systemName リソース命名に使用されるシステム名。
   * @param {elbv2.NetworkLoadBalancer} nlb トラフィックをリッスンするNLB。
   * @param {ec2.Instance} backendEc2Instance トラフィックが転送されるバックエンドEC2インスタンス。
   * @returns {elbv2.NetworkListener} 作成されたNLBリスナー。
   */
  private createNlbListenerAndTarget(systemName: string, nlb: elbv2.NetworkLoadBalancer, backendEc2Instance: ec2.Instance): elbv2.NetworkListener {
    const backendListener = nlb.addListener(`${systemName}-BackendListener`, { port: 80 });
    backendListener.addTargets(`${systemName}-BackendTarget`, {
      port: 80,
      targets: [new elbv2_targets.InstanceTarget(backendEc2Instance)],
      healthCheck: { path: '/api/health', protocol: elbv2.Protocol.HTTP, healthyHttpCodes: '200' },
    });
    return backendListener;
  }
}
