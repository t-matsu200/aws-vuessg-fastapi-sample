# FastAPI Backend Application (pythonapp)

## 1. 概要

このディレクトリには、プロジェクトのバックエンドを担当するFastAPIアプリケーションが含まれています。

主な役割は、フロントエンドからのAPIリクエストを受け付け、フォームデータの処理やファイルアップロードなどのビジネスロジックを実行することです。

## 2. 依存関係の管理

- 依存関係は `pyproject.toml` で定義されています。
- `uv.lock` は、確定した依存関係のバージョンを記録するロックファイルです。

### 2.1. 新しい依存関係の追加

新しいライブラリを追加する場合は、`pyproject.toml`の`dependencies`セクションに追記し、以下のコマンドでロックファイルを更新します。

```bash
# Dockerコンテナ内で実行
docker compose exec backend bash

# コンテナ内
uv sync --reinstall
```

## 3. アプリケーションの構造

```
.
├── Dockerfile         # 疑似本番・開発共用のDockerfile
├── pyproject.toml     # 依存関係の定義ファイル
├── uv.lock            # 依存関係のロックファイル
├── app.py             # FastAPIアプリケーションのエントリーポイント
├── common/            # 共通スキーマやユーティリティ
├── core/              # アプリケーションのコア機能（ロギング、ミドルウェアなど）
├── modules/           # 各機能モジュール（ルーターなど）
└── tests/             # テストコード
```

## 4. ローカルでのデバッグ

- **ログの確認:**
  開発環境では、FastAPIのログはコンテナの標準出力に表示されます。
  ```bash
  docker compose logs -f backend
  ```
