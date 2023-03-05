import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView
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
    {
      path: '/about',
      name: 'About',
      component: () => import('../views/AboutView.vue')
    }
  ],
})

export default router
