<template>
  <div>
    <label :for="id">{{ label }}</label>
    <select :id="id" :value="modelValue" @change="$emit('update:modelValue', $event.target.value)" :class="{ 'is-error': error, 'is-placeholder': !modelValue }">
      <option value="" disabled>カテゴリーを選択してください</option>
      <option v-for="item in items" :key="item.value" :value="item.value">
        {{ item.label }}
      </option>
    </select>
    <span>{{ error }}</span>
  </div>
</template>

<script setup lang="ts">
import type { ListItems } from '@/types';

defineProps({
  id: {
    type: String,
    required: true,
  },
  label: {
    type: String,
    required: true,
  },
  modelValue: {
    type: [String, Number],
    required: true,
  },
  items: {
    type: Array as () => ListItems[],
    required: true,
  },
  error: {
    type: String,
    default: '',
  },
});

defineEmits(['update:modelValue']);
</script>

<style scoped>
div {
  margin-bottom: 0;
}

label {
  display: block;
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--color-text-dark);
}

select {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: 0.375rem;
  font-size: 1rem;
  color: var(--color-text-dark);
  background-color: white;
  transition: border-color 0.2s ease-in-out, box-shadow 0.2s ease-in-out, background-color 0.2s ease-in-out;
  box-sizing: border-box;
  appearance: none; /* デフォルトの矢印を非表示 */
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='currentColor'%3E%3Cpath fill-rule='evenodd' d='M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z' clip-rule='evenodd' /%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.75rem center;
  background-size: 1.5em 1.5em;
}

select:focus {
  border-color: var(--color-primary);
  outline: none;
  box-shadow: 0 0 0 3px rgba(0, 86, 179, 0.2);
}

select.is-placeholder {
  color: var(--color-text-placeholder);
}

select.is-error {
  border-color: var(--color-error);
  background-color: var(--color-error-background);
}

span {
  margin-top: 0.25rem;
  font-size: 0.875rem;
  color: var(--color-error);
  height: 1.5rem; /* 固定の高さでずれを防止 */
  display: block; /* min-heightを適用するため */
  opacity: 1;
  transition: opacity 0.2s ease-in-out;
  line-height: 1.5rem; /* テキストを垂直方向中央に配置 */
}

span:empty {
  opacity: 0;
}
</style>
