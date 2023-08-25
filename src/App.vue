<script setup>
import Nav from './components/Nav.vue'
const themeOverrides = {
  common: {
    primaryColor: '#2152EC',
    primaryColorHover: '#2152EC'
  }
}
</script>
<template>
  <n-config-provider :theme-overrides="themeOverrides">
    <n-message-provider>
      <n-dialog-provider>
        <Nav></Nav>
        <router-view />
      </n-dialog-provider>
    </n-message-provider>
  </n-config-provider>
</template>