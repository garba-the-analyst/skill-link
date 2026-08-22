<script setup lang="ts">
import { ref } from 'vue';

// Escrow lifecycle: LOCKED -> IN_PROGRESS -> RELEASE_READY -> COMPLETED
const props = defineProps<{
  bookingId: string;
  status: 'LOCKED' | 'IN_PROGRESS' | 'RELEASE_READY' | 'COMPLETED';
  isStudent: boolean;
  // Only set for the provider once the booking reaches RELEASE_READY —
  // the code they need to read out to the student.
  providerVisibleOtp?: string;
}>();

const emit = defineEmits<{
  (e: 'verifyOtp', code: string): void;
  (e: 'reportIssue'): void;
}>();

const otpInputs = ref(['', '', '', '', '', '']);

const submitOtp = () => {
  const code = otpInputs.value.join('');
  if (code.length === 6) {
    emit('verifyOtp', code);
  }
};

const STAGES = [
  { key: 'LOCKED', label: 'Payment secured', icon: 'lock' },
  { key: 'IN_PROGRESS', label: 'Job in progress', icon: 'construction' },
  { key: 'RELEASE_READY', label: 'Ready to confirm', icon: 'account_balance_wallet' },
  { key: 'COMPLETED', label: 'Paid out', icon: 'check_circle' },
] as const;

function stageIndex(status: string) {
  return STAGES.findIndex((s) => s.key === status);
}
</script>

<template>
  <div class="bg-surface-container-highest/80 backdrop-blur-md rounded-xl p-6 border border-outline-variant shadow-lg max-w-2xl w-full">
    <div class="flex items-center justify-between border-b border-outline-variant pb-4 mb-6">
      <h3 class="font-label-caps text-on-surface-variant tracking-wider">
        Status: <span class="text-secondary">{{ props.status.replace('_', ' ') }}</span>
      </h3>
      <span class="bg-surface-container text-on-surface px-2 py-1 rounded font-mono-data text-xs border border-outline-variant">
        Booking: {{ props.bookingId.slice(0, 8) }}…
      </span>
    </div>

    <!-- Visual Progress Indicator: 4 stages -->
    <div class="flex justify-between items-center mb-8 relative px-2">
      <div class="absolute left-6 right-6 top-4 h-0.5 bg-outline-variant/30 -z-10"></div>

      <div v-for="(stage, index) in STAGES" :key="stage.key" class="flex flex-col items-center gap-2 flex-1">
        <div
          :class="[
            'w-8 h-8 rounded-full flex items-center justify-center border-4 border-surface transition-all',
            index <= stageIndex(props.status) ? 'bg-secondary shadow-[0_0_10px_rgba(78,222,163,0.3)]' : 'bg-surface-container-high border-outline-variant'
          ]"
        >
          <span class="material-symbols-outlined text-[14px]" :class="index <= stageIndex(props.status) ? 'text-surface' : 'text-on-surface-variant'">{{ stage.icon }}</span>
        </div>
        <span class="font-label-caps text-[10px] text-on-surface-variant text-center">{{ stage.label }}</span>
      </div>
    </div>

    <!-- Student view: waiting for the provider to start/finish the job -->
    <div v-if="props.isStudent && (props.status === 'LOCKED' || props.status === 'IN_PROGRESS')" class="bg-surface-container-low rounded-lg p-6 border border-outline-variant flex flex-col items-center gap-2 text-center">
      <span class="material-symbols-outlined text-on-surface-variant text-3xl">hourglass_top</span>
      <p class="font-body-sm text-on-surface-variant max-w-sm">
        {{ props.status === 'LOCKED' ? 'Your payment is locked and waiting for the provider to start the job.' : 'The provider has started the job. Once it’s finished, they’ll share a 6-digit code with you here to release payment.' }}
      </p>
    </div>

    <!-- Student view: 6-digit code entry, once the provider has marked the job done -->
    <div v-else-if="props.isStudent && props.status === 'RELEASE_READY'" class="bg-surface-container-low rounded-lg p-6 border border-primary/30 flex flex-col items-center gap-4">
      <p class="font-body-sm text-on-surface-variant text-center max-w-sm">
        Enter the 6-digit code your provider shared with you to confirm the work is done and release the payment.
      </p>

      <div class="flex gap-2">
        <input
          v-for="(digit, index) in otpInputs"
          :key="index"
          v-model="otpInputs[index]"
          maxlength="1"
          type="text"
          inputmode="numeric"
          class="w-12 h-14 bg-surface-container border border-outline-variant rounded-md text-center font-mono-data text-xl text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-[0_0_8px_rgba(99,102,241,0.1)] transition-all"
        />
      </div>

      <button
        @click="submitOtp"
        class="w-full mt-2 bg-secondary/10 hover:bg-secondary/20 text-secondary border border-secondary transition-all font-body-base font-semibold py-3 rounded-lg flex items-center justify-center gap-2"
      >
        <span class="material-symbols-outlined">fingerprint</span> Confirm and release payment
      </button>

      <button @click="emit('reportIssue')" class="font-body-sm text-on-surface-variant underline">
        Something's not right
      </button>
    </div>

    <!-- Provider view: share the code, once they've marked the job done -->
    <div v-else-if="!props.isStudent && props.status === 'RELEASE_READY'" class="bg-surface-container-low rounded-lg p-6 border border-primary/30 flex flex-col items-center gap-3 text-center">
      <p class="font-body-sm text-on-surface-variant max-w-sm">
        Share this code with your client to confirm the job is done. They'll enter it on their end to release your payment.
      </p>
      <div class="font-mono-data text-3xl font-extrabold text-primary tracking-[0.3em]">{{ props.providerVisibleOtp }}</div>
    </div>

    <!-- Provider view: job locked, hasn't started yet -->
    <div v-else-if="!props.isStudent && props.status === 'LOCKED'" class="bg-surface-container-low rounded-lg p-6 border border-outline-variant flex flex-col items-center gap-2 text-center">
      <span class="material-symbols-outlined text-on-surface-variant text-3xl">play_circle</span>
      <p class="font-body-sm text-on-surface-variant max-w-sm">Funds are locked and waiting on you. Mark the job as started when you begin.</p>
    </div>

    <!-- Provider view: job in progress -->
    <div v-else-if="!props.isStudent && props.status === 'IN_PROGRESS'" class="bg-surface-container-low rounded-lg p-6 border border-outline-variant flex flex-col items-center gap-2 text-center">
      <span class="material-symbols-outlined text-on-surface-variant text-3xl">construction</span>
      <p class="font-body-sm text-on-surface-variant max-w-sm">Job in progress. Mark it complete when you're done to generate the client's confirmation code.</p>
    </div>

    <!-- Completed -->
    <div v-else-if="props.status === 'COMPLETED'" class="bg-secondary/10 rounded-lg p-6 border border-secondary/30 flex flex-col items-center gap-2 text-center">
      <span class="material-symbols-outlined text-secondary text-3xl">check_circle</span>
      <p class="font-body-sm text-secondary font-semibold">This booking is complete and payment has been released.</p>
    </div>
  </div>
</template>
