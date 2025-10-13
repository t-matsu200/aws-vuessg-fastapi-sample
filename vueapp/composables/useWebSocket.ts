import { ref, shallowRef } from 'vue';

// socketteにインスパイアされたオプションの型定義
interface WebSocketOptions {
  onopen?: (event: Event) => void;
  onmessage?: (event: MessageEvent) => void;
  onclose?: (event: CloseEvent) => void;
  onerror?: (event: Event) => void;
  onreconnect?: (event: Event | CloseEvent) => void;

  timeout?: number; // 再接続までの待機時間 (ミリ秒)
  maxAttempts?: number; // 最大再接続試行回数
}

export function useWebSocket(url: string, options: WebSocketOptions = {}) {
  const {
    onopen,
    onmessage,
    onclose,
    onerror,
    onreconnect,
    timeout = 1000, // デフォルト1秒
    maxAttempts = 10, // デフォルト10回
  } = options;

  // WebSocketインスタンスはリアクティブにする必要がないためshallowRefを使用
  const socket = shallowRef<WebSocket | null>(null);
  const messages = ref<any[]>([]);
  const isConnected = ref(false);
  const connectionId = ref<string | null>(null);

  let attempts = 0;
  let isManualClose = false;
  let timer: number | null = null;

  const _connect = () => {
    if (attempts >= maxAttempts) {
      console.error(`WebSocket: Maximum reconnect attempts reached (${maxAttempts}).`);
      return;
    }

    // 既存のソケットがあればクリア
    if (socket.value) {
        socket.value.onopen = socket.value.onmessage = socket.value.onclose = socket.value.onerror = null;
        socket.value.close();
    }

    socket.value = new WebSocket(url);

    socket.value.onopen = (event) => {
      isConnected.value = true;
      attempts = 0; // 接続成功で試行回数をリセット
      console.log('WebSocket connected');
      if (onopen) onopen(event);
    };

    socket.value.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        // サーバーから送られてくるconnectionIdを特別に処理
        if (data.type === 'connectionSuccess' && data.connectionId) {
          connectionId.value = data.connectionId;
          console.log(`WebSocket connectionId received: ${connectionId.value}`);
          // このメッセージは通常のメッセージリストには追加しない
        } else {
          messages.value.push(data);
        }
      } catch (e) {
        messages.value.push(event.data);
      }
      if (onmessage) onmessage(event);
    };

    socket.value.onclose = (event) => {
      isConnected.value = false;
      connectionId.value = null; // 切断時にconnectionIdをクリア
      console.log('WebSocket disconnected');
      if (onclose) onclose(event);

      // 意図しない切断の場合のみ再接続ロジックを実行
      if (!isManualClose) {
        attempts++;
        if (onreconnect) onreconnect(event);
        
        // Exponential backoff (指数関数的バックオフ) のような単純な実装
        const reconnectTimeout = timeout * attempts;
        console.log(`WebSocket: Attempting to reconnect in ${reconnectTimeout}ms... (Attempt ${attempts})`);
        timer = setTimeout(_connect, reconnectTimeout);
      }
    };

    socket.value.onerror = (event) => {
      console.error('WebSocket error:', event);
      if (onerror) onerror(event);
      // onerrorは通常oncloseを伴うため、再接続ロジックはoncloseに集約
    };
  };

  // 外部から呼び出す接続開始メソッド
  const connect = () => {
    isManualClose = false;
    attempts = 0;
    _connect();
  };

  // 外部から呼び出す切断メソッド
  const disconnect = () => {
    isManualClose = true;
    if (timer) clearTimeout(timer);
    if (socket.value) {
      socket.value.close();
    }
  };

  // メッセージ送信メソッド
  const send = (data: string | ArrayBufferLike | Blob | ArrayBufferView) => {
    if (socket.value && isConnected.value) {
      socket.value.send(data);
    } else {
      console.warn('WebSocket is not connected.');
    }
  };

  // JSON送信ヘルパー
  const json = (data: any) => {
    send(JSON.stringify(data));
  };

  return {
    socket,
    messages,
    isConnected,
    connectionId,
    connect,
    disconnect,
    send,
    json,
  };
}