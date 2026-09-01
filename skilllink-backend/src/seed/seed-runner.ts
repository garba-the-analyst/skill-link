// skilllink-backend/src/seed/seed-runner.ts
//
// The actual seeding logic, extracted so it can run two ways:
//   1. CLI: prisma/seed.ts calls this with its own PrismaClient (local dev,
//      or any environment where you can reach the database directly).
//   2. HTTP: OpsController calls this with the app's existing PrismaService
//      when the app itself is the only thing that can reach the database
//      (e.g. Render's free tier, which has no Shell/One-Off Jobs and no
//      external database access) — see ops/ops.controller.ts.
//
// Wipes and repopulates the database with a full demo dataset:
//   - 1 super admin
//   - 8 professionals (paid providers), each with a live service listing
//   - 12 everyday users (a mix of organizations, volunteers, and people
//     who just browse/book — i.e. everyone who isn't a paid provider)
//   - volunteer opportunities, hour logs (some pending, so the admin
//     review queue has real work in it), a certificate, and bookings
//     covering every stage of the escrow lifecycle
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

// Override with real values via SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD in
// your .env — see .env.example. These fallbacks are demo-only and are
// printed in the returned summary, so don't rely on them past your first login.
const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || 'admin@skilllink.demo';
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || 'ChangeThisPassword123!';
const CERT_SIGNING_SECRET = process.env.CERT_SIGNING_SECRET || 'dev-only-cert-salt-change-me';
const DEMO_PASSWORD = 'password123'; // Shared by every seeded account except the super admin

interface ProfessionalSeed {
  key: string;
  email: string;
  displayName: string;
  bio: string;
  isVolunteer?: boolean;
  listing: { title: string; bio: string; hourlyRateCents: number; skills: string[] };
}

interface NormalUserSeed {
  key: string;
  email: string;
  displayName: string;
  bio: string;
  profileType?: 'INDIVIDUAL' | 'ORGANIZATION';
  isVolunteer?: boolean;
  totalLoggedHours?: number;
}

// --- 8 professionals: paid providers, each with one live listing ---------
const PROFESSIONALS: ProfessionalSeed[] = [
  {
    key: 'tutor',
    email: 'malik@newgate.test',
    displayName: 'Abdulmalik Ayomide',
    bio: 'B.Sc. Cyber Security student specializing in system validation and secure backend architectures.',
    isVolunteer: true,
    listing: {
      title: 'Database Security & Web Optimization',
      bio: 'One-on-one session covering Prisma schema design, relational indexing, and API security auditing.',
      hourlyRateCents: 150000, // ₦1,500.00 in integer cents
      skills: ['Prisma', 'Cybersecurity', 'TypeScript'],
    },
  },
  {
    key: 'artisan',
    email: 'artisan@skilllink.test',
    displayName: 'Kabiru Plumber Minna',
    bio: 'Trusted local plumber with 5 years experience servicing central Minna estates.',
    listing: {
      title: 'Plumbing Repairs & Maintenance',
      bio: 'Fast diagnostic checks, leakage repairs, and piping installations.',
      hourlyRateCents: 350000,
      skills: ['Plumbing', 'Home Repairs'],
    },
  },
  {
    key: 'designer',
    email: 'amaka@newgate.test',
    displayName: 'Amaka Chukwu',
    bio: 'Freelance graphic designer helping campus clubs and small businesses look professional.',
    listing: {
      title: 'Graphic Design & Brand Identity',
      bio: 'Logos, flyers, and social media kits, delivered print-ready in Adobe Illustrator.',
      hourlyRateCents: 200000,
      skills: ['Adobe Illustrator', 'Brand Identity', 'Logo Design'],
    },
  },
  {
    key: 'electrician',
    email: 'emeka@skilllink.test',
    displayName: 'Emeka Okafor',
    bio: 'Licensed electrician covering residential wiring and small solar installations around Minna.',
    listing: {
      title: 'Electrical Installation & Repairs',
      bio: 'Safe wiring inspections, fault diagnosis, and solar inverter setup.',
      hourlyRateCents: 300000,
      skills: ['Electrical Wiring', 'Solar Installation'],
    },
  },
  {
    key: 'photographer',
    email: 'fatima@newgate.test',
    displayName: 'Fatima Sani',
    bio: 'Photographer and videographer covering campus events, portraits, and small weddings.',
    listing: {
      title: 'Photography & Event Videography',
      bio: 'Full event coverage with same-week edited delivery.',
      hourlyRateCents: 400000,
      skills: ['Photography', 'Video Editing', 'Adobe Premiere'],
    },
  },
  {
    key: 'mathTutor',
    email: 'chidi@newgate.test',
    displayName: 'Chidi Nwosu',
    bio: '400-level Physics student tutoring WAEC and first-year Maths & Physics.',
    isVolunteer: true,
    listing: {
      title: 'Mathematics & Physics Tutoring',
      bio: 'Exam-focused sessions covering calculus, mechanics, and WAEC past questions.',
      hourlyRateCents: 120000,
      skills: ['Calculus', 'Mechanics', 'WAEC Prep'],
    },
  },
  {
    key: 'tailor',
    email: 'blessing@skilllink.test',
    displayName: 'Blessing Eze',
    bio: 'Fashion design graduate running a small made-to-order tailoring business.',
    listing: {
      title: 'Fashion Design & Tailoring',
      bio: 'Custom Ankara wear and alterations, fitted and finished within a week.',
      hourlyRateCents: 250000,
      skills: ['Pattern Making', 'Ankara Styling', 'Sewing'],
    },
  },
  {
    key: 'webdev',
    email: 'yusuf@newgate.test',
    displayName: 'Yusuf Ibrahim',
    bio: 'Computer Science student building frontends for local startups on the side.',
    listing: {
      title: 'Frontend Web Development',
      bio: 'Landing pages and dashboards built in React and Tailwind CSS.',
      hourlyRateCents: 180000,
      skills: ['React', 'Tailwind CSS', 'JavaScript'],
    },
  },
];

