// skilllink-frontend/src/stores/admin.ts
import { defineStore } from 'pinia';
import { ref } from 'vue';
import client from '../api/client';
import type { Booking } from './marketplace';

export interface AdminUserRow {
  id: string;
  displayName: string;
  email: string;
  role: string;
  profileType: 'INDIVIDUAL' | 'ORGANIZATION';
  isPaidProvider: boolean;
  isVolunteer: boolean;
  identityStatus: string;
  professionalStatus: string;
  totalLoggedHours: number;
  createdAt: string;
}

export interface AdminStats {
  userCount: number;
  listingCount: number;
  activeBookingCount: number;
  pendingHourLogCount: number;
  opportunityCount: number;
}

export interface AdminAnalytics {
  totalUsers: number;
  totalGrossCents: number;
  totalFeesCents: number;
  totalNetCents: number;
  escrowHeldCents: number;
  bookingsByStatus: Record<string, number>;
  revenueByMonth: Array<{ month: string; bookings: number; grossCents: number; feesCents: number }>;
  topProviders: Array<{ providerId: string; displayName: string; bookings: number; revenueCents: number }>;
  recentActivity: Array<{ type: 'booking' | 'hour_log'; id: string; title: string; amountCents: number | null; status: string; createdAt: string }>;
  hourStats: { total: number; verified: number; pending: number };
}

export interface PendingHourLog {
  id: string;
  hoursLogged: number;
  createdAt: string;
  volunteer: { id: string; displayName: string; email: string };
  opportunity: { id: string; title: string };
}

// Backs the SUPER_ADMIN-only dashboard — the backend rejects every one of
// these calls unless the caller's role is SUPER_ADMIN (see RolesGuard).
export const useAdminStore = defineStore('admin', () => {
  const users = ref<AdminUserRow[]>([]);
  const bookings = ref<Booking[]>([]);
  const stats = ref<AdminStats | null>(null);
  const pendingHourLogs = ref<PendingHourLog[]>([]);
  const analytics = ref<AdminAnalytics | null>(null);

  async function fetchUsers() {
    const { data } = await client.get('/admin/users');
    users.value = data;
  }

  async function fetchBookings() {
    const { data } = await client.get('/admin/bookings');
    bookings.value = data;
  }

  async function fetchStats() {
    const { data } = await client.get('/admin/stats');
    stats.value = data;
  }

  async function fetchPendingHourLogs() {
    const { data } = await client.get('/volunteer/hour-logs/pending');
    pendingHourLogs.value = data;
  }

  async function fetchAnalytics() {
    const { data } = await client.get('/admin/analytics');
    analytics.value = data;
  }

  // Loads everything the dashboard needs in one call.
  async function fetchAll() {
    await Promise.all([fetchUsers(), fetchBookings(), fetchStats(), fetchPendingHourLogs(), fetchAnalytics()]);
  }

  async function verifyHourLog(logId: string) {
    await client.post(`/volunteer/verify-hours/${logId}`);
    // Remove it locally rather than refetching everything.
    pendingHourLogs.value = pendingHourLogs.value.filter((log) => log.id !== logId);
    if (stats.value) stats.value.pendingHourLogCount -= 1;
  }

  return { users, bookings, stats, pendingHourLogs, analytics, fetchUsers, fetchBookings, fetchStats, fetchPendingHourLogs, fetchAnalytics, fetchAll, verifyHourLog };
});
