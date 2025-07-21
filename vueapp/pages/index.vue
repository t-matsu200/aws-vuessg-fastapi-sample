<template>
  <div>
    <h2>Home Page</h2>
    <p>This is the home page.</p>
    <button @click="checkHealth">ヘルスチェック</button>
  </div>
</template>

<script setup lang="ts">
import { useHttpClient } from '@/composables/http/useHttpClient';
import { useDialog } from '@/composables/ui/useDialog';

const { get } = useHttpClient();
const { openDialog } = useDialog();

const checkHealth = async () => {
  try {
    const response = await get('/health');
    openDialog(`ヘルスチェック成功: ${JSON.stringify(response)}`, '成功', 'success');
  } catch (error: any) {
    openDialog(`ヘルスチェック失敗: ${error.message}`, 'エラー', 'error');
  }
};
</script>
