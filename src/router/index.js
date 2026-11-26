import { createRouter, createWebHashHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import { session, resetSession } from '../stores/session.js'

const router = createRouter({ history: createWebHashHistory(import.meta.env.BASE_URL), scrollBehavior(to) {
  if (to.path === '/' || to.path === '/camera' || to.path === '/analysis' || to.path === '/result') return { top: 0, left: 0 }
}, routes: [
  { path: '/', component: HomeView }, { path: '/camera', component: () => import('../views/CameraView.vue') },
  { path: '/analysis', component: () => import('../views/AnalysisView.vue') }, { path: '/result', component: () => import('../views/ResultView.vue') }
] })
router.beforeEach(to => (to.path === '/analysis' && !session.image) || (to.path === '/result' && !session.result) ? '/' : true)
router.afterEach(to => { if (to.path === '/') resetSession() })
export default router
