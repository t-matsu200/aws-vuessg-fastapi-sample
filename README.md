# Vue.js (SSG) + FastAPI Sample Project

## 1. 概要

このプロジェクトは、フロントエンドにNuxt.js（静的サイト生成モード）、バックエンドにFastAPIを使用したWebアプリケーションのサンプルです。

開発環境では、Nginxがリバースプロキシとして機能し、Nuxt.jsの開発サーバーとFastAPIサーバーへのリクエストを振り分けます。疑似本番環境では、Nuxt.jsによって生成された静的コンテンツをNginxが直接配信し、APIリクエストのみをFastAPIサービスへプロキシします。

## 2. 技術スタック

- **フロントエンド:** Nuxt.js 3, Vue.js 3, TypeScript, VeeValidate
- **バックエンド:** Python 3, FastAPI, Pydantic, Uvicorn
- **Webサーバー:** Nginx
- **コンテナ化:** Docker, Docker Compose

## 3. 環境構築と実行

### 3.1. 前提条件

アプリケーションを実行する前に、以下のツールをインストールしてください。

- Docker
- Docker Compose

### 3.2. 開発環境の起動

1.  リポジトリのルートディレクトリで以下のコマンドを実行します。
    ```bash
    # コンテナをビルドしてバックグラウンドで起動
    docker compose up --build -d
    ```
2.  ブラウザで `http://localhost` にアクセスします。

- フロントエンドはホットリロードが有効です。コードの変更は自動的に反映されます。
- Nginxが `http://localhost:80` でリクエストを受け付け、フロントエンド（ポート3000）とバックエンド（ポート8000）に転送します。

### 3.3. 疑似本番（静的コンテンツ配信）環境の起動

1.  リポジトリのルートディレクトリで以下のコマンドを実行します。
    ```bash
    # 本番用のコンテナをビルドしてバックグラウンドで起動
    docker compose -f compose.prod.yaml up --build -d
    ```
2.  ブラウザで `http://localhost` にアクセスします。

- このコマンドは、Nuxt.jsアプリケーションを静的ファイルとしてビルドし、それをNginxで配信するコンテナを起動します。
- `/api` へのリクエストはバックエンドのFastAPIサービスへ転送されます。

### 3.4. コンテナの停止

- **開発環境:**
  ```bash
  docker compose down
  ```
- **疑似本番環境:**
  ```bash
  docker compose -f compose.prod.yaml down
  ```

## 4. ディレクトリ構成

```
.
├── compose.yaml         # 開発環境用のDocker Composeファイル
├── compose.prod.yaml    # 疑似本番環境用のDocker Composeファイル
├── nginx/               # Nginxの設定ファイルとDockerfile
├── pythonapp/           # FastAPIアプリケーションのソースコード
└── vueapp/              # Nuxt.jsアプリケーションのソースコード
```
