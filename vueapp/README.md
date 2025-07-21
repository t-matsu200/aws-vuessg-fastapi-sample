# Nuxt.js Frontend Application (vueapp)

## 1. 概要

このディレクトリには、プロジェクトのフロントエンドを担当するNuxt.jsアプリケーションが含まれています。

開発環境ではNode.jsサーバー上で動作し、疑似本番環境では静的サイトとしてビルド（SSG）され、Nginxによって配信されます。

## 2. 依存関係の管理

- 依存関係は `package.json` で定義されています。
- `package-lock.json` は、確定した依存関係のバージョンを記録するロックファイルです。

### 2.1. 新しい依存関係の追加

新しいライブラリを追加する場合は、以下のコマンドを実行します。

```bash
# 開発時依存として追加する場合
docker compose exec frontend npm install --save-dev [package-name]

# 疑似本番依存として追加する場合
docker compose exec frontend npm install --save [package-name]
```

## 3. アプリケーションの構造

[Nuxt.jsのユーザーガイド](https://nuxt3-guide-jp.vercel.app/)に基づいたディレクトリ構造を採用しています。

```
.
├── Dockerfile         # 開発環境用のDockerfile
├── Dockerfile.prod    # 疑似本番ビルド用のマルチステージDockerfile
├── nginx.prod.conf    # 疑似本番環境用のNginx設定ファイル
├── nuxt.config.ts     # Nuxt.jsの設定ファイル
├── package.json       # 依存関係の定義ファイル
├── assets/            # CSS、画像などの静的アセット
├── components/        # 再利用可能なVueコンポーネント
├── composables/       # コンポーネントのロジックを関数としてまとめることで、コードの再利用や整理を容易にするAPI（Composition API）
├── layouts/           # アプリケーションの共通レイアウト
├── pages/             # アプリケーションのページとルーティング
├── plugins/           # Vueアプリケーションに登録するプラグイン
├── tests/             # テストコード
└── types/             # グローバルな型定義
```
