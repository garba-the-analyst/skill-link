<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import client from '../api/client';

const router = useRouter();
const auth = useAuthStore();

const displayName = ref('');
const email = ref('');
const password = ref('');
const isPaidProvider = ref(false);
const isVolunteer = ref(true); // Defaulting to true to encourage civic participation
const isSubmitting = ref(false);
const errorMessage = ref('');

async function handleRegister() {
  errorMessage.value = '';
  isSubmitting.value = true;
  
  try {
    const { data } = await client.post('/auth/register', {
      displayName: displayName.value,
      email: email.value,
      passwordHash: password.value,
      profileType: 'INDIVIDUAL',
      isPaidProvider: isPaidProvider.value,
      isVolunteer: isVolunteer.value
    });
    
    auth.setSession(data.accessToken, data.user);
    router.push('/');
  } catch (err: any) {
    errorMessage.value = err?.response?.data?.message || 'Failed to create your account.';
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <div class="max-w-md mx-auto mt-10 mb-20 p-8 bg-surface-container-highest border border-outline-variant rounded-2xl shadow-lg">
    <h1 class="text-2xl font-extrabold text-on-surface mb-2">Join SkillLink</h1>
    <p class="text-on-surface-variant mb-6 text-sm">Set up your campus profile to hire talent or volunteer.</p>
    
    <form @submit.prevent="handleRegister" class="flex flex-col gap-4">
      <input 
        v-model="displayName" 
        type="text" 
        required
        placeholder="Full Name (e.g., Abdulmalik Ayomide)" 
        class="bg-surface border border-outline-variant rounded-lg px-4 py-3 text-on-surface focus:outline-none focus:border-primary" 
      />
      <input 
        v-model="email" 
        type="email" 
        required
        placeholder="Student Email Address" 
        class="bg-surface border border-outline-variant rounded-lg px-4 py-3 text-on-surface focus:outline-none focus:border-primary" 
      />
      <input 
        v-model="password" 
        type="password" 
        required
        minlength="8"
        placeholder="Secure Password" 
        class="bg-surface border border-outline-variant rounded-lg px-4 py-3 text-on-surface focus:outline-none focus:border-primary" 
      />
      
      <div class="mt-4 pt-4 border-t border-outline-variant flex flex-col gap-3">
        <p class="font-body-sm font-bold text-on-surface">How do you want to use the platform?</p>
        
        <label class="flex items-start gap-3 bg-surface p-3 rounded-lg border border-outline-variant cursor-pointer">
          <input v-model="isPaidProvider" type="checkbox" class="mt-1" />
          <div class="flex flex-col">
            <span class="text-primary font-bold font-body-sm">Offer Paid Skills</span>
            <span class="text-on-surface-variant text-xs mt-1">List your technical skills and take paid gig bookings from peers.</span>
          </div>
        </label>

        <label class="flex items-start gap-3 bg-surface p-3 rounded-lg border border-outline-variant cursor-pointer">
          <input v-model="isVolunteer" type="checkbox" class="mt-1" />
          <div class="flex flex-col">
            <span class="text-secondary font-bold font-body-sm">Civic Volunteering</span>
            <span class="text-on-surface-variant text-xs mt-1">Join NGO projects, log community hours, and earn certificates.</span>
          </div>
        </label>
      </div>

      <p v-if="errorMessage" class="text-error font-body-sm mt-2">{{ errorMessage }}</p>

      <button 
        type="submit" 
        :disabled="isSubmitting"
        class="bg-primary text-on-primary font-bold py-3 rounded-lg mt-4 hover:bg-primary-container transition-colors disabled:opacity-50"
      >
        {{ isSubmitting ? 'Creating Account...' : 'Create Account' }}
      </button>
    </form>
  </div>
</template>