// --- 12 everyday users: organizations, volunteers, and plain members -----
const NORMAL_USERS: NormalUserSeed[] = [
  {
    key: 'studentUnion',
    email: 'fcite_union@newgate.test',
    displayName: 'NUM FCIT Student Union',
    bio: 'Representing the computing student community at Newgate University Minna.',
    profileType: 'ORGANIZATION',
  },
  {
    key: 'envClub',
    email: 'greenclub@newgate.test',
    displayName: 'NUM Environmental Club',
    bio: 'Student-run club organizing campus sustainability projects.',
    profileType: 'ORGANIZATION',
  },
  {
    key: 'civicVolunteer',
    email: 'volunteer@skilllink.test',
    displayName: 'Amina Bello',
    bio: 'Passionate about environmental sustainability and tech education mentoring.',
    isVolunteer: true,
    totalLoggedHours: 42,
  },
  {
    key: 'zainab',
    email: 'zainab@newgate.test',
    displayName: 'Zainab Musa',
    bio: 'First-year student getting involved in campus volunteering.',
    isVolunteer: true,
    totalLoggedHours: 0, // Her hours are still pending admin verification below
  },
  {
    key: 'ibrahim',
    email: 'ibrahim.aliyu@newgate.test',
    displayName: 'Ibrahim Aliyu',
    bio: 'Volunteers with the Environmental Club on weekends.',
    isVolunteer: true,
    totalLoggedHours: 0,
  },
  {
    key: 'ngozi',
    email: 'ngozi@newgate.test',
    displayName: 'Ngozi Adeyemi',
    bio: 'Education student volunteering as a mentor for the Cyber Security Club.',
    isVolunteer: true,
    totalLoggedHours: 0,
  },
  {
    key: 'halima',
    email: 'halima@newgate.test',
    displayName: 'Halima Yusuf',
    bio: 'Long-time campus volunteer, now a few hours away from her next certificate.',
    isVolunteer: true,
  },
  {
    key: 'grace',
    email: 'grace.okonkwo@newgate.test',
    displayName: 'Grace Okonkwo',
    bio: '300-level student, books tutors and services through SkillLink.',
  },
  {
    key: 'suleiman',
    email: 'suleiman@newgate.test',
    displayName: 'Suleiman Bako',
    bio: 'Final-year student, currently renovating his off-campus apartment.',
  },
  {
    key: 'tunde',
    email: 'tunde@newgate.test',
    displayName: 'Tunde Adebayo',
    bio: 'Runs a small student-club side project and hires help through SkillLink.',
  },
  {
    key: 'musa',
    email: 'musa.garba@newgate.test',
    displayName: 'Musa Garba',
    bio: '200-level student exploring what SkillLink has to offer.',
  },
  {
    key: 'precious',
    email: 'precious.etim@newgate.test',
    displayName: 'Precious Etim',
    bio: 'Studies Mass Communication, books services for club events.',
  },
];

