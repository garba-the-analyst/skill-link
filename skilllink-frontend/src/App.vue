<script setup lang="ts">
import { onMounted } from 'vue';
import { useAuthStore } from './stores/auth';

const auth = useAuthStore();

// Attempt to restore session from local storage on app load
onMounted(async () => {
  await auth.fetchMe();
});
</script>

<template>
  <main class="min-h-screen bg-background text-on-surface">
    <!-- Global Navbar -->
    <nav class="bg-surface-container-highest border-b border-outline-variant px-6 py-4 flex justify-between items-center">
      <router-link to="/" class="font-display-lg text-xl font-extrabold text-primary flex items-center gap-2">
        <span class="material-symbols-outlined">hub</span> SkillLink
      </router-link>
      
      <div class="flex items-center gap-6 font-body-sm font-semibold">
        <router-link to="/" class="hover:text-primary transition-colors text-on-surface-variant" active-class="text-primary" exact-active-class="text-primary">
          Dashboard
        </router-link>
        <router-link to="/services" class="hover:text-primary transition-colors text-on-surface-variant" active-class="text-primary">
          Hire Help
        </router-link>
        <router-link to="/volunteer" class="hover:text-secondary transition-colors text-on-surface-variant" active-class="text-secondary">
          Civic Board
        </router-link>
        
        <!-- Dynamic Auth Rendering -->
        <template v-if="auth.isLoggedIn">
          <router-link v-if="auth.isAdmin" to="/admin" class="hover:text-primary transition-colors text-on-surface-variant" active-class="text-primary">
            Admin
          </router-link>
          <router-link to="/profile" class="bg-surface-container-low border border-outline-variant hover:border-primary px-4 py-2 rounded-lg transition-colors flex items-center gap-2">
            <span class="material-symbols-outlined text-[18px]">person</span>
            Workspace
          </router-link>
        </template>
        
        <template v-else>
          <router-link to="/login" class="bg-primary/10 text-primary hover:bg-primary/20 px-4 py-2 rounded-lg transition-colors">
            Sign In
          </router-link>
        </template>
      </div>
    </nav>

    <!-- Dynamic Route Outlet -->
    <router-view />
  </main>
</template>