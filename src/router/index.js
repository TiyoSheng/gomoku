import { createRouter, createWebHistory } from 'vue-router'
import Home from '../views/Home.vue'
import Detail from '../views/Detail.vue'

const routes = [{
  path: '/',
  name: 'Home',
  component: Home
}, {
  path: '/room/:id',
  name: 'Detail',
  component: Detail
}]

// 路由参数配置
const router = createRouter({
  history: createWebHistory(),
  routes: routes,
})

// 导出默认值
export default router