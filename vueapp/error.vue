<template>
  <div class="error-page">
    <h1>Error {{ error.statusCode }}</h1>
    <p>{{ error.message }}</p>
    <button @click="handleError">Go to Home</button>
  </div>
</template>

<script setup>
const props = defineProps({
  error: Object
});

const handleError = () => clearError({ redirect: '/' });
</script>

<style scoped>
.error-page {
  text-align: center;
  margin-top: 5rem;
}
</style>