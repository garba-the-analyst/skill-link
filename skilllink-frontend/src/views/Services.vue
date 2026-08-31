<script setup lang="ts">
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useMarketplaceStore } from '../stores/marketplace';
import { useAuthStore } from '../stores/auth';

const router = useRouter();
const marketplace = useMarketplaceStore();
const auth = useAuthStore();

onMounted(async () => {
  await marketplace.fetchFeed();
});

const formatMoney = (cents: number) => {
  if (!Number.isFinite(cents)) return '₦—';
  return `₦${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
};

async function initiateBooking(listingId: string, title: string, hourlyRateCents: number) {
  if (!auth.isLoggedIn) {
    router.push('/login');
    return;
  }

  const confirmed = window.confirm(`Book "${title}" for ${formatMoney(hourlyRateCents)}? This locks the amount in escrow until the job is verified complete.`);
  if (!confirmed) return;

  try {
    // Creates the booking in the backend and locks the funds
    const booking = await marketplace.createBooking(listingId, hourlyRateCents);
    
    // Route the user to the secure handshake page
    router.push(`/bookings/${booking.id}`);
  } catch (err: any) {
    alert(err?.response?.data?.message || 'Failed to initiate booking.');
  }
}
</script>

<template>
  <div class="max-w-7xl mx-auto px-4 py-10 flex flex-col gap-10">
    
    <!-- Page Header -->
    <header class="flex flex-col gap-2 border-b border-outline-variant pb-6">
      <div class="flex items-center gap-3">
        <span class="material-symbols-outlined text-primary text-4xl">work</span>
        <h1 class="font-display-lg text-4xl font-extrabold text-on-surface">Hire Local Talent</h1>
      </div>
      <p class="font-body-base text-on-surface-variant max-w-3xl text-lg mt-2">
        Find and book verified peers for technical gigs, tutoring, and local services around the Minna campus. Payments are secured in escrow until the job is done.
      </p>
    </header>

    <!-- Services Grid -->
    <section>
      <div v-if="marketplace.listings.length" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div 
          v-for="listing in marketplace.listings" 
          :key="listing.id"
          class="bg-surface-container-highest p-6 rounded-2xl border border-outline-variant hover:border-primary transition-all shadow-md flex flex-col gap-4 relative overflow-hidden group"
        >
          <!-- Decorative Accent -->
          <div class="absolute left-0 top-0 right-0 h-1.5 bg-primary group-hover:bg-primary-container transition-colors"></div>
          
          <div class="flex flex-col gap-1 mt-2">
            <h3 class="font-body-base font-bold text-on-surface text-xl line-clamp-1" :title="listing.title">
              {{ listing.title }}
            </h3>
            <p class="font-body-sm text-on-surface-variant flex items-center gap-1">
              <span class="material-symbols-outlined text-[16px]">person</span>
              {{ listing.provider?.displayName || '—' }}
            </p>
          </div>
          
          <p class="font-body-sm text-on-surface-variant line-clamp-3 flex-grow">
            {{ listing.bio }}
          </p>
          
          <div class="flex flex-wrap gap-2 mt-2">
            <span 
              v-for="skill in listing.skills" 
              :key="skill.id"
              class="bg-surface-container text-on-surface border border-outline-variant font-label-caps px-2 py-1 rounded-md text-[10px] uppercase"
            >
              {{ skill.name }}
            </span>
          </div>

          <div class="mt-4 pt-4 border-t border-outline-variant/40 flex items-center justify-between">
            <div class="flex flex-col">
              <span class="font-mono-data text-xl font-extrabold text-primary">{{ formatMoney(listing.hourlyRateCents) }}</span>
              <span class="font-label-caps text-on-surface-variant uppercase text-[10px]">per hour</span>
            </div>
            
            <button 
              @click="initiateBooking(listing.id, listing.title, listing.hourlyRateCents)"
              class="bg-primary text-on-primary hover:bg-primary-container px-5 py-2.5 rounded-lg font-bold transition-colors text-sm shadow-sm"
            >
              Book Now
            </button>
          </div>
        </div>
      </div>
      
      <div v-else class="bg-surface-container p-10 rounded-2xl border border-outline-variant border-dashed text-center flex flex-col items-center gap-4">
        <span class="material-symbols-outlined text-outline text-4xl">search_off</span>
        <p class="font-body-sm text-on-surface-variant">No paid services have been listed yet.</p>
        <router-link v-if="auth.isPaidProvider" to="/profile" class="text-primary hover:underline font-bold">
          Be the first to list a service
        </router-link>
      </div>
    </section>
  </div>
</template>