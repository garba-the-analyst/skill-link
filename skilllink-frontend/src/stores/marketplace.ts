// skilllink-frontend/src/stores/marketplace.ts
import { defineStore } from 'pinia';
import { ref } from 'vue';
import client from '../api/client';

export interface Listing {
  id: string;
  title: string;
  bio: string;
  hourlyRateCents: number;
  providerId: string;
  provider?: { displayName: string };
  skills: { id: string; name: string }[];
}

// Escrow lifecycle: LOCKED -> IN_PROGRESS -> RELEASE_READY -> COMPLETED
export interface Booking {
  id: string;
  status: 'LOCKED' | 'IN_PROGRESS' | 'RELEASE_READY' | 'COMPLETED';
  amountCents: number;
  escrowFeeCents: number;
  studentId: string;
  providerId: string;
  listing: { id: string; title: string };
  student: { id: string; displayName: string };
  provider: { id: string; displayName: string };
  otpRevealedToCaller?: string; // Only populated for the provider once RELEASE_READY
  createdAt: string;
  completedAt: string | null;
}

export const useMarketplaceStore = defineStore('marketplace', () => {
  const listings = ref<Listing[]>([]);
  const myBookings = ref<Booking[]>([]);

  async function fetchFeed() {
    const { data } = await client.get('/marketplace/feed');
    listings.value = data;
  }

  async function createListing(payload: { title: string; bio: string; hourlyRateCents: number; skills: string[] }) {
    const { data } = await client.post('/marketplace/listings', payload);
    await fetchFeed(); // Refresh the feed after creating
    return data;
  }

  async function createBooking(listingId: string, amountCents: number) {
    const { data } = await client.post('/escrow/bookings', { listingId, amountCents });
    return data;
  }

  async function fetchMyBookings() {
    const { data } = await client.get('/escrow/bookings/mine');
    myBookings.value = data;
  }

  async function getBooking(bookingId: string): Promise<Booking> {
    const { data } = await client.get(`/escrow/bookings/${bookingId}`);
    return data;
  }

  // Provider marks the job started: LOCKED -> IN_PROGRESS
  async function startBooking(bookingId: string) {
    const { data } = await client.post(`/escrow/bookings/${bookingId}/start`);
    return data;
  }

  // Provider marks the job done: IN_PROGRESS -> RELEASE_READY (generates the OTP)
  async function completeBooking(bookingId: string) {
    const { data } = await client.post(`/escrow/bookings/${bookingId}/complete`);
    return data;
  }

  // Student submits the OTP: RELEASE_READY -> COMPLETED
  async function authorizeEscrowRelease(bookingId: string, otp: string) {
    const { data } = await client.post(`/escrow/bookings/${bookingId}/release`, { otp });
    return data;
  }

  return {
    listings,
    myBookings,
    fetchFeed,
    createListing,
    createBooking,
    fetchMyBookings,
    getBooking,
    startBooking,
    completeBooking,
    authorizeEscrowRelease
  };
});
