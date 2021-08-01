import { createApp } from 'vue'
import Dev from './serve.vue';

// Vue.config.productionTip = false;

let app = createApp({
  ...Dev
})

app.mount('#app')
