<template>
  <div class="form-container">
    <h2>Sample Form</h2>
    <form @submit.prevent="handleFormSubmit">
      <FormInput id="name" label="Name" v-model="name" v-bind="nameAttrs" :error="errors.name" />
      <FormInput id="email" label="Email" v-model="email" v-bind="emailAttrs" :error="errors.email" />
      <FormDropdown id="category" label="Category" v-model="category" v-bind="categoryAttrs" :items="categories" :error="errors.category" />
      <FormFileUpload id="file" label="Attachment" v-model="file" v-bind="fileAttrs" :error="errors.file" />
      <AppButton type="submit">Submit</AppButton>
    </form>
  </div>
</template>

<script setup lang="ts">
import { useSampleForm } from '@/composables/form/useSampleForm';
import FormInput from '@/components/form/FormInput.vue';
import AppButton from '@/components/common/AppButton.vue';
import FormDropdown from '@/components/form/FormDropdown.vue';
import FormFileUpload from '@/components/form/FormFileUpload.vue';
import type { ListItems } from '@/types';
import { useDialog } from '@/composables/ui/useDialog';
import { useConfirmDialog } from '@/composables/ui/useConfirmDialog';

// Nuxt の提供する $log ヘルパーを使用
const { $log } = useNuxtApp();

const { openDialog } = useDialog();
const { openConfirmDialog } = useConfirmDialog();

const { name, nameAttrs, email, emailAttrs, category, categoryAttrs, file, fileAttrs, errors, handleSubmit, submitForm, resetForm } = useSampleForm();

const categories: ListItems[] = [
  { value: 'general', label: 'General' },
  { value: 'support', label: 'Support' },
  { value: 'feedback', label: 'Feedback' },
];

const handleFormSubmit = handleSubmit(async () => {
  const confirmed = await openConfirmDialog('この内容でフォームを送信しますか？', '送信確認');

  if (confirmed) {
    const result = await submitForm();
    if (result.success) {
      openDialog('フォームが正常に送信されました！', '成功', 'success');
      $log.info('Form submitted successfully.', { response: result.response });
      resetForm();
    } else {
      openDialog(result.error, 'エラー', 'error');
      $log.error('Form submission failed.', { error: result.error });
    }
  }
});
</script>

<style scoped>
.form-container {
  max-width: 600px;
  margin: 0 auto;
}

form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

@media (max-width: 768px) {
  .form-container {
    padding: 0 1rem;
  }
}
</style>
