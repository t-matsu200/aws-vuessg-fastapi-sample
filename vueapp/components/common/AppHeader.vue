<template>
  <header>
    <div class="header-inner">
      <div class="header-top">
        <NuxtLink to="/" class="logo">My App</NuxtLink>
        <button class="mobile-nav-toggle" @click="toggleMobileMenu" aria-controls="primary-navigation" :aria-expanded="isMobileMenuOpen">
          <span class="sr-only">Menu</span>
        </button>
      </div>
      <AppBreadcrumbs class="header-breadcrumbs" />
    </div>
    <ul :class="{ 'mobile-nav-open': isMobileMenuOpen }">
      <li><NuxtLink to="/" @click="isMobileMenuOpen = false">Home</NuxtLink></li>
      <li><NuxtLink to="/sample" @click="isMobileMenuOpen = false">Sample</NuxtLink></li>
    </ul>
  </header>
</template>

<script setup>
import { ref } from 'vue'
import AppBreadcrumbs from './AppBreadcrumbs.vue';

const isMobileMenuOpen = ref(false)

const toggleMobileMenu = () => {
  isMobileMenuOpen.value = !isMobileMenuOpen.value
}
</script>

<style scoped>
header {
  background-color: #ffffff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  padding: 0.5rem 0 0; /* 左右のパディングを削除 */
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  box-sizing: border-box;
}

.header-inner {
  max-width: 1280px;
  margin: 0 auto;
  padding: 0 2rem; /* 左右のパディングをここで管理 */
}

.header-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  /* max-width: 1280px; */ /* 削除 */
  /* margin: 0 auto; */ /* 削除 */
  padding-bottom: 0.5rem; /* パンくずリストとの間隔 */
}

.logo {
  font-size: 1.8rem; /* 少し小さく */
  font-weight: 700;
  color: var(--color-primary);
  text-decoration: none;
  font-family: 'Inter', sans-serif;
  z-index: 1001;
  /* margin-left: 1.5rem; */ /* 削除 */
}

.header-breadcrumbs {
  /* max-width: 1280px; */ /* 削除 */
  /* margin: 0 auto; */ /* 削除 */
  padding: 0 0 1rem; /* 左右のパディングを削除 */
}

ul {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  position: fixed;
  top: 0;
  right: 0; /* 右側に配置 */
  bottom: 0;
  width: 280px;
  background-color: #ffffff;
  box-shadow: -2px 0 10px rgba(0, 0, 0, 0.1); /* シャドウの向きを調整 */
  padding: 6rem 1.5rem 1.5rem;
  transform: translateX(100%); /* 右からスライドイン */
  transition: transform 0.3s ease-out;
  z-index: 1000;
  overflow-y: auto;
}

ul.mobile-nav-open {
  transform: translateX(0);
}

a {
  text-decoration: none;
  color: var(--color-text-dark);
  font-weight: 500;
  padding: 0.75rem 1rem;
  display: block;
  border-radius: 0.375rem;
  transition: background-color 0.2s ease-in-out, color 0.2s ease-in-out;
}

a:hover {
  color: var(--color-primary);
}

a.router-link-exact-active {
  color: var(--color-primary);
}

.mobile-nav-toggle {
  display: block;
  background: none;
  border: none;
  cursor: pointer;
  z-index: 1001;
  width: 2rem; /* 少し小さく */
  height: 2rem; /* 少し小さく */
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: space-around;
  align-items: center;
  padding: 0.4rem; /* パディングも少し減らす */
}

.mobile-nav-toggle .sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}

.mobile-nav-toggle::before,
.mobile-nav-toggle::after {
  content: '';
  position: absolute;
  left: 0;
  width: 100%;
  height: 3px;
  background-color: var(--color-text-dark);
  transition: transform 0.3s ease-in-out, opacity 0.3s ease-in-out;
  border-radius: 2px;
}

.mobile-nav-toggle::before {
  top: 25%;
}

.mobile-nav-toggle::after {
  bottom: 25%;
}

.mobile-nav-toggle[aria-expanded="true"]::before {
  transform: translateY(8px) rotate(45deg);
}

.mobile-nav-toggle[aria-expanded="true"]::after {
  transform: translateY(-8px) rotate(-45deg);
}

.mobile-nav-toggle[aria-expanded="true"] span {
  opacity: 0;
}

.mobile-nav-toggle span {
  width: 100%;
  height: 3px;
  background-color: var(--color-text-dark);
  transition: opacity 0.3s ease-in-out;
  border-radius: 2px;
}
</style>