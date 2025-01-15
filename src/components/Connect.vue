<script setup>
import { ref } from 'vue'
</script>

<template>
  <div class="connect">
    <a href="https://discord.gg/KCpNety8cC" target="_blank" rel="noopener noreferrer">
      <img src="../assets/images/discord.svg" alt="">
    </a>
  </div>
</template>

<style lang="scss" scoped>
.connect {
  display: flex;
  align-items: center;
  height: 32px;
  width: 330px;
  margin-top: 16px;
  margin-left: 24px;
  border-radius: 4px;
  // background: #23242a;
  padding: 0 16px;
  box-sizing: border-box;

  img {
    height: 24px;
    width: 24px;
    cursor: pointer;
  }
}
</style>