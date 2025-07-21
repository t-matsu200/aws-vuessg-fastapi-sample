<template>
  <div>
    <label :for="id">{{ label }}</label>
    <input :id="id" :value="modelValue" @input="$emit('update:modelValue', $event.target.value)" v-bind="$attrs" :class="{ 'is-error': error }" />
    <span>{{ error }}</span>
  </div>
</template>

<script setup>
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
    type: String,
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

input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: 0.375rem;
  font-size: 1rem;
  color: var(--color-text-dark);
  transition: border-color 0.2s ease-in-out, box-shadow 0.2s ease-in-out, background-color 0.2s ease-in-out;
  box-sizing: border-box;
}

input:focus {
  border-color: var(--color-primary);
  outline: none;
  box-shadow: 0 0 0 3px rgba(0, 86, 179, 0.2);
}

input.is-error {
  border-color: var(--color-error);
  background-color: var(--color-error-background);
}

span {
  /* margin-top: 0.25rem; */ /* REMOVE THIS */
  font-size: 0.875rem;
  color: var(--color-error);
  height: 1.5rem; /* 固定の高さでずれを防止 */
  display: block; /* heightを適用するため */
  opacity: 1; /* エラーがある場合は表示 */
  transition: opacity 0.2s ease-in-out;
  line-height: 1.5rem; /* テキストを垂直方向中央に配置 */
}

span:empty {
  opacity: 0; /* エラーがない場合は透明 */
}
</style>
