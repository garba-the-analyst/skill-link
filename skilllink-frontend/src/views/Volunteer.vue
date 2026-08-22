<script setup lang="ts">
import { ref, onMounted, reactive } from 'vue';
import { useRouter } from 'vue-router';
import { useVolunteerStore } from '../stores/volunteer';
import { useAuthStore } from '../stores/auth';

const router = useRouter();
const volunteer = useVolunteerStore();
const auth = useAuthStore();

const isGenerating = ref(false);
const certificateHash = ref('');
const certificateIsError = ref(false);
const message = ref('');

const applyingId = ref<string | null>(null);
const applyMessages = reactive<Record<string, string>>({});
const hourInputs = reactive<Record<string, number | null>>({});
const loggingId = ref<string | null>(null);
const logMessages = reactive<Record<string, string>>({});

onMounted(async () => {
  await volunteer.fetchOpportunities();
});

async function handleGenerateCertificate() {
  message.value = '';
  isGenerating.value = true;

  try {
    const cert = await volunteer.generateCertificate();
    certificateHash.value = cert.issueHash;
    certificateIsError.value = false;
    message.value = 'Cryptographic certificate generated successfully!';
  } catch (err: any) {
    certificateIsError.value = true;
    message.value = err?.response?.data?.message || 'You need verified hours to generate a certificate.';
  } finally {
    isGenerating.value = false;
  }
}

async function applyForGig(opportunityId: string) {
  if (!auth.isLoggedIn) {
    router.push('/login');
    return;
  }

  applyingId.value = opportunityId;
  applyMessages[opportunityId] = '';
  try {
    await volunteer.applyForOpportunity(opportunityId);
    applyMessages[opportunityId] = 'Application sent! The organizer will follow up with you.';
  } catch (err: any) {
    applyMessages[opportunityId] = err?.response?.data?.message || 'Could not submit your application.';
  } finally {
    applyingId.value = null;
  }
}

async function submitHours(opportunityId: string) {
  if (!auth.isLoggedIn) {
    router.push('/login');
    return;
  }

  const hours = hourInputs[opportunityId];
  if (!hours || hours <= 0) {
    logMessages[opportunityId] = 'Enter how many hours you completed first.';
    return;
  }

  loggingId.value = opportunityId;
  logMessages[opportunityId] = '';
  try {
    await volunteer.logHours(opportunityId, hours);
    logMessages[opportunityId] = `Logged ${hours}h — pending admin verification.`;
    hourInputs[opportunityId] = null;
  } catch (err: any) {
    logMessages[opportunityId] = err?.response?.data?.message || 'Could not log those hours.';
  } finally {
    loggingId.value = null;
  }
}
</script>

