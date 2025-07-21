<template>
  <div>
    <label :for="id">{{ label }}</label>
    <div
      :class="['drop-zone', { 'is-dragging': isDragging, 'is-error': error || localError }]"
      @dragover.prevent="onDragOver"
      @dragleave.prevent="onDragLeave"
      @drop.prevent="onDrop"
      @click="openFileExplorer"
    >
      <input
        ref="fileInput"
        type="file"
        :id="id"
        :accept="allowedExtensions.join(',')"
        @change="onFileChange"
        class="file-input"
        v-bind="$attrs"
      />
      <p v-if="!modelValue">ファイルをドラッグ＆ドロップするか、クリックして選択してください。</p>
      <p v-else>選択されたファイル: {{ modelValue.name }}</p>
    </div>
    <span v-if="error || localError">{{ error || localError }}</span>
  </div>
</template>

<script setup lang="ts">
import { ref, type PropType } from 'vue';

defineOptions({
  inheritAttrs: false,
});

const props = defineProps({
  id: { type: String, required: true },
  label: { type: String, required: true },
  modelValue: { type: Object as PropType<File | null>, default: null },
  error: { type: String, default: '' },
  allowedExtensions: {
    type: Array as PropType<string[]>,
    default: () => ['.xlsx', '.xls'],
  },
});

const emit = defineEmits(['update:modelValue']);

const isDragging = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);
const localError = ref('');

const validateFile = (file: File): boolean => {
  if (props.allowedExtensions.length === 0) {
    localError.value = '';
    return true;
  }
  const extension = `.${file.name.split('.').pop()?.toLowerCase()}`;
  if (props.allowedExtensions.includes(extension)) {
    localError.value = '';
    return true;
  } else {
    localError.value = `許可されていないファイル形式です。許可されている形式: ${props.allowedExtensions.join(', ')}`;
    emit('update:modelValue', null);
    return false;
  }
};

const onDragOver = () => {
  isDragging.value = true;
};

const onDragLeave = () => {
  isDragging.value = false;
};

const onDrop = (event: DragEvent) => {
  isDragging.value = false;
  const files = event.dataTransfer?.files;
  if (files && files.length > 0) {
    if (validateFile(files[0])) {
      emit('update:modelValue', files[0]);
    }
  }
};

const onFileChange = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const files = target.files;
  if (files && files.length > 0) {
    if (validateFile(files[0])) {
      emit('update:modelValue', files[0]);
    }
  }
};

const openFileExplorer = () => {
  fileInput.value?.click();
};
</script>

<style scoped>
label {
  display: block;
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--color-text-dark);
}

.drop-zone {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  border: 2px dashed var(--color-border);
  border-radius: 0.375rem;
  background-color: #f9fafb;
  cursor: pointer;
  transition: border-color 0.2s ease-in-out, background-color 0.2s ease-in-out;
  box-sizing: border-box;
}

.drop-zone.is-dragging {
  border-color: var(--color-primary);
  background-color: rgba(0, 86, 179, 0.05);
}

.drop-zone.is-error {
  border-color: var(--color-error);
  background-color: var(--color-error-background);
}

.file-input {
  display: none;
}

p {
  color: var(--color-secondary);
  font-size: 0.9rem;
  text-align: center;
}

span {
  display: block;
  margin-top: 0.5rem;
  font-size: 0.875rem;
  color: var(--color-error);
  height: 1.5rem; /* エラーメッセージの高さ確保 */
  opacity: 1;
  transition: opacity 0.2s ease-in-out;
  line-height: 1.5rem; /* テキストを垂直方向中央に配置 */
}

span:empty {
  opacity: 0;
}
</style>
