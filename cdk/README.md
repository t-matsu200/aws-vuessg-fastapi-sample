## AWS CDKによるインフラデプロイ

このプロジェクトのAWSインフラはAWS CDKで定義されています。CDKアプリケーションはDockerコンテナ内で実行することができ、環境の一貫性を保ちながらデプロイ作業を行うことができます。

### 1. 各スタックの概要

| スタック名 | 説明 |
| :--- | :--- |
| `VpcStack` | VPC、サブネット、およびVPCエンドポイントを作成します。 |
| `FrontendStack` | 静的ウェブサイトをホストするためのS3バケットを作成します。 |
| `BackendStack` | FastAPIアプリケーションを実行するEC2インスタンスと、それに対するNLBを作成します。 |
| `ApiGatewayStack` | バックエンド用のNLBにリクエストを転送するプライベートAPI Gatewayを作成します。 |
| `AlbStack` | S3とAPI Gatewayにリクエストを振り分ける内部ALBを作成します。 |
| `DebugStack` | デバッグ用のEC2インスタンスを作成します。 |

### 2. 前提条件

- Dockerがインストールされていること。
- AWS CLIが設定されており、デプロイ対象のAWSアカウントへの認証情報が利用可能であること。

### 3. AWS認証情報の設定

AWS認証情報は、`cdk/.env` ファイルに定義し、`docker compose` コマンドでコンテナに読み込ませることで反映されます。

`cdk/`ディレクトリに `.env` ファイルを作成し、以下の形式でAWS認証情報を記述します。

```
AWS_ACCESS_KEY_ID=YOUR_AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY=YOUR_AWS_SECRET_ACCESS_KEY
AWS_DEFAULT_REGION=YOUR_AWS_REGION
```

`cdk/.env.example` ファイルを参考にしてください。

### 4. CDKデプロイ用コンテナの実行

`compose.yaml` に定義された `cdk-deploy` サービスを使用してコンテナを起動します。

```bash
cd ./cdk
docker compose -f compose.yml run --rm cdk-deploy bash
```

このコマンドにより、`.env` ファイルから環境変数が自動的に読み込まれ、`cdk-deploy` サービスが一時的に起動し、コンテナのシェルに入ることができます。

### 5. CDKアプリケーションのデプロイ

コンテナのシェルに入った後、以下のコマンドを実行してCDKアプリケーションをデプロイします。

```bash
# CDKアプリケーションの初期設定（初回のみ）
cdk bootstrap

# すべてのスタックをデプロイ
cdk deploy --all

# 対話モードをスキップする場合
cdk deploy --all --require-approval never
```

### 6. デプロイ後のクリーンアップ

デプロイしたAWSリソースを削除するには、以下のコマンドを実行します。

```bash
cdk destroy --all

# 対話モードをスキップする場合
cdk destroy --all --force
```
