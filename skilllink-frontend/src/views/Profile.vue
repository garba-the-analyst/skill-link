<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { useMarketplaceStore } from '../stores/marketplace';
import { useVolunteerStore } from '../stores/volunteer';
import client from '../api/client';

const router = useRouter();
const auth = useAuthStore();
const marketplace = useMarketplaceStore();
const volunteer = useVolunteerStore();

const isUpdating = ref(false);
const message = ref('');

// UI Toggles for Forms
const showListingForm = ref(false);
const showOppForm = ref(false);

// Form States
const listingForm = ref({ title: '', bio: '', rate: '', skills: '' });
const oppForm = ref({ title: '', description: '', category: 'Education', location: '', requiredHours: '' });

const formatMoney = (cents: number) => `₦${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

const STATUS_LABELS: Record<string, string> = {
  LOCKED: 'Funds Locked',
  IN_PROGRESS: 'In Progress',
  RELEASE_READY: 'Ready to Confirm',
  COMPLETED: 'Completed',
};

onMounted(async () => {
  if (!auth.isLoggedIn) {
    router.push('/login');
    return;
  }
  await marketplace.fetchMyBookings();
});

async function saveProfileToggles() {
  message.value = '';
  isUpdating.value = true;
  try {
    const { data } = await client.put('/auth/profile/toggles', {
      isPaidProvider: auth.user?.isPaidProvider,
      isVolunteer: auth.user?.isVolunteer,
    });
    auth.user = data;
    message.value = 'Profile updated successfully.';
  } catch (err: any) {
    message.value = 'Failed to update profile toggles.';
  } finally {
    isUpdating.value = false;
  }
}

async function submitListing() {
  try {
    const rateInCents = Math.round(parseFloat(listingForm.value.rate) * 100);
    const skillsArray = listingForm.value.skills.split(',').map(s => s.trim()).filter(Boolean);
    
    await marketplace.createListing({
      title: listingForm.value.title,
      bio: listingForm.value.bio,
      hourlyRateCents: rateInCents,
      skills: skillsArray
    });
    
    showListingForm.value = false;
    alert('Listing published to the marketplace!');
    listingForm.value = { title: '', bio: '', rate: '', skills: '' }; // Reset
  } catch (err: any) {
    alert(err?.response?.data?.message || 'Failed to create listing.');
  }
}

async function submitOpportunity() {
  try {
    await volunteer.createOpportunity({
      title: oppForm.value.title,
      description: oppForm.value.description,
      category: oppForm.value.category,
      location: oppForm.value.location,
      requiredHours: parseInt(oppForm.value.requiredHours)
    });
    
    showOppForm.value = false;
    alert('Civic project published to the volunteer board!');
    oppForm.value = { title: '', description: '', category: 'Education', location: '', requiredHours: '' }; // Reset
  } catch (err: any) {
    alert(err?.response?.data?.message || 'Failed to create opportunity.');
  }
}

function handleLogout() {
  auth.logout();
  router.push('/');
}
</script>

<template>
  <div v-if="auth.user" class="max-w-4xl mx-auto px-4 py-10 flex flex-col gap-8">
    
    <!-- Profile Header -->
    <header class="bg-surface-container-highest rounded-2xl p-8 border border-outline-variant shadow-sm flex flex-col md:flex-row gap-6 items-center md:items-start justify-between">
      <div class="flex items-center gap-6">
        <div class="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center border-2 border-primary shrink-0">
          <span class="text-3xl font-extrabold text-primary">{{ auth.user.displayName.charAt(0) }}</span>
        </div>
        <div>
          <h1 class="font-display-lg text-3xl font-extrabold text-on-surface">{{ auth.user.displayName }}</h1>
          <p class="font-body-base text-on-surface-variant">{{ auth.user.email }}</p>
          <div class="flex gap-2 mt-2">
            <span class="bg-surface-container-low border border-outline-variant text-on-surface-variant font-label-caps px-2 py-1 rounded text-[10px] uppercase">
              {{ auth.user.profileType }}
            </span>
            <span :class="['font-label-caps px-2 py-1 rounded text-[10px] uppercase border', auth.user.identityStatus === 'VERIFIED' ? 'bg-secondary/10 text-secondary border-secondary/20' : 'bg-surface-container text-on-surface-variant border-outline-variant']">
              Identity: {{ auth.user.identityStatus }}
            </span>
          </div>
          <div v-if="auth.user.isPaidProvider" class="mt-3 flex items-center gap-2">
            <span class="font-label-caps text-on-surface-variant uppercase text-[10px]">Available balance</span>
            <span class="font-mono-data text-lg font-extrabold text-primary">{{ formatMoney(auth.user.availableCents) }}</span>
          </div>
        </div>
      </div>
      <button @click="handleLogout" class="bg-surface-container border border-error/50 text-error hover:bg-error/10 px-4 py-2 rounded-lg font-bold transition-colors text-sm">
        Sign Out
      </button>
    </header>

    <!-- Dual-Mode Configuration -->
    <section class="bg-surface-container-high rounded-2xl p-8 border border-outline-variant shadow-sm flex flex-col gap-6">
      <h2 class="font-headline-md text-2xl text-on-surface border-b border-outline-variant pb-2">Participation Settings</h2>
      
      <div class="flex flex-col gap-4">
        <label class="flex items-start gap-4 p-4 rounded-xl border border-outline-variant bg-surface cursor-pointer hover:border-primary transition-colors">
          <input v-model="auth.user.isPaidProvider" type="checkbox" class="mt-1 w-5 h-5 accent-primary" />
          <div class="flex flex-col">
            <span class="font-bold text-on-surface">Offer Paid Skills</span>
            <span class="text-on-surface-variant text-sm mt-1">Allow your profile to list technical skills and accept escrow bookings from peers.</span>
          </div>
        </label>

        <label class="flex items-start gap-4 p-4 rounded-xl border border-outline-variant bg-surface cursor-pointer hover:border-secondary transition-colors">
          <input v-model="auth.user.isVolunteer" type="checkbox" class="mt-1 w-5 h-5 accent-secondary" />
          <div class="flex flex-col">
            <span class="font-bold text-on-surface">Civic Volunteering</span>
            <span class="text-on-surface-variant text-sm mt-1">Enable your account to log community hours and earn cryptographic certificates.</span>
          </div>
        </label>
      </div>

      <div class="flex items-center gap-4 mt-2">
        <button @click="saveProfileToggles" :disabled="isUpdating" class="bg-primary text-on-primary hover:bg-primary-container px-6 py-2.5 rounded-lg font-bold transition-colors disabled:opacity-50">
          {{ isUpdating ? 'Saving...' : 'Save Settings' }}
        </button>
        <p v-if="message" class="text-sm text-secondary font-bold">{{ message }}</p>
      </div>
    </section>

    <!-- Content Creation Grids -->
    <section class="grid grid-cols-1 md:grid-cols-2 gap-6">
      
      <!-- PAID LISTING CARD -->
      <div v-if="auth.user.isPaidProvider" class="bg-surface-container p-6 rounded-2xl border border-primary/30 flex flex-col gap-4">
        <div v-if="!showListingForm" class="text-center flex flex-col items-center gap-4 py-4">
          <span class="material-symbols-outlined text-primary text-4xl">add_business</span>
          <h3 class="font-bold text-on-surface text-lg">List a Service</h3>
          <p class="text-sm text-on-surface-variant mb-2">Publish your skills to the campus directory to start earning.</p>
          <button @click="showListingForm = true" class="w-full bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 px-4 py-2 rounded-lg font-bold transition-colors">
            Create Listing
          </button>
        </div>

        <form v-else @submit.prevent="submitListing" class="flex flex-col gap-3">
          <div class="flex justify-between items-center border-b border-outline-variant pb-2 mb-2">
            <h3 class="font-bold text-primary">New Paid Service</h3>
            <button type="button" @click="showListingForm = false" class="text-on-surface-variant hover:text-error text-sm font-bold">Cancel</button>
          </div>
          <input v-model="listingForm.title" type="text" placeholder="Service Title (e.g., Python Tutoring)" required class="bg-surface border border-outline-variant rounded-lg px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none" />
          <textarea v-model="listingForm.bio" placeholder="Describe your service..." required rows="3" class="bg-surface border border-outline-variant rounded-lg px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none"></textarea>
          <input v-model="listingForm.rate" type="number" step="0.01" placeholder="Hourly Rate (₦)" required class="bg-surface border border-outline-variant rounded-lg px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none" />
          <input v-model="listingForm.skills" type="text" placeholder="Skills (comma separated)" required class="bg-surface border border-outline-variant rounded-lg px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none" />
          <button type="submit" class="bg-primary text-on-primary font-bold py-2 rounded-lg mt-2 hover:bg-primary-container transition-colors">
            Publish Listing
          </button>
        </form>
      </div>

      <!-- VOLUNTEER OPPORTUNITY CARD -->
      <div v-if="auth.user.profileType === 'ORGANIZATION'" class="bg-surface-container p-6 rounded-2xl border border-secondary/30 flex flex-col gap-4">
        <div v-if="!showOppForm" class="text-center flex flex-col items-center gap-4 py-4">
          <span class="material-symbols-outlined text-secondary text-4xl">campaign</span>
          <h3 class="font-bold text-on-surface text-lg">Post Civic Project</h3>
          <p class="text-sm text-on-surface-variant mb-2">Recruit volunteers for your next campus clean-up or mentorship drive.</p>
          <button @click="showOppForm = true" class="w-full bg-secondary/10 text-secondary hover:bg-secondary/20 border border-secondary/20 px-4 py-2 rounded-lg font-bold transition-colors">
            Create Opportunity
          </button>
        </div>

        <form v-else @submit.prevent="submitOpportunity" class="flex flex-col gap-3">
          <div class="flex justify-between items-center border-b border-outline-variant pb-2 mb-2">
            <h3 class="font-bold text-secondary">New Civic Project</h3>
            <button type="button" @click="showOppForm = false" class="text-on-surface-variant hover:text-error text-sm font-bold">Cancel</button>
          </div>
          <input v-model="oppForm.title" type="text" placeholder="Project Title" required class="bg-surface border border-outline-variant rounded-lg px-3 py-2 text-sm text-on-surface focus:border-secondary focus:outline-none" />
          <textarea v-model="oppForm.description" placeholder="Project details and expectations..." required rows="3" class="bg-surface border border-outline-variant rounded-lg px-3 py-2 text-sm text-on-surface focus:border-secondary focus:outline-none"></textarea>
          <div class="flex gap-2">
            <select v-model="oppForm.category" class="w-1/2 bg-surface border border-outline-variant rounded-lg px-3 py-2 text-sm text-on-surface focus:border-secondary focus:outline-none">
              <option value="Education">Education</option>
              <option value="Environmental">Environmental</option>
              <option value="Mentorship">Mentorship</option>
              <option value="Health">Health</option>
            </select>
            <input v-model="oppForm.requiredHours" type="number" placeholder="Target Hours" required class="w-1/2 bg-surface border border-outline-variant rounded-lg px-3 py-2 text-sm text-on-surface focus:border-secondary focus:outline-none" />
          </div>
          <input v-model="oppForm.location" type="text" placeholder="Location (e.g., Campus Library)" required class="bg-surface border border-outline-variant rounded-lg px-3 py-2 text-sm text-on-surface focus:border-secondary focus:outline-none" />
          <button type="submit" class="bg-secondary text-on-secondary font-bold py-2 rounded-lg mt-2 hover:bg-secondary-container transition-colors">
            Post Opportunity
          </button>
        </form>
      </div>

    </section>

    <!-- My Bookings -->
    <section class="bg-surface-container-high rounded-2xl p-8 border border-outline-variant shadow-sm flex flex-col gap-4">
      <h2 class="font-headline-md text-2xl text-on-surface border-b border-outline-variant pb-2">My Bookings</h2>

      <div v-if="marketplace.myBookings.length" class="flex flex-col gap-3">
        <router-link
          v-for="booking in marketplace.myBookings"
          :key="booking.id"
          :to="`/bookings/${booking.id}`"
          class="flex items-center justify-between gap-4 bg-surface p-4 rounded-xl border border-outline-variant hover:border-primary transition-colors"
        >
          <div>
            <p class="font-bold text-on-surface">{{ booking.listing.title }}</p>
            <p class="font-body-sm text-on-surface-variant">
              {{ booking.studentId === auth.user.id ? `with ${booking.provider.displayName}` : `booked by ${booking.student.displayName}` }}
            </p>
          </div>
          <div class="flex items-center gap-3 shrink-0">
            <span class="font-mono-data text-on-surface font-bold">{{ formatMoney(booking.amountCents) }}</span>
            <span :class="['font-label-caps px-2 py-1 rounded text-[10px] uppercase border', booking.status === 'COMPLETED' ? 'bg-secondary/10 text-secondary border-secondary/20' : 'bg-primary/10 text-primary border-primary/20']">
              {{ STATUS_LABELS[booking.status] }}
            </span>
          </div>
        </router-link>
      </div>
      <p v-else class="font-body-sm text-on-surface-variant">No bookings yet — browse the marketplace to hire someone, or list your own skills above.</p>
    </section>
  </div>
</template>