import { defineNuxtPlugin } from '#app';
import { useTraceId } from '@/composables/useTraceId';

/**
 * ログレベルの型定義。
 */
type LogLevel = 'info' | 'warn' | 'error' | 'debug';

/**
 * グローバルなロギングヘルパーを定義する Nuxt プラグイン。
 * アプリケーション全体で一貫したログ出力形式を提供し、トレースIDを自動的に付与します。
 */
export default defineNuxtPlugin(() => {
  const { traceId } = useTraceId();

  /**
   * ログメッセージを出力する共通関数。
   * @param level ログレベル (info, warn, error, debug)。
   * @param message 出力するメッセージ。
   * @param args その他の引数。
   */
  const log = (level: LogLevel, message: string, ...args: any[]) => {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: level.toUpperCase(),
      message,
      traceId: traceId.value, // useTraceId から現在のトレースIDを取得して付与
      ...args.reduce((acc, arg, index) => ({ ...acc, [`arg${index}`]: arg }), {}), // その他の引数をオブジェクトに変換
    };

    // ログレベルに応じてコンソールに出力
    switch (level) {
      case 'info':
        console.info(JSON.stringify(logEntry));
        break;
      case 'warn':
        console.warn(JSON.stringify(logEntry));
        break;
      case 'error':
        console.error(JSON.stringify(logEntry));
        break;
      case 'debug':
        console.debug(JSON.stringify(logEntry));
        break;
      default:
        console.log(JSON.stringify(logEntry));
    }
    // 本番環境では、ログ収集サービスなどに送信するロジックをここに追加できます。
  };

  return {
    provide: {
      log: {
        info: (message: string, ...args: any[]) => log('info', message, ...args),
        warn: (message: string, ...args: any[]) => log('warn', message, ...args),
        error: (message: string, ...args: any[]) => log('error', message, ...args),
        debug: (message: string, ...args: any[]) => log('debug', message, ...args),
      },
    },
  };
});