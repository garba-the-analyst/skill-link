// skilllink-frontend/src/stores/auth.ts
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import client from '../api/client';

export interface CurrentUser {
  id: string;
  email: string;
  displayName: string;
  profileType: 'INDIVIDUAL' | 'ORGANIZATION';
  role: string;
  isPaidProvider: boolean;
  isVolunteer: boolean;
  identityStatus: string;
  professionalStatus: string;
  totalLoggedHours: number;
  accumulatedPoints: number;
  availableCents: number;
  totalEarnedCents: number;
}

export const useAuthStore = defineStore('auth', () => {
  const accessToken = ref<string | null>(localStorage.getItem('skilllink_token'));
  const user = ref<CurrentUser | null>(null);

  const isLoggedIn = computed(() => !!accessToken.value);
  const isOrganization = computed(() => user.value?.profileType === 'ORGANIZATION');
  const isVolunteer = computed(() => !!user.value?.isVolunteer);
  const isPaidProvider = computed(() => !!user.value?.isPaidProvider);
  const isAdmin = computed(() => user.value?.role === 'ADMIN' || user.value?.role === 'SUPER_ADMIN');

  function setSession(token: string, partialUser: Partial<CurrentUser>) {
    accessToken.value = token;
    user.value = { ...(user.value ?? {}), ...partialUser } as CurrentUser;
    localStorage.setItem('skilllink_token', token);
  }

  async function fetchMe() {
    if (!accessToken.value) return;
    try {
      const { data } = await client.get('/auth/me');
      user.value = data;
    } catch {
      logout();
    }
  }

  function logout() {
    accessToken.value = null;
    user.value = null;
    localStorage.removeItem('skilllink_token');
  }

  return {
    accessToken,
    user,
    isLoggedIn,
    isOrganization,
    isVolunteer,
    isPaidProvider,
    isAdmin,
    setSession,
    fetchMe,
    logout
  };
});