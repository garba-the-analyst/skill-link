// skilllink-frontend/src/router/index.ts
import { createRouter, createWebHistory } from 'vue-router';
import Dashboard from '../views/Dashboard.vue';
import Login from '../views/Login.vue';
import Register from '../views/Register.vue';
import Volunteer from '../views/Volunteer.vue';
import Services from '../views/Services.vue';
import Profile from '../views/Profile.vue';
import BookingDetail from '../views/BookingDetail.vue';
import Admin from '../views/Admin.vue';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'Dashboard', component: Dashboard },
    { path: '/volunteer', name: 'Volunteer', component: Volunteer },
    { path: '/services', name: 'Services', component: Services },
    { path: '/login', name: 'Login', component: Login },
    { path: '/register', name: 'Register', component: Register },
    { path: '/profile', name: 'Profile', component: Profile },
    { path: '/bookings/:id', name: 'BookingDetail', component: BookingDetail },
    { path: '/admin', name: 'Admin', component: Admin }
  ],
});

export default router;