export async function runSeed(prisma: PrismaClient): Promise<string> {
  const log: string[] = [];
  const record = (line: string) => {
    console.log(line);
    log.push(line);
  };

  record('Clearing database contents...');
  await prisma.review.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.listingSkill.deleteMany();
  await prisma.serviceListing.deleteMany();
  await prisma.volunteerHourLog.deleteMany();
  await prisma.volunteerApplication.deleteMany();
  await prisma.volunteerOpportunity.deleteMany();
  await prisma.volunteerCertificate.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();

  record('Generating cryptographic secure password representations...');
  const defaultPasswordHash = await bcrypt.hash(DEMO_PASSWORD, 12);
  const adminPasswordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);

  // 1. Core platform administrator
  const superAdmin = await prisma.user.create({
    data: {
      email: ADMIN_EMAIL,
      passwordHash: adminPasswordHash,
      displayName: 'Garba Abdullahi',
      role: 'SUPER_ADMIN',
      profileType: 'INDIVIDUAL',
      identityStatus: 'VERIFIED',
    },
  });

  // 2. The 8 professionals, each with a live service listing
  // malik@newgate.test is promoted to SUPER_ADMIN on request so the primary tutor account can access the Admin Console without needing the generic admin@skilllink.demo login.
  const ADMIN_PROMOTED_EMAILS = new Set(['malik@newgate.test']);
  const pros = new Map<string, { user: Awaited<ReturnType<typeof prisma.user.create>>; listingId: string }>();
  for (const p of PROFESSIONALS) {
    const user = await prisma.user.create({
      data: {
        email: p.email,
        passwordHash: defaultPasswordHash,
        displayName: p.displayName,
        role: ADMIN_PROMOTED_EMAILS.has(p.email) ? 'SUPER_ADMIN' : 'MEMBER',
        profileType: 'INDIVIDUAL',
        isPaidProvider: true,
        isVolunteer: p.isVolunteer ?? false,
        bio: p.bio,
        identityStatus: 'VERIFIED',
        professionalStatus: 'VERIFIED',
      },
    });
    const listing = await prisma.serviceListing.create({
      data: {
        providerId: user.id,
        title: p.listing.title,
        bio: p.listing.bio,
        hourlyRateCents: p.listing.hourlyRateCents,
        skills: { create: p.listing.skills.map((name) => ({ name })) },
      },
    });
    pros.set(p.key, { user, listingId: listing.id });
  }

  // 3. The 12 everyday users (organizations, volunteers, plain members)
  const normals = new Map<string, Awaited<ReturnType<typeof prisma.user.create>>>();
  for (const n of NORMAL_USERS) {
    const user = await prisma.user.create({
      data: {
        email: n.email,
        passwordHash: defaultPasswordHash,
        displayName: n.displayName,
        role: 'MEMBER',
        profileType: n.profileType ?? 'INDIVIDUAL',
        isVolunteer: n.isVolunteer ?? false,
        bio: n.bio,
        identityStatus: n.profileType === 'ORGANIZATION' ? 'VERIFIED' : 'PENDING',
        totalLoggedHours: n.totalLoggedHours ?? 0,
      },
    });
    normals.set(n.key, user);
  }

  // Helper accessors — throws loudly during seeding if a key is ever renamed above.
  const pro = (key: string) => {
    const found = pros.get(key);
    if (!found) throw new Error(`Seed error: no professional with key "${key}"`);
    return found;
  };
  const normal = (key: string) => {
    const found = normals.get(key);
    if (!found) throw new Error(`Seed error: no normal user with key "${key}"`);
    return found;
  };

  // 4. Volunteer opportunities, posted by the two organizations
  const forestOpportunity = await prisma.volunteerOpportunity.create({
    data: {
      creatorId: normal('studentUnion').id,
      title: 'Minna Clean-up & Tree Planting Drive',
      description: 'Help us plant trees and clean up our environment to encourage ecological preservation near NUM campus.',
      category: 'Environmental',
      location: 'NUM Campus Perimeter, Minna',
      requiredHours: 4,
      status: 'ACTIVE',
    },
  });

  const techMentorshipOpportunity = await prisma.volunteerOpportunity.create({
    data: {
      creatorId: normal('studentUnion').id,
      title: 'Cyber Security Club Mentorship Event',
      description: 'Share your skills! Teach basic digital hygiene rules and online footprint safety to local high school students.',
      category: 'Education',
      location: 'NUM FCIT Lecture Hall B',
      requiredHours: 6,
      status: 'ACTIVE',
    },
  });

  const riverCleanupOpportunity = await prisma.volunteerOpportunity.create({
    data: {
      creatorId: normal('envClub').id,
      title: 'River Bank Restoration Project',
      description: 'Clearing invasive plant growth and litter along the river bank behind the sports complex.',
      category: 'Environmental',
      location: 'NUM Sports Complex, Minna',
      requiredHours: 5,
      status: 'ACTIVE',
    },
  });

  const recyclingOpportunity = await prisma.volunteerOpportunity.create({
    data: {
      creatorId: normal('envClub').id,
      title: 'Recycling Awareness Drive',
      description: 'Staffing an information booth and running a plastic collection point during Welcome Week.',
      category: 'Education',
      location: 'NUM Main Gate Plaza',
      requiredHours: 3,
      status: 'ACTIVE',
    },
  });

  // 5. Volunteer hour logs — a mix of already-verified and still-pending,
  // so the admin review queue has real work in it from the first login.
  // Each verified log below also increments the volunteer's totalLoggedHours,
  // mirroring exactly what VolunteerService#verifyHours does for a real
  // admin approval — that keeps the certificate hash below (and every
  // profile's hour count) consistent with the logs that justify it.
  await prisma.volunteerHourLog.create({
    data: {
      opportunityId: forestOpportunity.id,
      volunteerId: pro('tutor').user.id,
      hoursLogged: 4,
      isVerified: true,
      verifiedById: superAdmin.id,
      verifiedAt: new Date(),
    },
  });
  const tutorAfterVerification = await prisma.user.update({
    where: { id: pro('tutor').user.id },
    data: { totalLoggedHours: { increment: 4 } },
  });

  await prisma.volunteerHourLog.create({
    data: {
      opportunityId: techMentorshipOpportunity.id,
      volunteerId: normal('halima').id,
      hoursLogged: 18,
      isVerified: true,
      verifiedById: superAdmin.id,
      verifiedAt: new Date(),
    },
  });
  await prisma.user.update({
    where: { id: normal('halima').id },
    data: { totalLoggedHours: { increment: 18 } },
  });

  const pendingLogs = [
    { opportunityId: forestOpportunity.id, volunteerId: normal('zainab').id, hoursLogged: 4 },
    { opportunityId: riverCleanupOpportunity.id, volunteerId: normal('ibrahim').id, hoursLogged: 5 },
    { opportunityId: techMentorshipOpportunity.id, volunteerId: normal('ngozi').id, hoursLogged: 6 },
  ];
  for (const l of pendingLogs) {
    await prisma.volunteerHourLog.create({ data: { ...l, isVerified: false } });
  }

  // 6. Sample completion certificate for the tutor, using the same hashing
  // algorithm as VolunteerService#issueCertificate, and the tutor's real,
  // post-increment totalLoggedHours — not a stale in-memory value — so this
  // is a genuine, verifiable hash rather than placeholder text.
  const tutorTotalHours = tutorAfterVerification.totalLoggedHours;
  const sampleCertificateHash = crypto
    .createHash('sha256')
    .update(`${pro('tutor').user.id}-${tutorTotalHours}-${CERT_SIGNING_SECRET}`)
    .digest('hex');

  await prisma.volunteerCertificate.create({
    data: {
      volunteerId: pro('tutor').user.id,
      totalHoursSigned: tutorTotalHours,
      issueHash: sampleCertificateHash,
    },
  });

  // 7. Bookings covering every stage of the escrow lifecycle, so the demo
  // can show the full flow without clicking through it live.
  //
  //   LOCKED        -> Suleiman booked the plumber; funds locked, untouched.
  //   IN_PROGRESS   -> Tunde booked the designer; provider has started.
  //   RELEASE_READY -> Musa booked the electrician; provider marked done,
  //                    generated the OTP printed below.
  //   COMPLETED     -> Grace booked the tutor; released, provider paid out.
  await prisma.booking.create({
    data: {
      listingId: pro('artisan').listingId,
      studentId: normal('suleiman').id,
      providerId: pro('artisan').user.id,
      status: 'LOCKED',
      amountCents: 350000,
      escrowFeeCents: 35000,
      scheduledFor: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });

  await prisma.booking.create({
    data: {
      listingId: pro('designer').listingId,
      studentId: normal('tunde').id,
      providerId: pro('designer').user.id,
      status: 'IN_PROGRESS',
      amountCents: 200000,
      escrowFeeCents: 20000,
      scheduledFor: new Date(Date.now() + 48 * 60 * 60 * 1000),
    },
  });

  const demoOtp = '482913';
  await prisma.booking.create({
    data: {
      listingId: pro('electrician').listingId,
      studentId: normal('musa').id,
      providerId: pro('electrician').user.id,
      status: 'RELEASE_READY',
      otpCode: demoOtp,
      amountCents: 300000,
      escrowFeeCents: 30000,
      scheduledFor: new Date(),
    },
  });

  const completedAmount = 150000;
  const completedFee = 15000;
  const completedNet = completedAmount - completedFee;
  await prisma.booking.create({
    data: {
      listingId: pro('tutor').listingId,
      studentId: normal('grace').id,
      providerId: pro('tutor').user.id,
      status: 'COMPLETED',
      amountCents: completedAmount,
      escrowFeeCents: completedFee,
      completedAt: new Date(),
      scheduledFor: new Date(Date.now() - 24 * 60 * 60 * 1000),
    },
  });
  // Mirror what EscrowService#authorizeRelease does on a real release, since
  // this booking is being inserted directly as already-COMPLETED.
  await prisma.user.update({
    where: { id: pro('tutor').user.id },
    data: {
      availableCents: { increment: completedNet },
      totalEarnedCents: { increment: completedNet },
      accumulatedPoints: { increment: 50 },
    },
  });

  // 8. Extended transaction history — spread over the last 28 days so
  // analytics have real trends (revenue, bookingsByStatus, activity).
  const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);
  const extraCompleted: Array<{ listing: string; student: string; provider: string; amount: number; fee: number; ago: number }> = [
    { listing: 'webdev', student: 'precious', provider: 'webdev', amount: 180000, fee: 18000, ago: 26 },
    { listing: 'photographer', student: 'suleiman', provider: 'photographer', amount: 400000, fee: 40000, ago: 21 },
    { listing: 'tailor', student: 'tunde', provider: 'tailor', amount: 250000, fee: 25000, ago: 18 },
    { listing: 'designer', student: 'precious', provider: 'designer', amount: 220000, fee: 22000, ago: 14 },
    { listing: 'mathTutor', student: 'musa', provider: 'mathTutor', amount: 120000, fee: 12000, ago: 10 },
    { listing: 'artisan', student: 'grace', provider: 'artisan', amount: 320000, fee: 32000, ago: 6 },
    { listing: 'webdev', student: 'suleiman', provider: 'webdev', amount: 180000, fee: 18000, ago: 3 },
    { listing: 'tailor', student: 'grace', provider: 'tailor', amount: 270000, fee: 27000, ago: 1 },
  ];
  for (const b of extraCompleted) {
    const p = pro(b.listing);
    // Use the specified provider if different from the listing owner (e.g. webdev listing owned by yusuf but provider could be yusuf)
    const providerId = pro(b.provider).user.id;
    const booking = await prisma.booking.create({
      data: {
        listingId: p.listingId,
        studentId: normal(b.student).id,
        providerId,
        status: 'COMPLETED',
        amountCents: b.amount,
        escrowFeeCents: b.fee,
        createdAt: daysAgo(b.ago + 1),
        completedAt: daysAgo(b.ago),
        scheduledFor: daysAgo(b.ago + 2),
      },
    });
    const net = b.amount - b.fee;
    await prisma.user.update({
      where: { id: providerId },
      data: { availableCents: { increment: net }, totalEarnedCents: { increment: net }, accumulatedPoints: { increment: 50 } },
    });
  }

  // Extra in-flight bookings to make Active counts meaningful
  const extraActive: Array<{ listing: string; student: string; provider: string; status: string; amount: number; fee: number; ago: number }> = [
    { listing: 'photographer', student: 'precious', provider: 'photographer', status: 'LOCKED', amount: 400000, fee: 40000, ago: 2 },
    { listing: 'mathTutor', student: 'tunde', provider: 'mathTutor', status: 'LOCKED', amount: 120000, fee: 12000, ago: 1 },
    { listing: 'webdev', student: 'grace', provider: 'webdev', status: 'IN_PROGRESS', amount: 180000, fee: 18000, ago: 4 },
    { listing: 'tailor', student: 'suleiman', provider: 'tailor', status: 'IN_PROGRESS', amount: 250000, fee: 25000, ago: 2 },
  ];
  for (const b of extraActive) {
    await prisma.booking.create({
      data: {
        listingId: pro(b.listing).listingId,
        studentId: normal(b.student).id,
        providerId: pro(b.provider).user.id,
        status: b.status as any,
        amountCents: b.amount,
        escrowFeeCents: b.fee,
        createdAt: daysAgo(b.ago),
        scheduledFor: daysAgo(-1),
      },
    });
  }

  // 9. Extra volunteer activity — applications, hour logs and certificates
  const extraHourLogs: Array<{ opp: string; volunteer: string; hours: number; verified: boolean; ago: number }> = [
    { opp: 'forest', volunteer: 'civicVolunteer', hours: 6, verified: true, ago: 20 },
    { opp: 'river', volunteer: 'tutor', hours: 5, verified: true, ago: 15 },
    { opp: 'recycling', volunteer: 'zainab', hours: 3, verified: true, ago: 12 },
    { opp: 'techMentorship', volunteer: 'ibrahim', hours: 4, verified: false, ago: 5 },
    { opp: 'river', volunteer: 'precious', hours: 5, verified: false, ago: 4 },
    { opp: 'recycling', volunteer: 'grace', hours: 3, verified: false, ago: 2 },
    { opp: 'forest', volunteer: 'precious', hours: 4, verified: false, ago: 1 },
  ];
  const oppMap: Record<string, string> = { forest: forestOpportunity.id, techMentorship: techMentorshipOpportunity.id, river: riverCleanupOpportunity.id, recycling: recyclingOpportunity.id };
  for (const l of extraHourLogs) {
    const log = await prisma.volunteerHourLog.create({
      data: {
        opportunityId: oppMap[l.opp],
        volunteerId: normal(l.volunteer)?.id ?? pro(l.volunteer)?.user.id ?? normal('civicVolunteer').id,
        hoursLogged: l.hours,
        isVerified: l.verified,
        verifiedById: l.verified ? superAdmin.id : null,
        verifiedAt: l.verified ? daysAgo(l.ago) : null,
        createdAt: daysAgo(l.ago + 1),
      },
    });
    if (l.verified) {
      const vid = log.volunteerId;
      await prisma.user.update({ where: { id: vid }, data: { totalLoggedHours: { increment: l.hours } } });
    }
  }

  // Volunteer applications (some accepted)
  await prisma.volunteerApplication.createMany({
    data: [
      { opportunityId: forestOpportunity.id, volunteerId: normal('zainab').id },
      { opportunityId: riverCleanupOpportunity.id, volunteerId: normal('ibrahim').id },
      { opportunityId: techMentorshipOpportunity.id, volunteerId: normal('ngozi').id },
      { opportunityId: recyclingOpportunity.id, volunteerId: normal('precious').id },
      { opportunityId: forestOpportunity.id, volunteerId: normal('precious').id },
      { opportunityId: techMentorshipOpportunity.id, volunteerId: pro('mathTutor').user.id },
    ],
  });

  // Another certificate for a now-verified volunteer
  const halima = await prisma.user.findUnique({ where: { id: normal('halima').id } });
  if (halima) {
    const halimaHash = crypto.createHash('sha256').update(`${halima.id}-${halima.totalLoggedHours}-${CERT_SIGNING_SECRET}`).digest('hex');
    await prisma.volunteerCertificate.create({ data: { volunteerId: halima.id, totalHoursSigned: halima.totalLoggedHours, issueHash: halimaHash } }).catch(() => {});
  }

  record('\n================================================================');
  record('  SKILLLINK MARKETPLACE SEEDED SUCCESSFULLY');
  record('================================================================');
  record(`- Super Admin login        : ${superAdmin.email} / ${ADMIN_PASSWORD}`);
  if (!process.env.SEED_ADMIN_EMAIL || !process.env.SEED_ADMIN_PASSWORD) {
    record('  (demo credentials — set SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD to override)');
  }
  record(`- Promoted Super Admin     : ${pro('tutor').user.email} / ${DEMO_PASSWORD} (Abdulmalik Ayomide)`);
  record(`- Everyone else logs in with the password: ${DEMO_PASSWORD}`);
  record(`- 8 professionals seeded, each with a live listing (e.g. ${pro('tutor').user.email})`);
  record(`- 12 everyday users seeded (2 organizations, volunteers, and plain members)`);
  record('- 4 volunteer opportunities posted; 5+ hour logs verified, 7+ still pending review');
  record('- 16 bookings seeded across all escrow stages (including 8 historical COMPLETED for revenue trends)');
  record(`    RELEASE_READY booking OTP (login as ${normal('musa').email}): ${demoOtp}`);
  record('================================================================\n');

  return log.join('\n');
}
