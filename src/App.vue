<script setup>
import Nav from './components/Nav.vue'
const themeOverrides = {
  common: {
    primaryColor: '#121318',
    primaryColorHover: '#121318'
  }
}

let isV3 = localStorage.getItem('isV3') || ''
if (!isV3) {
  localStorage.clear()
  localStorage.setItem('isV3', 'true')
}
</script>
<template>
  <n-config-provider :theme-overrides="themeOverrides">
    <n-message-provider>
      <n-dialog-provider>
        <div class="main">
          <Nav></Nav>
          <router-view />
        </div>
      </n-dialog-provider>
    </n-message-provider>
  </n-config-provider>
</template>
<style scoped lang="scss">
.main {
  height: 100vh;
  width: 100vw;
  background: url(./assets/images/bg.svg) no-repeat;
  background-position: center 0;
  background-size: 1632px 890px;
  background-color: #000;
}
</style>