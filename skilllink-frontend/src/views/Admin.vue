<script setup lang="ts">
import { onMounted, ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { useAdminStore } from '../stores/admin';

const router = useRouter();
const auth = useAuthStore();
const admin = useAdminStore();

const isLoading = ref(true);
const loadError = ref('');
const verifyingId = ref<string | null>(null);

const formatMoney = (cents: number) => {
  if (!Number.isFinite(cents)) return '₦—';
  return `₦${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
};
const formatDate = (iso: string) => new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });

const maxMonthGross = computed(() => {
  const a = admin.analytics?.revenueByMonth;
  if (!a?.length) return 1;
  return Math.max(...a.map(r => r.grossCents), 1);
});
const maxProviderRevenue = computed(() => {
  const t = admin.analytics?.topProviders;
  if (!t?.length) return 1;
  return Math.max(...t.map(p => p.revenueCents), 1);
});

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
  if (!auth.isAdmin) {
    router.push('/');
    return;
  }

  try {
    await admin.fetchAll();
  } catch (err: any) {
    loadError.value = err?.response?.data?.message || 'Could not load platform activity.';
  } finally {
    isLoading.value = false;
  }
});

async function handleVerify(logId: string) {
  verifyingId.value = logId;
  try {
    await admin.verifyHourLog(logId);
  } catch (err: any) {
    alert(err?.response?.data?.message || 'Could not verify this log.');
  } finally {
    verifyingId.value = null;
  }
}
</script>

<template>
  <div class="max-w-7xl mx-auto px-4 py-10 flex flex-col gap-10">
    <header class="flex flex-col gap-2 border-b border-outline-variant pb-6">
      <div class="flex items-center gap-3">
        <span class="material-symbols-outlined text-primary text-4xl">admin_panel_settings</span>
        <h1 class="font-display-lg text-4xl font-extrabold text-on-surface">Admin Console</h1>
      </div>
      <p class="font-body-base text-on-surface-variant max-w-3xl text-lg mt-2">
        Every user, transaction, and volunteer submission on SkillLink, in one place.
      </p>
    </header>

    <div v-if="isLoading" class="font-body-sm text-on-surface-variant">Loading platform activity…</div>
    <div v-else-if="loadError" class="p-4 rounded-lg bg-error/10 text-error border border-error/30 font-bold text-center">
      {{ loadError }}
    </div>

    <template v-else>
      <!-- Stats -->
      <section v-if="admin.stats" class="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div class="bg-surface-container-highest p-5 rounded-2xl border border-outline-variant text-center">
          <p class="font-mono-data text-3xl font-extrabold text-primary">{{ admin.stats.userCount }}</p>
          <p class="font-label-caps text-on-surface-variant uppercase text-[10px] mt-1">Users</p>
        </div>
        <div class="bg-surface-container-highest p-5 rounded-2xl border border-outline-variant text-center">
          <p class="font-mono-data text-3xl font-extrabold text-primary">{{ admin.stats.listingCount }}</p>
          <p class="font-label-caps text-on-surface-variant uppercase text-[10px] mt-1">Listings</p>
        </div>
        <div class="bg-surface-container-highest p-5 rounded-2xl border border-outline-variant text-center">
          <p class="font-mono-data text-3xl font-extrabold text-primary">{{ admin.stats.activeBookingCount }}</p>
          <p class="font-label-caps text-on-surface-variant uppercase text-[10px] mt-1">Active Bookings</p>
        </div>
        <div class="bg-surface-container-highest p-5 rounded-2xl border border-outline-variant text-center">
          <p class="font-mono-data text-3xl font-extrabold text-secondary">{{ admin.stats.opportunityCount }}</p>
          <p class="font-label-caps text-on-surface-variant uppercase text-[10px] mt-1">Open Opportunities</p>
        </div>
        <div class="bg-surface-container-highest p-5 rounded-2xl border border-outline-variant text-center">
          <p class="font-mono-data text-3xl font-extrabold" :class="admin.stats.pendingHourLogCount ? 'text-error' : 'text-secondary'">{{ admin.stats.pendingHourLogCount }}</p>
          <p class="font-label-caps text-on-surface-variant uppercase text-[10px] mt-1">Pending Reviews</p>
        </div>
      </section>

      <!-- Analytics — transactions, activity, revenue -->
      <section v-if="admin.analytics" class="flex flex-col gap-6">
        <h2 class="font-headline-md text-2xl text-on-surface border-b border-outline-variant pb-2">Transactions & Analytics</h2>

        <!-- Revenue cards -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div class="bg-surface-container-high p-5 rounded-2xl border border-outline-variant">
            <p class="font-label-caps text-on-surface-variant uppercase text-[10px]">Gross Volume (Completed)</p>
            <p class="font-mono-data text-2xl font-extrabold text-primary mt-1">{{ formatMoney(admin.analytics.totalGrossCents) }}</p>
            <p class="font-body-sm text-on-surface-variant text-xs mt-1">{{ admin.analytics.recentActivity.filter(a=>a.type==='booking' && a.status==='COMPLETED').length }} completed bookings</p>
          </div>
          <div class="bg-surface-container-high p-5 rounded-2xl border border-outline-variant">
            <p class="font-label-caps text-on-surface-variant uppercase text-[10px]">Platform Fees (10%)</p>
            <p class="font-mono-data text-2xl font-extrabold text-secondary mt-1">{{ formatMoney(admin.analytics.totalFeesCents) }}</p>
            <p class="font-body-sm text-on-surface-variant text-xs mt-1">From completed bookings</p>
          </div>
          <div class="bg-surface-container-high p-5 rounded-2xl border border-outline-variant">
            <p class="font-label-caps text-on-surface-variant uppercase text-[10px]">Net Payouts to Providers</p>
            <p class="font-mono-data text-2xl font-extrabold text-on-surface mt-1">{{ formatMoney(admin.analytics.totalNetCents) }}</p>
            <p class="font-body-sm text-on-surface-variant text-xs mt-1">Credited to availableCents</p>
          </div>
          <div class="bg-surface-container-high p-5 rounded-2xl border border-outline-variant">
            <p class="font-label-caps text-on-surface-variant uppercase text-[10px]">Escrow Held (In-Flight)</p>
            <p class="font-mono-data text-2xl font-extrabold text-error mt-1">{{ formatMoney(admin.analytics.escrowHeldCents) }}</p>
            <p class="font-body-sm text-on-surface-variant text-xs mt-1">LOCKED / IN_PROGRESS / RELEASE_READY</p>
          </div>
        </div>

        <!-- Bookings by status + hour stats -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div class="bg-surface-container-high p-5 rounded-2xl border border-outline-variant flex flex-col gap-3">
            <h3 class="font-bold text-on-surface">Bookings by Status</h3>
            <div v-for="(count, status) in admin.analytics.bookingsByStatus" :key="status" class="flex items-center justify-between">
              <span class="font-label-caps text-on-surface-variant uppercase text-xs">{{ STATUS_LABELS[status] || status }}</span>
              <span class="font-mono-data font-bold text-on-surface">{{ count }}</span>
            </div>
            <div v-if="!Object.keys(admin.analytics.bookingsByStatus).length" class="font-body-sm text-on-surface-variant">No bookings yet.</div>
          </div>
          <div class="bg-surface-container-high p-5 rounded-2xl border border-outline-variant flex flex-col gap-3">
            <h3 class="font-bold text-on-surface">Volunteer Hours</h3>
            <div class="flex items-center justify-between"><span class="font-body-sm text-on-surface-variant">Total logs</span><span class="font-mono-data font-bold">{{ admin.analytics.hourStats.total }}</span></div>
            <div class="flex items-center justify-between"><span class="font-body-sm text-secondary">Verified</span><span class="font-mono-data font-bold text-secondary">{{ admin.analytics.hourStats.verified }}</span></div>
            <div class="flex items-center justify-between"><span class="font-body-sm text-error">Pending</span><span class="font-mono-data font-bold text-error">{{ admin.analytics.hourStats.pending }}</span></div>
          </div>
          <div class="bg-surface-container-high p-5 rounded-2xl border border-outline-variant flex flex-col gap-3">
            <h3 class="font-bold text-on-surface">Revenue Trend (Last 6 Months)</h3>
            <div class="flex flex-col gap-2">
              <div v-for="m in admin.analytics.revenueByMonth" :key="m.month" class="flex flex-col gap-1">
                <div class="flex justify-between text-xs"><span class="text-on-surface-variant">{{ m.month }}</span><span class="font-mono-data text-on-surface">{{ formatMoney(m.grossCents) }} · {{ m.bookings }} bookings</span></div>
                <div class="h-2 rounded bg-surface-container-low overflow-hidden border border-outline-variant/40"><div class="h-full bg-primary" :style="{ width: (m.grossCents / maxMonthGross * 100) + '%' }"></div></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Top providers + Recent activity -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div class="bg-surface-container-high p-5 rounded-2xl border border-outline-variant flex flex-col gap-3">
            <h3 class="font-bold text-on-surface">Top Providers by Revenue</h3>
            <div v-if="admin.analytics.topProviders.length" class="flex flex-col gap-2">
              <div v-for="p in admin.analytics.topProviders" :key="p.providerId" class="flex flex-col gap-1">
                <div class="flex justify-between text-sm"><span class="font-bold text-on-surface">{{ p.displayName }}</span><span class="font-mono-data text-primary">{{ formatMoney(p.revenueCents) }} · {{ p.bookings }} jobs</span></div>
                <div class="h-1.5 rounded bg-surface-container-low overflow-hidden"><div class="h-full bg-secondary" :style="{ width: (p.revenueCents / maxProviderRevenue * 100) + '%' }"></div></div>
              </div>
            </div>
            <div v-else class="font-body-sm text-on-surface-variant">No completed bookings yet.</div>
          </div>
          <div class="bg-surface-container-high p-5 rounded-2xl border border-outline-variant flex flex-col gap-3">
            <h3 class="font-bold text-on-surface">Recent Activity</h3>
            <div v-if="admin.analytics.recentActivity.length" class="flex flex-col gap-2 max-h-[320px] overflow-auto pr-1">
              <div v-for="a in admin.analytics.recentActivity" :key="a.id" class="flex justify-between gap-3 py-2 border-b border-outline-variant/30 last:border-0">
                <span class="font-body-sm text-on-surface text-sm leading-tight">{{ a.title }}</span>
                <span class="font-label-caps text-[10px] uppercase shrink-0" :class="a.status==='COMPLETED' || a.status==='VERIFIED' ? 'text-secondary' : a.status==='PENDING' ? 'text-error' : 'text-primary'">{{ a.status }}</span>
              </div>
            </div>
            <div v-else class="font-body-sm text-on-surface-variant">No activity yet.</div>
            <p class="font-body-sm text-on-surface-variant text-xs mt-1">Latest bookings + hour logs merged</p>
          </div>
        </div>
      </section>

      <!-- Pending hour log verification queue -->
      <section class="flex flex-col gap-4">
        <h2 class="font-headline-md text-2xl text-on-surface border-b border-outline-variant pb-2">Pending Hour Log Reviews</h2>
        <div v-if="admin.pendingHourLogs.length" class="flex flex-col gap-3">
          <div
            v-for="log in admin.pendingHourLogs"
            :key="log.id"
            class="flex flex-wrap items-center justify-between gap-3 bg-surface-container-high p-4 rounded-xl border border-outline-variant"
          >
            <div>
              <p class="font-bold text-on-surface">{{ log.volunteer.displayName }} <span class="font-normal text-on-surface-variant">logged</span> {{ log.hoursLogged }}h</p>
              <p class="font-body-sm text-on-surface-variant">for "{{ log.opportunity.title }}" · {{ log.volunteer.email }} · {{ formatDate(log.createdAt) }}</p>
            </div>
            <button
              :disabled="verifyingId === log.id"
              @click="handleVerify(log.id)"
              class="bg-secondary text-on-secondary hover:bg-secondary-container px-4 py-2 rounded-lg font-bold text-sm transition-colors disabled:opacity-50"
            >
              {{ verifyingId === log.id ? 'Verifying…' : 'Verify' }}
            </button>
          </div>
        </div>
        <p v-else class="font-body-sm text-on-surface-variant">Nothing waiting on review.</p>
      </section>

      <!-- All bookings -->
      <section class="flex flex-col gap-4">
        <h2 class="font-headline-md text-2xl text-on-surface border-b border-outline-variant pb-2">All Bookings</h2>
        <div class="overflow-x-auto rounded-xl border border-outline-variant">
          <table class="w-full text-sm text-left">
            <thead class="bg-surface-container-high text-on-surface-variant font-label-caps uppercase text-[10px]">
              <tr>
                <th class="px-4 py-3">Listing</th>
                <th class="px-4 py-3">Student</th>
                <th class="px-4 py-3">Provider</th>
                <th class="px-4 py-3">Amount</th>
                <th class="px-4 py-3">Status</th>
                <th class="px-4 py-3">Created</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="booking in admin.bookings" :key="booking.id" class="border-t border-outline-variant bg-surface-container-highest hover:bg-surface-container transition-colors">
                <td class="px-4 py-3">
                  <router-link :to="`/bookings/${booking.id}`" class="text-primary hover:underline font-bold">{{ booking.listing.title }}</router-link>
                </td>
                <td class="px-4 py-3 text-on-surface-variant">{{ booking.student.displayName }}</td>
                <td class="px-4 py-3 text-on-surface-variant">{{ booking.provider.displayName }}</td>
                <td class="px-4 py-3 font-mono-data text-on-surface">{{ formatMoney(booking.amountCents) }}</td>
                <td class="px-4 py-3">
                  <span :class="['font-label-caps px-2 py-1 rounded text-[10px] uppercase border', booking.status === 'COMPLETED' ? 'bg-secondary/10 text-secondary border-secondary/20' : 'bg-primary/10 text-primary border-primary/20']">
                    {{ STATUS_LABELS[booking.status] }}
                  </span>
                </td>
                <td class="px-4 py-3 text-on-surface-variant">{{ formatDate(booking.createdAt) }}</td>
              </tr>
              <tr v-if="!admin.bookings.length">
                <td colspan="6" class="px-4 py-6 text-center text-on-surface-variant">No bookings on the platform yet.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- All users -->
      <section class="flex flex-col gap-4">
        <h2 class="font-headline-md text-2xl text-on-surface border-b border-outline-variant pb-2">All Users</h2>
        <div class="overflow-x-auto rounded-xl border border-outline-variant">
          <table class="w-full text-sm text-left">
            <thead class="bg-surface-container-high text-on-surface-variant font-label-caps uppercase text-[10px]">
              <tr>
                <th class="px-4 py-3">Name</th>
                <th class="px-4 py-3">Email</th>
                <th class="px-4 py-3">Role</th>
                <th class="px-4 py-3">Type</th>
                <th class="px-4 py-3">Provider</th>
                <th class="px-4 py-3">Volunteer</th>
                <th class="px-4 py-3">Hours</th>
                <th class="px-4 py-3">Joined</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="u in admin.users" :key="u.id" class="border-t border-outline-variant bg-surface-container-highest hover:bg-surface-container transition-colors">
                <td class="px-4 py-3 font-bold text-on-surface">{{ u.displayName }}</td>
                <td class="px-4 py-3 text-on-surface-variant">{{ u.email }}</td>
                <td class="px-4 py-3 text-on-surface-variant">{{ u.role }}</td>
                <td class="px-4 py-3 text-on-surface-variant">{{ u.profileType }}</td>
                <td class="px-4 py-3">
                  <span v-if="u.isPaidProvider" class="material-symbols-outlined text-primary text-[18px]">check_circle</span>
                  <span v-else class="text-on-surface-variant">—</span>
                </td>
                <td class="px-4 py-3">
                  <span v-if="u.isVolunteer" class="material-symbols-outlined text-secondary text-[18px]">check_circle</span>
                  <span v-else class="text-on-surface-variant">—</span>
                </td>
                <td class="px-4 py-3 font-mono-data text-on-surface">{{ u.totalLoggedHours }}</td>
                <td class="px-4 py-3 text-on-surface-variant">{{ formatDate(u.createdAt) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </template>
  </div>
</template>
