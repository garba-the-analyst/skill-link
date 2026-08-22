<script setup lang="ts">
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { useMarketplaceStore } from '../stores/marketplace';
import { useVolunteerStore } from '../stores/volunteer';

const router = useRouter();
const auth = useAuthStore();
const marketplace = useMarketplaceStore();
const volunteer = useVolunteerStore();

onMounted(async () => {
  // Fetch both the paid gigs feed and the volunteer opportunities on page load
  await Promise.all([
    marketplace.fetchFeed(),
    volunteer.fetchOpportunities()
  ]);
});

// Helper function to format integer cents to standard currency format (₦)
const formatMoney = (cents: number) => {
  return `₦${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
};
</script>

<template>
  <div class="max-w-7xl mx-auto px-4 py-10 flex flex-col gap-10">
    
    <!-- Dashboard Header -->
    <header class="bg-surface-container-highest rounded-2xl p-8 border border-outline-variant shadow-lg flex flex-col md:flex-row justify-between items-center gap-6">
      <div class="space-y-2">
        <h1 class="font-display-lg text-3xl font-extrabold text-on-surface">
          Welcome to SkillLink
        </h1>
        <p class="font-body-base text-on-surface-variant max-w-2xl">
          The unified community platform for Newgate University Minna. Hire verified local student talent for paid gigs, or give back by joining ongoing civic volunteer initiatives.
        </p>
      </div>
      
      <!-- Show personalized stats if logged in -->
      <div v-if="auth.isLoggedIn" class="flex gap-4 shrink-0">
        <div class="bg-surface-container-low px-4 py-2 rounded-lg border border-outline-variant text-center">
          <p class="font-label-caps text-on-surface-variant">Civic Hours</p>
          <p class="font-mono-data text-secondary font-bold text-xl">{{ auth.user?.totalLoggedHours }}</p>
        </div>
      </div>
      <div v-else class="shrink-0">
        <button @click="router.push('/login')" class="bg-primary text-on-primary font-bold px-6 py-3 rounded-lg hover:bg-primary-container transition-colors">
          Sign In to Participate
        </button>
      </div>
    </header>

    <!-- Dual-Column Layout -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
      
      <!-- COLUMN 1: Paid Skills Marketplace -->
      <section class="flex flex-col gap-4">
        <div class="flex items-center justify-between border-b border-outline-variant pb-2">
          <h2 class="font-headline-md text-2xl text-on-surface flex items-center gap-2">
            <span class="material-symbols-outlined text-primary">work</span>
            Hire Local Talent
          </h2>
          <span class="font-label-caps text-primary bg-primary/10 px-3 py-1 rounded-full">Paid Gigs</span>
        </div>

        <div v-if="marketplace.listings.length" class="flex flex-col gap-4">
          <div 
            v-for="listing in marketplace.listings" 
            :key="listing.id"
            class="bg-surface-container-high p-5 rounded-xl border border-outline-variant hover:border-primary transition-colors shadow-md flex flex-col gap-3"
          >
            <div class="flex justify-between items-start">
              <div>
                <h3 class="font-body-base font-bold text-on-surface">{{ listing.title }}</h3>
                <p class="font-body-sm text-on-surface-variant mt-1">by {{ listing.provider?.displayName }}</p>
              </div>
              <div class="text-right">
                <span class="font-mono-data text-lg font-bold text-primary">{{ formatMoney(listing.hourlyRateCents) }}</span>
                <p class="font-label-caps text-on-surface-variant uppercase">per hour</p>
              </div>
            </div>
            
            <p class="font-body-sm text-on-surface-variant line-clamp-2">{{ listing.bio }}</p>
            
            <div class="flex flex-wrap gap-2 mt-2">
              <span 
                v-for="skill in listing.skills" 
                :key="skill.id"
                class="bg-surface-container text-on-surface-variant border border-outline-variant font-label-caps px-2 py-1 rounded-md text-[10px] uppercase"
              >
                {{ skill.name }}
              </span>
            </div>

            <div class="mt-2 pt-3 border-t border-outline-variant/50 flex justify-end">
              <button @click="router.push('/services')" class="bg-transparent border border-primary text-primary hover:bg-primary/10 px-4 py-2 rounded-lg font-bold text-sm transition-colors">
                Book Provider
              </button>
            </div>
          </div>
        </div>
        
        <div v-else class="bg-surface-container p-8 rounded-xl border border-outline-variant border-dashed text-center">
          <p class="font-body-sm text-on-surface-variant">No paid services listed yet.</p>
        </div>
      </section>

      <!-- COLUMN 2: Civic Volunteer Board -->
      <section class="flex flex-col gap-4">
        <div class="flex items-center justify-between border-b border-outline-variant pb-2">
          <h2 class="font-headline-md text-2xl text-on-surface flex items-center gap-2">
            <span class="material-symbols-outlined text-secondary">volunteer_activism</span>
            Civic Opportunities
          </h2>
          <span class="font-label-caps text-secondary bg-secondary/10 px-3 py-1 rounded-full">Give Back</span>
        </div>

        <div v-if="volunteer.opportunities.length" class="flex flex-col gap-4">
          <div 
            v-for="opp in volunteer.opportunities" 
            :key="opp.id"
            class="bg-surface-container-high p-5 rounded-xl border border-outline-variant hover:border-secondary transition-colors shadow-md flex flex-col gap-3 relative overflow-hidden"
          >
            <!-- Decorative Accent line for civic gigs -->
            <div class="absolute left-0 top-0 bottom-0 w-1 bg-secondary"></div>
            
            <div class="flex justify-between items-start pl-2">
              <div>
                <h3 class="font-body-base font-bold text-on-surface">{{ opp.title }}</h3>
                <p class="font-body-sm text-on-surface-variant mt-1">Hosted by {{ opp.creator?.displayName }}</p>
              </div>
              <div class="text-right">
                <span class="font-mono-data text-lg font-bold text-secondary">{{ opp.requiredHours }}</span>
                <p class="font-label-caps text-on-surface-variant uppercase">Hours</p>
              </div>
            </div>
            
            <p class="font-body-sm text-on-surface-variant line-clamp-2 pl-2">{{ opp.description }}</p>
            
            <div class="flex flex-wrap gap-2 mt-2 pl-2">
              <span class="bg-surface-container text-secondary border border-secondary/30 font-label-caps px-2 py-1 rounded-md text-[10px] uppercase flex items-center gap-1">
                <span class="material-symbols-outlined text-[12px]">category</span> {{ opp.category }}
              </span>
              <span class="bg-surface-container text-on-surface-variant border border-outline-variant font-label-caps px-2 py-1 rounded-md text-[10px] uppercase flex items-center gap-1">
                <span class="material-symbols-outlined text-[12px]">location_on</span> {{ opp.location }}
              </span>
            </div>

            <div class="mt-2 pt-3 border-t border-outline-variant/50 flex justify-end">
              <button @click="router.push('/volunteer')" class="bg-secondary text-on-secondary hover:bg-secondary-container px-4 py-2 rounded-lg font-bold text-sm transition-colors">
                Volunteer Now
              </button>
            </div>
          </div>
        </div>
        
        <div v-else class="bg-surface-container p-8 rounded-xl border border-outline-variant border-dashed text-center">
          <p class="font-body-sm text-on-surface-variant">No volunteer opportunities posted yet.</p>
        </div>
      </section>

    </div>
  </div>
</template>