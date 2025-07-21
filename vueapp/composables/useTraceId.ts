import { ref } from 'vue';

/**
 * アプリケーション全体で共有される現在のトレースIDを管理する Composable 関数。
 * HTTP リクエストやその他の処理に関連するログに一意の識別子を付与するために使用されます。
 */
const currentTraceId = ref<string | null>(null);

export const useTraceId = () => {
  /**
   * 現在のトレースIDを設定します。
   * @param id 設定するトレースIDの文字列。
   */
  const setTraceId = (id: string) => {
    currentTraceId.value = id;
  };

  /**
   * 現在のトレースIDをクリアします。
   * リクエストの完了後など、トレースIDが不要になった際に呼び出されます。
   */
  const clearTraceId = () => {
    currentTraceId.value = null;
  };

  return {
    traceId: currentTraceId, // 現在のトレースID (リアクティブ)
    setTraceId,
    clearTraceId,
  };
};
