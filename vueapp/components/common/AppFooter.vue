<template>
  <footer>
    <p>&copy; 2025 My App. All rights reserved.</p>
  </footer>
</template>

<style scoped>
footer {
  background: linear-gradient(90deg, rgb(45, 203, 217) 0%, rgb(33, 173, 224) 100%);
  padding: 2rem 2rem;
  text-align: center;
  box-sizing: border-box;
  margin-top: auto; /* コンテンツが少ない場合にフッターを下に配置 */
}

p {
  color: var(--color-text-light);
  font-size: 0.875rem;
}

@media (max-width: 768px) {
  footer {
    padding: 1.5rem 1rem;
  }

  p {
    font-size: 0.75rem;
  }
}
</style>
