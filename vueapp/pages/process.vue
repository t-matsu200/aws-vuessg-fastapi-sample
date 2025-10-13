<template>
  <div>
    <h1>Process Management</h1>
    <button @click="startProcess" :disabled="!isConnected || !connectionId || isProcessing">
      {{ buttonText }}
    </button>
    <p v-if="statusMessage">{{ statusMessage }}</p>
    <div>
      <h2>WebSocket Raw Messages (for debugging)</h2>
      <ul>
        <li v-for="(msg, index) in messages" :key="index">{{ msg }}</li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { useWebSocket } from '~/composables/useWebSocket';
import { useDialog } from '~/composables/ui/useDialog';
import { useHttpClient } from '~/composables/http/useHttpClient';

const isProcessing = ref(false);
const statusMessage = ref('');

const config = useRuntimeConfig();
const WEBSOCKET_URL = config.public.webSocketApiEndpoint;

const { openDialog } = useDialog();
const { post } = useHttpClient();

const { messages, isConnected, connectionId, connect, disconnect } = useWebSocket(WEBSOCKET_URL, {
  onopen: () => {
    statusMessage.value = 'WebSocket connection established. Waiting for Connection ID...';
  },
  onmessage: (event) => {
    // This handler is now only for the final notification from the background task
    isProcessing.value = false;
    const message = typeof event.data === 'object' ? JSON.stringify(event.data) : event.data;
    openDialog(message, 'Delayed Task Completed');
  },
  onreconnect: () => {
    statusMessage.value = 'Attempting to reconnect to WebSocket...';
  },
  onclose: () => {
    statusMessage.value = 'WebSocket connection closed.';
  }
});

const buttonText = computed(() => {
  if (!isConnected.value) return 'Connecting...';
  if (!connectionId.value) return 'Initializing...';
  if (isProcessing.value) return 'Processing...';
  return 'Start Delayed Task';
});

const startProcess = async () => {
  if (!connectionId.value) {
    statusMessage.value = 'Connection ID not available yet.';
    return;
  }
  isProcessing.value = true;
  statusMessage.value = 'Triggering delayed task via HTTP...';
  
  try {
    await post('/api/trigger-delayed-task', { connectionId: connectionId.value });
    statusMessage.value = 'Task triggered. Waiting 30 seconds for notification...';
  } catch (error) {
    console.error('Failed to trigger task:', error);
    statusMessage.value = 'Failed to trigger task.';
    isProcessing.value = false;
  }
};

onMounted(() => {
  if (WEBSOCKET_URL) {
    connect();
  } else {
    statusMessage.value = 'WebSocket endpoint is not configured.';
  }
});

onUnmounted(() => {
  disconnect();
});
</script>