<template>
  <div class="max-w-7xl mx-auto px-4 py-10 flex flex-col gap-10">
    
    <!-- Page Header -->
    <header class="flex flex-col gap-2 border-b border-outline-variant pb-6">
      <h1 class="font-display-lg text-4xl font-extrabold text-on-surface flex items-center gap-3">
        <span class="material-symbols-outlined text-secondary text-4xl">volunteer_activism</span>
        Civic Volunteering Board
      </h1>
      <p class="font-body-base text-on-surface-variant max-w-3xl text-lg">
        Give back to the Newgate University Minna community. Browse active projects, contribute your time, and earn tamper-evident digital certificates for your resume.
      </p>
    </header>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
      
      <!-- MAIN COLUMN: The Opportunities Feed -->
      <section class="lg:col-span-2 flex flex-col gap-6">
        <h2 class="font-headline-md text-2xl text-on-surface">Active Projects</h2>
        
        <div v-if="volunteer.opportunities.length" class="flex flex-col gap-5">
          <div 
            v-for="opp in volunteer.opportunities" 
            :key="opp.id"
            class="bg-surface-container-highest p-6 rounded-2xl border border-outline-variant hover:border-secondary transition-all shadow-md flex flex-col gap-4 relative overflow-hidden group"
          >
            <div class="absolute left-0 top-0 bottom-0 w-1.5 bg-secondary group-hover:bg-secondary-container transition-colors"></div>
            
            <div class="flex justify-between items-start pl-3">
              <div>
                <h3 class="font-body-base font-bold text-on-surface text-xl">{{ opp.title }}</h3>
                <p class="font-body-sm text-on-surface-variant mt-1 flex items-center gap-1">
                  <span class="material-symbols-outlined text-[16px]">corporate_fare</span>
                  Hosted by {{ opp.creator?.displayName }}
                </p>
              </div>
              <div class="text-right bg-surface-container-low px-4 py-2 rounded-lg border border-outline-variant">
                <span class="font-mono-data text-2xl font-extrabold text-secondary">{{ opp.requiredHours }}</span>
                <p class="font-label-caps text-on-surface-variant uppercase mt-1">Hours</p>
              </div>
            </div>
            
            <p class="font-body-sm text-on-surface-variant pl-3 leading-relaxed">
              {{ opp.description }}
            </p>
            
            <div class="flex flex-wrap gap-3 mt-2 pl-3">
              <span class="bg-secondary/10 text-secondary border border-secondary/20 font-label-caps px-3 py-1.5 rounded-md text-[11px] uppercase flex items-center gap-1">
                <span class="material-symbols-outlined text-[14px]">category</span> {{ opp.category }}
              </span>
              <span class="bg-surface text-on-surface-variant border border-outline-variant font-label-caps px-3 py-1.5 rounded-md text-[11px] uppercase flex items-center gap-1">
                <span class="material-symbols-outlined text-[14px]">location_on</span> {{ opp.location }}
              </span>
            </div>

            <div class="mt-4 pt-4 border-t border-outline-variant/40 flex flex-col gap-3">
              <div class="flex flex-wrap items-center justify-between gap-3">
                <div class="flex items-center gap-2">
                  <input
                    v-model.number="hourInputs[opp.id]"
                    type="number"
                    min="1"
                    max="24"
                    placeholder="Hours"
                    class="w-24 bg-surface-container border border-outline-variant rounded-lg px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-secondary"
                  />
                  <button
                    :disabled="loggingId === opp.id"
                    @click="submitHours(opp.id)"
                    class="border border-secondary text-secondary hover:bg-secondary/10 px-4 py-2 rounded-lg font-bold text-sm transition-colors disabled:opacity-50"
                  >
                    Log Hours
                  </button>
                </div>

                <button 
                  :disabled="applyingId === opp.id"
                  @click="applyForGig(opp.id)"
                  class="bg-secondary text-on-secondary hover:bg-secondary-container px-6 py-2.5 rounded-lg font-bold transition-colors shadow-sm disabled:opacity-50"
                >
                  {{ applyingId === opp.id ? 'Applying…' : 'Apply to Volunteer' }}
                </button>
              </div>
              <p v-if="applyMessages[opp.id]" class="font-body-sm text-secondary text-right">{{ applyMessages[opp.id] }}</p>
              <p v-if="logMessages[opp.id]" class="font-body-sm text-on-surface-variant text-right">{{ logMessages[opp.id] }}</p>
            </div>
          </div>
        </div>

        <div v-else class="bg-surface-container p-10 rounded-2xl border border-outline-variant border-dashed text-center">
          <span class="material-symbols-outlined text-outline text-4xl mb-2">inbox</span>
          <p class="font-body-sm text-on-surface-variant">No community projects are currently active.</p>
        </div>
      </section>

      <!-- SIDEBAR: Personal Impact Dashboard -->
      <aside class="flex flex-col gap-6">
        <h2 class="font-headline-md text-2xl text-on-surface">Your Impact</h2>
        
        <div v-if="auth.isLoggedIn" class="bg-surface-container-high rounded-2xl border border-outline-variant shadow-lg p-6 flex flex-col gap-6">
          
          <!-- Hours Tracker -->
          <div class="text-center pb-6 border-b border-outline-variant/50">
            <p class="font-label-caps text-on-surface-variant tracking-wider uppercase mb-2">Verified Service Hours</p>
            <div class="inline-flex items-center justify-center w-24 h-24 rounded-full border-4 border-secondary/30 bg-surface relative">
              <span class="font-display-lg text-4xl font-extrabold text-secondary">{{ auth.user?.totalLoggedHours || 0 }}</span>
            </div>
            <p class="font-body-sm text-on-surface-variant mt-4 text-xs">
              Hours are officially logged once approved by the project organizer or an admin.
            </p>
          </div>

          <!-- Certificate Generator -->
          <div class="flex flex-col gap-3">
            <h3 class="font-body-base font-bold text-on-surface">Claim Certificate</h3>
            <p class="font-body-sm text-on-surface-variant text-sm mb-2">
              Generate a cryptographically signed document proving your community service contributions.
            </p>
            
            <button 
              @click="handleGenerateCertificate"
              :disabled="isGenerating || (auth.user?.totalLoggedHours || 0) === 0"
              class="w-full border border-secondary text-secondary hover:bg-secondary/10 px-4 py-3 rounded-lg font-bold transition-colors disabled:opacity-50 disabled:hover:bg-transparent flex items-center justify-center gap-2"
            >
              <span class="material-symbols-outlined">workspace_premium</span>
              {{ isGenerating ? 'Generating...' : 'Issue Digital Certificate' }}
            </button>
            
            <p v-if="message" :class="['text-xs text-center mt-2', certificateIsError ? 'text-error' : 'text-secondary']">
              {{ message }}
            </p>
          </div>

          <!-- Certificate Display -->
          <div v-if="certificateHash" class="bg-surface p-4 rounded-xl border border-secondary/30 flex flex-col gap-2">
            <p class="font-label-caps text-secondary text-[10px] uppercase">Secure SHA-256 Hash</p>
            <p class="font-mono-data text-on-surface text-xs break-all">{{ certificateHash }}</p>
          </div>

        </div>

        <div v-else class="bg-surface-container p-6 rounded-2xl border border-outline-variant text-center flex flex-col items-center gap-4">
          <span class="material-symbols-outlined text-on-surface-variant text-4xl">account_circle</span>
          <p class="font-body-sm text-on-surface-variant">Sign in to track your volunteer hours and claim your digital certificates.</p>
          <router-link to="/login" class="bg-primary/10 text-primary hover:bg-primary/20 px-6 py-2 rounded-lg font-bold transition-colors">
            Sign In
          </router-link>
        </div>
      </aside>

    </div>
  </div>
</template>
