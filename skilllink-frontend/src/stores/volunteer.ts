// skilllink-frontend/src/stores/volunteer.ts
import { defineStore } from 'pinia';
import { ref } from 'vue';
import client from '../api/client';

export interface VolunteerOpportunity {
  id: string;
  title: string;
  description: string;
  category: string;
  location: string;
  requiredHours: number;
  status: string;
  creator?: { displayName: string };
}

export const useVolunteerStore = defineStore('volunteer', () => {
  const opportunities = ref<VolunteerOpportunity[]>([]);

  async function fetchOpportunities() {
    const { data } = await client.get('/volunteer/opportunities');
    opportunities.value = data;
  }

  async function createOpportunity(payload: { title: string; description: string; category: string; location: string; requiredHours: number }) {
    const { data } = await client.post('/volunteer/opportunities', payload);
    await fetchOpportunities(); // Refresh the board after creating
    return data;
  }

  async function applyForOpportunity(opportunityId: string) {
    const { data } = await client.post(`/volunteer/opportunities/${opportunityId}/apply`);
    return data;
  }

  async function logHours(opportunityId: string, hours: number) {
    const { data } = await client.post('/volunteer/log-hours', { opportunityId, hours });
    return data;
  }

  async function generateCertificate() {
    const { data } = await client.post('/volunteer/certificates/generate');
    return data;
  }

  return {
    opportunities,
    fetchOpportunities,
    createOpportunity,
    applyForOpportunity,
    logHours,
    generateCertificate
  };
});
