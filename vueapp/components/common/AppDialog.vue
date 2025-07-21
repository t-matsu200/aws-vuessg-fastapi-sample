<template>
  <div v-if="isOpen" class="dialog-overlay" @click.self="closeDialog">
    <div class="dialog-content">
      <div :class="['dialog-header', type]">
        <h2>{{ title }}</h2>
        <button class="close-button" @click="closeDialog">&times;</button>
      </div>
      <div class="dialog-body">
        <p>{{ message }}</p>
      </div>
      <div class="dialog-footer">
        <button @click="closeDialog">閉じる</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps({
  isOpen: {
    type: Boolean,
    required: true,
  },
  title: {
    type: String,
    default: '通知',
  },
  message: {
    type: String,
    default: '',
  },
  type: {
    type: String as PropType<'info' | 'success' | 'error' | 'warning'>,
    default: 'info',
  },
});

const emit = defineEmits(['close']);

const closeDialog = () => {
  emit('close');
};
</script>

<style scoped>
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 2000; /* ヘッダーやフッターより上に */
}

.dialog-content {
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  width: 90%;
  max-width: 400px;
  overflow: hidden;
  transform: translateY(-20px); /* 少し上に表示 */
  animation: slideIn 0.3s forwards ease-out;
}

@keyframes slideIn {
  to {
    transform: translateY(0);
  }
}

.dialog-header {
  padding: 1rem 1.5rem;
  color: white;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.dialog-header.info {
  background-color: var(--color-primary);
}
.dialog-header.success {
  background-color: var(--color-secondary);
}
.dialog-header.error {
  background-color: var(--color-error);
}
.dialog-header.warning {
  background-color: orange;
}

.dialog-header h2 {
  margin: 0;
  font-size: 1.2rem;
}

.close-button {
  background: none;
  border: none;
  font-size: 1.5rem;
  color: white;
  cursor: pointer;
}

.dialog-body {
  padding: 1.5rem;
  color: var(--color-text-dark);
}

.dialog-footer {
  padding: 1rem 1.5rem;
  text-align: right;
  border-top: 1px solid var(--color-border);
}

.dialog-footer button {
  background-color: var(--color-primary);
  color: white;
  padding: 0.75rem 1.5rem;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s ease-in-out;
}

.dialog-footer button:hover {
  background-color: #004499;
}
</style>
