<template>
  <nav aria-label="breadcrumb">
    <ol>
      <li v-for="(crumb, index) in breadcrumbs" :key="index">
        <NuxtLink v-if="index < breadcrumbs.length - 1" :to="crumb.to">
          {{ crumb.text }}
        </NuxtLink>
        <span v-else aria-current="page">{{ crumb.text }}</span>
      </li>
    </ol>
  </nav>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();

const breadcrumbs = computed(() => {
  const pathArray = route.path.split('/').filter(p => p);
  const crumbs: { text: string; to: string }[] = [
    { text: 'Home', to: '/' },
  ];

  let path = '';
  pathArray.forEach(pathName => {
    path = `${path}/${pathName}`;
    const text = pathName.charAt(0).toUpperCase() + pathName.slice(1);
    crumbs.push({ text, to: path });
  });

  // If we are at the root, only show Home
  if (crumbs.length > 1 && route.path === '/') {
    return [crumbs[0]];
  }

  return crumbs;
});
</script>

<style scoped>
nav {
  padding: 0.5rem 0; /* ヘッダー内のパディングに合わせる */
}

ol {
  display: flex;
  list-style: none;
  padding: 0;
  margin: 0;
  gap: 0.75rem; /* 項目間のスペースを広げる */
  align-items: center;
  flex-wrap: wrap; /* 折り返しを許可 */
}

li {
  font-size: 0.9rem; /* フォントサイズを調整 */
}

li:not(:last-child)::after {
  content: '>';
  margin-left: 0.75rem; /* 区切り文字との間隔を広げる */
  color: var(--color-secondary);
}

a {
  color: var(--color-text-dark);
  text-decoration: none;
  transition: color 0.2s ease-in-out;
}

a:hover {
  color: var(--color-primary);
}

span {
  color: var(--color-primary); /* アクティブな項目はプライマリカラーに */
  font-weight: 600; /* 太字に */
}
</style>
