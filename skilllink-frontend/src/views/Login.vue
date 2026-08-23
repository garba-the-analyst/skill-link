<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import client from '../api/client'; // Direct axios client for the raw login request

const router = useRouter();
const auth = useAuthStore();

const email = ref('');
const password = ref('');
const isSubmitting = ref(false);
const errorMessage = ref('');

async function handleLogin() {
  errorMessage.value = '';
  isSubmitting.value = true;
  
  try {
    const { data } = await client.post('/auth/login', {
      email: email.value,
      password: password.value // Sent as plaintext over HTTPS, hashed and compared on the backend
    });
    
    auth.setSession(data.accessToken, data.user);
    router.push('/');
  } catch (err: any) {
    errorMessage.value = err?.response?.data?.message || 'Invalid email or password credentials.';
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <div class="max-w-md mx-auto mt-20 p-8 bg-surface-container-highest border border-outline-variant rounded-2xl shadow-lg">
    <h1 class="text-2xl font-extrabold text-on-surface mb-2">Welcome Back</h1>
    <p class="text-on-surface-variant mb-6 text-sm">Sign in to manage your gigs and civic hours.</p>
    
    <form @submit.prevent="handleLogin" class="flex flex-col gap-4">
      <input 
        v-model="email" 
        type="email" 
        required
        placeholder="Email Address" 
        class="bg-surface border border-outline-variant rounded-lg px-4 py-3 text-on-surface focus:outline-none focus:border-primary" 
      />
      <input 
        v-model="password" 
        type="password" 
        required
        placeholder="Password" 
        class="bg-surface border border-outline-variant rounded-lg px-4 py-3 text-on-surface focus:outline-none focus:border-primary" 
      />
      
      <p v-if="errorMessage" class="text-error font-body-sm">{{ errorMessage }}</p>

      <button 
        type="submit" 
        :disabled="isSubmitting"
        class="bg-primary text-on-primary font-bold py-3 rounded-lg mt-2 hover:bg-primary-container transition-colors disabled:opacity-50"
      >
        {{ isSubmitting ? 'Authenticating...' : 'Sign In' }}
      </button>
    </form>

    <p class="text-center font-body-sm text-on-surface-variant mt-6">
      Don't have an account? 
      <router-link to="/register" class="text-primary hover:underline">Create one</router-link>
    </p>
  </div>
</template>