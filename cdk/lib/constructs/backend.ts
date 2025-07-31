
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as elbv2_targets from 'aws-cdk-lib/aws-elasticloadbalancingv2-targets';
import * as iam from 'aws-cdk-lib/aws-iam';

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

    const systemName = this.node.tryGetContext('systemName');
    const vpc = props.vpc;

    // EC2インスタンスのセキュリティグループを作成および設定します。
    const ec2SecurityGroup = this.createEc2SecurityGroup(systemName, vpc, props.apiGatewayVpcEndpointSecurityGroupId);

    // SSMアクセスを許可するEC2インスタンスのIAMロールを作成します。
    const ec2Role = new iam.Role(this, `${systemName}-BackendEc2Role`, {
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore'),
      ],
    });

    // ユーザーデータスクリプトを追加し、EC2インスタンス起動時にアプリケーションをセットアップします。
    const userData = ec2.UserData.forLinux({ shebang: "#!/bin/bash" });
    userData.addCommands(
      "echo '--- EC2 User Data Script Start ---'",
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
      "yum install -y git",
      // アプリケーションコードを配置するディレクトリを作成する
      "mkdir -p -m 755 /app",
      "echo '--- EC2 User Data Script End ---'"
    );

    // バックエンドアプリケーション用のEC2インスタンスを作成します。
    const backendEc2Instance = new ec2.Instance(this, `${systemName}-BackendEc2Instance`, {
      vpc: vpc,
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
      machineImage: ec2.MachineImage.latestAmazonLinux2(),
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      securityGroup: ec2SecurityGroup,
      role: ec2Role,
      userData: userData,
    });

    // バックエンドEC2インスタンスにトラフィックを分散するための内部ネットワークロードバランサー（NLB）を作成します。
    const nlb = new elbv2.NetworkLoadBalancer(this, `${systemName}-BackendNlb`, {
      vpc: vpc,
      internetFacing: false,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
    });
    this.nlbArn = nlb.loadBalancerArn;
    this.nlbDnsName = nlb.loadBalancerDnsName;

    // ポート80にリスナーを追加し、バックエンドEC2インスタンスにトラフィックを転送します。
    const backendListener = nlb.addListener(`${systemName}-BackendListener`, { port: 80 });
    backendListener.addTargets(`${systemName}-BackendTarget`, {
      port: 80,
      targets: [new elbv2_targets.InstanceTarget(backendEc2Instance)],
      healthCheck: { path: '/api/health', protocol: elbv2.Protocol.HTTP, healthyHttpCodes: '200' },
    });
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
}
