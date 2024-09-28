import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import RegisterVue from '@/components/user/Register.vue'
import Login from '@/components/user/Login.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView
    },
    {
      path: '/register',
      name: 'register',
      component: RegisterVue
    },
    {
      path: '/login',
      name: 'login',
      component: Login,
    },
    {
      path: '/vessel/details/:id',
      name: 'Vessel Overview',
      component: () => import('../views/VesselDetails.vue')
    },
    {
      path: '/flight/:vessel_id/:id',
      name: 'Flight',
      component: () => import('../views/FlightView.vue')
    },
  ],
})

export default router
