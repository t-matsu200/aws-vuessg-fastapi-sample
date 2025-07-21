<template>
  <div v-if="isOpen" class="confirm-overlay" @click.self="cancel">
    <div class="confirm-content">
      <div class="confirm-header">
        <h2>{{ title }}</h2>
        <button class="close-button" @click="cancel">&times;</button>
      </div>
      <div class="confirm-body">
        <p>{{ message }}</p>
      </div>
      <div class="confirm-footer">
        <button class="cancel-button" @click="cancel">キャンセル</button>
        <button class="ok-button" @click="confirm">OK</button>
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
    default: '確認',
  },
  message: {
    type: String,
    default: '',
  },
});

const emit = defineEmits(['confirm', 'cancel']);

const confirm = () => {
  emit('confirm', true);
};

const cancel = () => {
  emit('cancel', false);
};
</script>

<style scoped>
.confirm-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 2000; /* AppDialog と同じかそれ以上 */
}

.confirm-content {
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  width: 90%;
  max-width: 400px;
  overflow: hidden;
  transform: translateY(-20px);
  animation: slideIn 0.3s forwards ease-out;
}

@keyframes slideIn {
  to {
    transform: translateY(0);
  }
}

.confirm-header {
  padding: 1rem 1.5rem;
  background-color: var(--color-primary); /* プライマリカラーを使用 */
  color: white;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.confirm-header h2 {
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

.confirm-body {
  padding: 1.5rem;
  color: var(--color-text-dark);
}

.confirm-footer {
  padding: 1rem 1.5rem;
  text-align: right;
  border-top: 1px solid var(--color-border);
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.confirm-footer button {
  padding: 0.75rem 1.5rem;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s ease-in-out;
}

.ok-button {
  background-color: var(--color-primary);
  color: white;
  border: none;
}

.ok-button:hover {
  background-color: #004499;
}

.cancel-button {
  background-color: var(--color-background-light);
  color: var(--color-text-dark);
  border: 1px solid var(--color-border);
}

.cancel-button:hover {
  background-color: #e0e0e0;
}
</style>
