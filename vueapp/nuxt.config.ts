export default defineNuxtConfig({
  ssr: true,
  devtools: { enabled: true }, // Nuxt DevTools を有効化
  css: [
    '~/assets/css/main.css' // グローバルCSSファイルを読み込み
  ],
  plugins: [
    '~/plugins/logging.ts' // ロギングプラグインを登録
  ],
  build: {
    // 'uuid' パッケージをトランスパイル対象に追加。
    // ESM形式で提供されるパッケージを古いブラウザ環境でも動作させるために必要。
    transpile: ['uuid']
  }
})
