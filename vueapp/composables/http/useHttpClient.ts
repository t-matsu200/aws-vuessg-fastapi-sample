import { v4 as uuidv4 } from 'uuid';
import { HttpError } from '@/types/http';
import { useTraceId } from '@/composables/useTraceId';

/**
 * HTTP リクエストを実行する関数の型定義。
 * ジェネリクス `T` はレスポンスの型を表します。
 */
type RequestFunction = <T>(url: string, options?: RequestInit) => Promise<T>;

/**
 * HTTP インターセプターの型定義。
 * 次のインターセプターまたは最終的なリクエスト関数を受け取り、新しいリクエスト関数を返します。
 * これにより、リクエスト/レスポンスの処理をチェーン化できます。
 */
type HttpInterceptor = (next: RequestFunction) => RequestFunction;

/**
 * レスポンスエラーを処理するインターセプター。
 * HTTP レスポンスが成功 (response.ok) でない場合に HttpError をスローします。
 * これにより、一元的なエラーハンドリングが可能になります。
 */
const responseErrorInterceptor: HttpInterceptor = (next) => async <T>(url, options) => {
  // 次のインターセプターまたは最終的なリクエスト関数を実行し、レスポンスを取得
  const response = await next<Response>(url, options);

  // レスポンスが成功ステータス (2xx) でない場合
  if (!response.ok) {
    // エラーレスポンスのボディを JSON として解析
    const errorData = await response.json();
    // FastAPI のバリデーションエラーの場合、詳細情報を抽出
    let errorMessage = 'Something went wrong';
    if (errorData.detail && Array.isArray(errorData.detail)) {
      errorMessage = errorData.detail.map(err => `${err.loc.join('.')} - ${err.msg}`).join(', ');
    } else if (errorData.detail) {
      errorMessage = errorData.detail;
    }
    // カスタムの HttpError をスローし、エラーメッセージ、ステータスコード、詳細情報を含める
    throw new HttpError(errorMessage, response.status, errorData);
  }

  // レスポンスが成功の場合、JSON として解析して返す
  return response.json();
};

/**
 * アプリケーション全体で使用される HTTP クライアントの Composable 関数。
 * ベースURLの設定、トレースIDの自動付与、インターセプターによるエラーハンドリングを提供します。
 */
export const useHttpClient = () => {
  const baseURL = '/api';
  const { setTraceId, clearTraceId } = useTraceId();

  /**
   * インターセプターが適用される前の、基本的な fetch リクエスト関数。
   * ベースURLと結合し、fetch API を呼び出します。
   */
  const baseRequest: RequestFunction = async <T>(url, options) => {
    const fullUrl = `${baseURL}${url}`;
    const response = await fetch(fullUrl, options);
    return response as T; // レスポンスオブジェクトをそのまま返す
  };

  // インターセプターが適用された後の最終的なリクエスト関数
  let interceptedRequest: RequestFunction = baseRequest;

  // 登録されたインターセプターを順番に適用
  // ここに他のインターセプター（例: 認証インターセプター、ロギングインターセプター）を追加できます。
  const interceptors: HttpInterceptor[] = [
    responseErrorInterceptor,
  ];

  // インターセプターをチェーン化して適用
  // 最後のインターセプターが最も外側で実行されます。
  interceptors.forEach(interceptor => {
    interceptedRequest = interceptor(interceptedRequest);
  });

  /**
   * HTTP リクエストを実行するメイン関数。
   * トレースIDを自動的にヘッダーに付与し、Content-Type を設定します。
   * その後、インターセプターチェーンを通過させてリクエストを実行します。
   * @param url リクエスト先のパス
   * @param options fetch API のオプション
   * @returns レスポンスデータ
   */
  const request = async <T>(url: string, options?: RequestInit): Promise<T> => {
    // リクエスト開始時にトレースIDを生成し、設定
    const traceId = uuidv4();
    setTraceId(traceId);

    // 既存のヘッダーをコピーし、X-Trace-ID を追加
    const headers = new Headers(options?.headers);
    headers.set('X-Trace-ID', traceId);

    // FormData 以外のリクエストの場合、Content-Type を application/json に設定
    // FormData の場合はブラウザが自動的に適切な Content-Type (multipart/form-data) を設定するため、手動で設定しない。
    if (!(options?.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json');
    }

    try {
      // インターセプターチェーンを通過させてリクエストを実行
      return await interceptedRequest<T>(url, {
        ...options,
        headers,
      });
    } finally {
      // リクエスト完了後（成功・失敗問わず）にトレースIDをクリア
      clearTraceId();
    }
  };

  /**
   * JSON ボディを持つ POST リクエストを実行します。
   * @param url リクエスト先のパス
   * @param data 送信するデータ (JSON に変換されます)
   * @param options fetch API のオプション
   * @returns レスポンスデータ
   */
  const post = <T>(url: string, data: any, options?: RequestInit): Promise<T> => {
    return request<T>(url, {
      method: 'POST',
      body: JSON.stringify(data), // データを JSON 文字列に変換
      ...options,
    });
  };

  /**
   * GET リクエストを実行します。
   * @param url リクエスト先のパス
   * @param options fetch API のオプション
   * @returns レスポンスデータ
   */
  const get = <T>(url: string, options?: RequestInit): Promise<T> => {
    return request<T>(url, {
      method: 'GET',
      ...options,
    });
  };

  /**
   * FormData ボディを持つ POST リクエストを実行します。
   * 主にファイルアップロードに使用されます。
   * @param url リクエスト先のパス
   * @param formData 送信する FormData オブジェクト
   * @param options fetch API のオプション
   * @returns レスポンスデータ
   */
  const postFormData = async <T>(url: string, formData: FormData, options?: RequestInit): Promise<T> => {
    // request 関数を呼び出すことで、トレースIDの生成とヘッダーへの追加、クリアが自動的に行われます。
    // Content-Type は FormData の場合は自動で設定されるため、ここでは指定しません。
    return request<T>(url, {
      method: 'POST',
      body: formData,
      ...options,
    });
  };

  return {
    request,
    post,
    get,
    postFormData,
  };
};
