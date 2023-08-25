import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import router from './router'
import './assets/css/reset.css'

import {
  create, NButton, NLayout, NLayoutHeader, NLayoutFooter, NH2, NLayoutSider,
  NAnchor, NAnchorLink, NMessageProvider, NConfigProvider, NDialogProvider, NInput,
  NFormItem, NModal, NPopconfirm, NPopover, NSelect, NSpin, NDivider, NDatePicker,
  NRadioGroup, NRadioButton, NAffix, NEmpty, NCard, NGrid, NGridItem, NResult, NInputNumber,
  NCountdown, NCollapse, NCollapseItem, NTable
} from 'naive-ui'
const naive = create({
  components: [NButton, NLayout, NLayoutHeader, NLayoutFooter, NH2, NLayoutSider,
    NAnchor, NAnchorLink, NMessageProvider, NConfigProvider, NDialogProvider, NInput,
    NFormItem, NModal, NPopconfirm, NPopover, NSelect, NSpin, NDivider, NDatePicker,
    NRadioGroup, NRadioButton, NAffix, NEmpty, NCard, NGrid, NGridItem, NResult, NInputNumber,
    NCountdown, NCollapseItem, NCollapse, NTable]
})
createApp(App).use(naive).use(router).mount('#app')
