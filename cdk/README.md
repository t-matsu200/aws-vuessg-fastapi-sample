## AWS CDKによるインフラデプロイ

このプロジェクトのAWSインフラはAWS CDKで定義されています。CDKアプリケーションはDockerコンテナ内で実行することができ、環境の一貫性を保ちながらデプロイ作業を行うことができます。

### 1. 前提条件

- Dockerがインストールされていること。
- AWS CLIが設定されており、デプロイ対象のAWSアカウントへの認証情報が利用可能であること。

### 2. AWS認証情報の設定

AWS認証情報は、`cdk/.env` ファイルに定義し、`docker compose` コマンドでコンテナに読み込ませることで反映されます。

`cdk/`ディレクトリに `.env` ファイルを作成し、以下の形式でAWS認証情報を記述します。

```
AWS_ACCESS_KEY_ID=YOUR_AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY=YOUR_AWS_SECRET_ACCESS_KEY
AWS_DEFAULT_REGION=YOUR_AWS_REGION
```

`cdk/.env.example` ファイルを参考にしてください。

### 3. CDKデプロイ用コンテナの実行

`compose.yaml` に定義された `cdk-deploy` サービスを使用してコンテナを起動します。

```bash
cd ./cdk
docker compose -f compose.yml run --rm cdk-deploy bash
```

このコマンドにより、`.env` ファイルから環境変数が自動的に読み込まれ、`cdk-deploy` サービスが一時的に起動し、コンテナのシェルに入ることができます。

### 4. CDKアプリケーションのデプロイ

コンテナのシェルに入った後、以下のコマンドを実行してCDKアプリケーションをデプロイします。

```bash
# CDKアプリケーションの初期設定（初回のみ）
npx cdk bootstrap

# すべてのスタックをデプロイ
npx cdk deploy --all
```

### 5. デプロイ後のクリーンアップ

デプロイしたAWSリソースを削除するには、以下のコマンドを実行します。

```bash
npx cdk destroy --all
```
