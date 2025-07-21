<template>
  <button :type="type">
    <slot />
  </button>
</template>

<script setup>
defineProps({
  type: {
    type: String,
    default: 'button',
  },
});
</script>

<style scoped>
button {
  display: block;
  width: 100%;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 0.375rem;
  background-color: var(--color-primary);
  color: var(--color-text-light);
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s ease-in-out, transform 0.1s ease-in-out;
  box-sizing: border-box;
}

button:hover {
  background-color: #004499;
  transform: translateY(-1px);
}

button:active {
  transform: translateY(0);
}
</style>
