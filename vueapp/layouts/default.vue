<template>
  <div class="layout-wrapper">
    <AppHeader />
    <main>
      <slot />
    </main>
    <AppFooter />
    <AppDialog
      :is-open="dialogState.isOpen"
      :title="dialogState.title"
      :message="dialogState.message"
      :type="dialogState.type"
      @close="closeDialog"
    />
    <ConfirmDialog
      :is-open="confirmDialogState.isOpen"
      :title="confirmDialogState.title"
      :message="confirmDialogState.message"
      @confirm="(result) => closeConfirmDialog(result)"
      @cancel="(result) => closeConfirmDialog(result)"
    />
  </div>
</template>

<script setup>
import AppHeader from '@/components/common/AppHeader.vue';
import AppFooter from '@/components/common/AppFooter.vue';
import AppDialog from '@/components/common/AppDialog.vue';
import ConfirmDialog from '@/components/common/ConfirmDialog.vue';
import { useDialog } from '@/composables/ui/useDialog';
import { useConfirmDialog } from '@/composables/ui/useConfirmDialog';

const { dialogState, closeDialog } = useDialog();
const { confirmDialogState, closeConfirmDialog } = useConfirmDialog();
</script>

<style scoped>
.layout-wrapper {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background-color: var(--color-background-light);
}

main {
  flex: 1;
  padding: 9rem 2rem 2rem;
  width: 100%;
  max-width: 1280px;
  margin: 0 auto;
}

@media (max-width: 768px) {
  main {
    padding: 8rem 1rem 1rem;
  }
}
</style>
