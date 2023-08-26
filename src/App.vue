<script setup>
import Nav from './components/Nav.vue'
const themeOverrides = {
  common: {
    primaryColor: '#2152EC',
    primaryColorHover: '#2152EC'
  }
}

let isV2 = localStorage.getItem('isV2') || ''
if (!isV2) {
  localStorage.clear()
  localStorage.setItem('isV2', 'true')
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