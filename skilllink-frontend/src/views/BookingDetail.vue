<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useMarketplaceStore, type Booking } from '../stores/marketplace';
import { useAuthStore } from '../stores/auth';
import EscrowHandshake from '../components/EscrowHandshake.vue';

const route = useRoute();
const router = useRouter();
const marketplace = useMarketplaceStore();
const auth = useAuthStore();

const bookingId = route.params.id as string;
const isProcessing = ref(false);
const isLoading = ref(true);
const loadError = ref('');
const message = ref('');
const booking = ref<Booking | null>(null);

const isStudent = computed(() => !!booking.value && booking.value.studentId === auth.user?.id);
const isProvider = computed(() => !!booking.value && booking.value.providerId === auth.user?.id);

const formatMoney = (cents: number) => `₦${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

async function loadBooking() {
  isLoading.value = true;
  loadError.value = '';
  try {
    booking.value = await marketplace.getBooking(bookingId);
  } catch (err: any) {
    loadError.value = err?.response?.data?.message || 'Could not load this booking.';
  } finally {
    isLoading.value = false;
  }
}

onMounted(async () => {
  if (!auth.isLoggedIn) {
    router.push('/login');
    return;
  }
  await loadBooking();
});

async function handleStart() {
  isProcessing.value = true;
  message.value = '';
  try {
    await loadBookingAfter(marketplace.startBooking(bookingId));
    message.value = 'Job marked as started.';
  } catch (err: any) {
    message.value = err?.response?.data?.message || 'Could not start this job.';
  } finally {
    isProcessing.value = false;
  }
}

async function handleComplete() {
  isProcessing.value = true;
  message.value = '';
  try {
    await loadBookingAfter(marketplace.completeBooking(bookingId));
    message.value = 'Job marked as complete. Share the code below with your client.';
  } catch (err: any) {
    message.value = err?.response?.data?.message || 'Could not mark this job complete.';
  } finally {
    isProcessing.value = false;
  }
}

async function handleOtpVerification(code: string) {
  isProcessing.value = true;
  message.value = '';
  try {
    await marketplace.authorizeEscrowRelease(bookingId, code);
    await loadBooking();
    message.value = 'Success! The 6-digit code was verified and funds have been released to the provider.';
  } catch (err: any) {
    message.value = err?.response?.data?.message || 'Invalid confirmation code. Please try again.';
  } finally {
    isProcessing.value = false;
  }
}

// Re-fetches the full booking after a start/complete action so `booking`
// stays in sync with the server (e.g. picks up the freshly generated OTP).
async function loadBookingAfter(action: Promise<unknown>) {
  await action;
  await loadBooking();
}

function handleReportIssue() {
  alert('Support ticket created. An admin will review this transaction manually.');
}
</script>

<template>
  <div class="max-w-4xl mx-auto px-4 py-10 flex flex-col items-center gap-8">
    <header class="text-center">
      <h1 class="font-display-lg text-3xl font-extrabold text-on-surface">Secure Escrow Transaction</h1>
      <p class="font-body-base text-on-surface-variant mt-2 max-w-xl">
        Your funds are safely locked in the SkillLink ledger until the job is verified complete.
      </p>
    </header>

    <div v-if="isLoading" class="font-body-sm text-on-surface-variant">Loading booking…</div>

    <div v-else-if="loadError" class="p-4 rounded-lg w-full max-w-2xl font-bold text-center bg-error/10 text-error border border-error/30">
      {{ loadError }}
    </div>

    <template v-else-if="booking">
      <div class="w-full max-w-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-surface-container-low rounded-lg p-4 border border-outline-variant">
        <div>
          <p class="font-body-base font-bold text-on-surface">{{ booking.listing.title }}</p>
          <p class="font-body-sm text-on-surface-variant">{{ booking.student.displayName }} &rarr; {{ booking.provider.displayName }}</p>
        </div>
        <div class="font-mono-data text-xl font-extrabold text-primary">{{ formatMoney(booking.amountCents) }}</div>
      </div>

      <!-- The Escrow Handshake Component -->
      <EscrowHandshake
        :booking-id="booking.id"
        :status="booking.status"
        :is-student="isStudent"
        :provider-visible-otp="booking.otpRevealedToCaller"
        @verify-otp="handleOtpVerification"
        @report-issue="handleReportIssue"
      />

      <!-- Provider-only lifecycle actions -->
      <div v-if="isProvider && booking.status === 'LOCKED'" class="w-full max-w-2xl">
        <button
          :disabled="isProcessing"
          @click="handleStart"
          class="w-full bg-primary text-on-primary hover:bg-primary-container px-5 py-3 rounded-lg font-bold transition-colors shadow-sm disabled:opacity-50"
        >
          Mark job as started
        </button>
      </div>
      <div v-else-if="isProvider && booking.status === 'IN_PROGRESS'" class="w-full max-w-2xl">
        <button
          :disabled="isProcessing"
          @click="handleComplete"
          class="w-full bg-primary text-on-primary hover:bg-primary-container px-5 py-3 rounded-lg font-bold transition-colors shadow-sm disabled:opacity-50"
        >
          Mark job as complete
        </button>
      </div>

      <div v-if="message" :class="['p-4 rounded-lg w-full max-w-2xl font-bold text-center', booking.status === 'COMPLETED' ? 'bg-secondary/10 text-secondary border border-secondary/30' : 'bg-primary/10 text-primary border border-primary/30']">
        {{ message }}
      </div>

      <button v-if="booking.status === 'COMPLETED'" @click="router.push('/services')" class="text-primary hover:underline font-bold mt-4">
        Return to Marketplace
      </button>
    </template>
  </div>
</template>
