/**
 * HTTP リクエスト中に発生したエラーを表すカスタムエラークラス。
 * 標準の Error オブジェクトに加えて、HTTP ステータスコードと詳細情報を含みます。
 * これにより、エラーハンドリング時に具体的な HTTP エラー情報を利用できます。
 */
export class HttpError extends Error {
  statusCode: number; // HTTP ステータスコード (例: 400, 404, 500)
  details?: any; // エラーの詳細情報 (バックエンドからのレスポンスボディなど)

  /**
   * HttpError の新しいインスタンスを作成します。
   * @param message エラーメッセージ
   * @param statusCode HTTP ステータスコード
   * @param details エラーの詳細情報 (オプション)
   */
  constructor(message: string, statusCode: number, details?: any) {
    super(message);
    this.name = 'HttpError'; // エラーの名前を設定
    this.statusCode = statusCode;
    this.details = details;

    // プロトタイプチェーンを正しく設定し、instanceof 演算子が機能するようにします。
    // TypeScript のターゲットが ES6 未満の場合に必要です。
    Object.setPrototypeOf(this, HttpError.prototype);
  }
}