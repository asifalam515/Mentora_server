import bcrypt from "bcryptjs";
import { prisma } from "../../lib/prisma";

type SlotTemplate = {
  dayOffset: number;
  startHour: number;
  durationHours: number;
};

type TutorSeed = {
  name: string;
  email: string;
  bio: string;
  pricePerHr: number;
  experience: number;
  isVerified: boolean;
  isFeatured: boolean;
  categories: string[];
};

type StudentSeed = {
  name: string;
  email: string;
};

type ReviewTemplate = {
  rating: number;
  comment: string;
};

const categories = [
  "Mathematics",
  "Physics",
  "Chemistry",
  "Biology",
  "Computer Science",
  "Programming",
  "Web Development",
  "Data Science",
  "English",
  "Spanish",
  "French",
  "History",
  "Geography",
  "Economics",
  "Business",
  "Music",
  "Art",
  "Test Preparation",
  "SAT",
  "IELTS",
];

const tutorSeeds: TutorSeed[] = [
  {
    name: "Ayesha Rahman",
    email: "ayesha.rahman.tutor@mentora.dev",
    bio: "Math mentor focused on exam readiness, confidence building, and practical problem solving.",
    pricePerHr: 25,
    experience: 4,
    isVerified: true,
    isFeatured: true,
    categories: ["Mathematics", "SAT", "Test Preparation"],
  },
  {
    name: "Nafis Chowdhury",
    email: "nafis.chowdhury.tutor@mentora.dev",
    bio: "Physics tutor who teaches concept-first methods for board exams and admission tests.",
    pricePerHr: 28,
    experience: 5,
    isVerified: true,
    isFeatured: false,
    categories: ["Physics", "Test Preparation"],
  },
  {
    name: "Tania Sultana",
    email: "tania.sultana.tutor@mentora.dev",
    bio: "Chemistry specialist for reaction mechanisms, organic chemistry, and revision strategy.",
    pricePerHr: 30,
    experience: 6,
    isVerified: true,
    isFeatured: true,
    categories: ["Chemistry", "Biology"],
  },
  {
    name: "Imran Hossain",
    email: "imran.hossain.tutor@mentora.dev",
    bio: "Beginner friendly programming tutor for Python and JavaScript through mini projects.",
    pricePerHr: 35,
    experience: 5,
    isVerified: true,
    isFeatured: false,
    categories: ["Programming", "Computer Science", "Web Development"],
  },
  {
    name: "Farhana Kabir",
    email: "farhana.kabir.tutor@mentora.dev",
    bio: "Data science coach covering statistics, data analysis, and machine learning basics.",
    pricePerHr: 42,
    experience: 7,
    isVerified: true,
    isFeatured: true,
    categories: ["Data Science", "Programming", "Mathematics"],
  },
  {
    name: "Rafi Mahmud",
    email: "rafi.mahmud.tutor@mentora.dev",
    bio: "IELTS and spoken English coach with weekly speaking drills and personalized feedback.",
    pricePerHr: 24,
    experience: 4,
    isVerified: true,
    isFeatured: false,
    categories: ["English", "IELTS"],
  },
  {
    name: "Samia Karim",
    email: "samia.karim.tutor@mentora.dev",
    bio: "Biology tutor focused on active recall, diagrams, and fast revision frameworks.",
    pricePerHr: 32,
    experience: 6,
    isVerified: true,
    isFeatured: true,
    categories: ["Biology", "Test Preparation"],
  },
  {
    name: "Fahim Anwar",
    email: "fahim.anwar.tutor@mentora.dev",
    bio: "Full-stack web development mentor for React, APIs, and production-grade architecture.",
    pricePerHr: 40,
    experience: 8,
    isVerified: true,
    isFeatured: true,
    categories: ["Web Development", "Programming", "Computer Science"],
  },
  {
    name: "Mithila Islam",
    email: "mithila.islam.tutor@mentora.dev",
    bio: "Economics and business tutor using current market examples and case discussion.",
    pricePerHr: 27,
    experience: 5,
    isVerified: true,
    isFeatured: false,
    categories: ["Economics", "Business"],
  },
  {
    name: "Arif Hasan",
    email: "arif.hasan.tutor@mentora.dev",
    bio: "CS tutor for algorithms, data structures, and interview preparation with coding practice.",
    pricePerHr: 38,
    experience: 7,
    isVerified: true,
    isFeatured: true,
    categories: ["Computer Science", "Programming", "Mathematics"],
  },
];

const studentSeeds: StudentSeed[] = [
  { name: "Mahin Ahmed", email: "mahin.ahmed.student@mentora.dev" },
  { name: "Nusrat Jahan", email: "nusrat.jahan.student@mentora.dev" },
  { name: "Sajib Hasan", email: "sajib.hasan.student@mentora.dev" },
  { name: "Rida Karim", email: "rida.karim.student@mentora.dev" },
  { name: "Tanvir Alam", email: "tanvir.alam.student@mentora.dev" },
  { name: "Mou Das", email: "mou.das.student@mentora.dev" },
  { name: "Aritra Dey", email: "aritra.dey.student@mentora.dev" },
  { name: "Tanjim Noor", email: "tanjim.noor.student@mentora.dev" },
  { name: "Priya Sen", email: "priya.sen.student@mentora.dev" },
  { name: "Shafin Reza", email: "shafin.reza.student@mentora.dev" },
  { name: "Ishrat Nabil", email: "ishrat.nabil.student@mentora.dev" },
  { name: "Rafid Khan", email: "rafid.khan.student@mentora.dev" },
];

const slotTemplates: SlotTemplate[] = [
  { dayOffset: -10, startHour: 9, durationHours: 1 },
  { dayOffset: -8, startHour: 11, durationHours: 1 },
  { dayOffset: -6, startHour: 15, durationHours: 1 },
  { dayOffset: -3, startHour: 17, durationHours: 1 },
  { dayOffset: 1, startHour: 10, durationHours: 1 },
  { dayOffset: 2, startHour: 14, durationHours: 1 },
  { dayOffset: 4, startHour: 18, durationHours: 1 },
  { dayOffset: 6, startHour: 20, durationHours: 1 },
];

const reviewTemplates: ReviewTemplate[] = [
  {
    rating: 5,
    comment:
      "Excellent session quality and clear teaching style. I could apply the concepts right after class.",
  },
  {
    rating: 4,
    comment:
      "Great structure and pacing. A bit more practice homework would make it even better.",
  },
  {
    rating: 5,
    comment:
      "Very practical and motivating. The tutor made difficult topics feel manageable.",
  },
  {
    rating: 4,
    comment:
      "Solid guidance and detailed explanations. I saw improvement within two weeks.",
  },
  {
    rating: 5,
    comment:
      "One of the most useful tutoring sessions I have taken. Highly recommended.",
  },
];

const toUtcDate = (dayOffset: number, hour: number) => {
  const now = new Date();
  const date = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      hour,
      0,
      0,
      0,
    ),
  );
  date.setUTCDate(date.getUTCDate() + dayOffset);
  return date;
};

const toInvoiceNumber = (bookingDate: Date, bookingId: string) => {
  const y = bookingDate.getUTCFullYear();
  const m = String(bookingDate.getUTCMonth() + 1).padStart(2, "0");
  const d = String(bookingDate.getUTCDate()).padStart(2, "0");
  return `INV-${y}${m}${d}-${bookingId.slice(0, 6).toUpperCase()}`;
};

async function seedAllDummyData() {
  console.log("===== Comprehensive dummy data seeding started =====");

  const hashedTutorPassword = await bcrypt.hash("TutorPass123!", 8);
  const hashedStudentPassword = await bcrypt.hash("StudentPass123!", 8);

  const categoryMap = new Map<string, string>();
  for (const name of categories) {
    const category = await prisma.category.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    categoryMap.set(name, category.id);
  }

  const tutors = await Promise.all(
    tutorSeeds.map(async (seed) => {
      const user = await prisma.user.upsert({
        where: { email: seed.email },
        update: {
          name: seed.name,
          role: "TUTOR",
          emailVerified: true,
          status: "ACTIVE",
          banned: false,
          banReason: null,
        },
        create: {
          name: seed.name,
          email: seed.email,
          password: hashedTutorPassword,
          role: "TUTOR",
          emailVerified: true,
          status: "ACTIVE",
          banned: false,
        },
      });

      const profile = await prisma.tutorProfile.upsert({
        where: { userId: user.id },
        update: {
          bio: seed.bio,
          pricePerHr: seed.pricePerHr,
          experience: seed.experience,
          isVerified: seed.isVerified,
          isFeatured: seed.isFeatured,
        },
        create: {
          userId: user.id,
          bio: seed.bio,
          pricePerHr: seed.pricePerHr,
          experience: seed.experience,
          isVerified: seed.isVerified,
          isFeatured: seed.isFeatured,
        },
      });

      const categoryIds = seed.categories
        .map((name) => categoryMap.get(name))
        .filter((id): id is string => Boolean(id));

      await prisma.tutorCategory.createMany({
        data: categoryIds.map((categoryId) => ({
          tutorId: profile.id,
          categoryId,
        })),
        skipDuplicates: true,
      });

      await prisma.availabilitySlot.createMany({
        data: slotTemplates.map((slot) => {
          const startTime = toUtcDate(slot.dayOffset, slot.startHour);
          const endTime = toUtcDate(
            slot.dayOffset,
            slot.startHour + slot.durationHours,
          );
          return {
            tutorId: profile.id,
            startTime,
            endTime,
            isBooked: false,
          };
        }),
        skipDuplicates: true,
      });

      return {
        seed,
        user,
        profile,
      };
    }),
  );

  const students = await Promise.all(
    studentSeeds.map((seed) =>
      prisma.user.upsert({
        where: { email: seed.email },
        update: {
          name: seed.name,
          role: "STUDENT",
          emailVerified: true,
          status: "ACTIVE",
          banned: false,
          banReason: null,
        },
        create: {
          name: seed.name,
          email: seed.email,
          password: hashedStudentPassword,
          role: "STUDENT",
          emailVerified: true,
          status: "ACTIVE",
          banned: false,
        },
      }),
    ),
  );

  let completedBookingCount = 0;
  let confirmedBookingCount = 0;
  let pendingBookingCount = 0;
  let cancelledBookingCount = 0;

  for (let i = 0; i < tutors.length; i += 1) {
    const tutor = tutors[i];

    const pastSlotTime = toUtcDate(-6, 15);
    const recentPastSlotTime = toUtcDate(-3, 17);
    const upcomingSlotTime = toUtcDate(2, 14);
    const futureSlotTime = toUtcDate(6, 20);

    const slotCandidates = await prisma.availabilitySlot.findMany({
      where: {
        tutorId: tutor.profile.id,
        startTime: {
          in: [
            pastSlotTime,
            recentPastSlotTime,
            upcomingSlotTime,
            futureSlotTime,
          ],
        },
      },
      orderBy: { startTime: "asc" },
    });

    const slotByTime = new Map(
      slotCandidates.map((s) => [s.startTime.toISOString(), s]),
    );

    const completedSlot = slotByTime.get(pastSlotTime.toISOString());
    const confirmedSlot = slotByTime.get(recentPastSlotTime.toISOString());
    const pendingSlot = slotByTime.get(upcomingSlotTime.toISOString());
    const cancelledSlot = slotByTime.get(futureSlotTime.toISOString());

    if (!completedSlot || !confirmedSlot || !pendingSlot || !cancelledSlot) {
      console.warn(
        `Skipping booking creation for ${tutor.seed.email}: required slots not found.`,
      );
      continue;
    }

    const studentA = students[i % students.length];
    const studentB = students[(i + 3) % students.length];
    const studentC = students[(i + 6) % students.length];
    const studentD = students[(i + 9) % students.length];

    const completedHours = 2;
    const completedTotal = Math.round(
      completedHours * tutor.seed.pricePerHr * 100,
    );
    const completedCommission = Math.round(completedTotal * 0.15);

    const completedBookingExists = await prisma.booking.findFirst({
      where: {
        studentId: studentA.id,
        tutorId: tutor.profile.id,
        date: completedSlot.startTime,
      },
    });

    const completedBooking =
      completedBookingExists ||
      (await prisma.booking.create({
        data: {
          studentId: studentA.id,
          tutorId: tutor.profile.id,
          slotId: completedSlot.id,
          date: completedSlot.startTime,
          status: "COMPLETED",
          paymentStatus: "PAID",
          totalHours: completedHours,
          totalAmountCents: completedTotal,
          commissionAmountCents: completedCommission,
          tutorAmountCents: completedTotal - completedCommission,
          currency: "usd",
        },
      }));

    const confirmedHours = 1.5;
    const confirmedTotal = Math.round(
      confirmedHours * tutor.seed.pricePerHr * 100,
    );
    const confirmedCommission = Math.round(confirmedTotal * 0.15);

    const confirmedBookingExists = await prisma.booking.findFirst({
      where: {
        studentId: studentB.id,
        tutorId: tutor.profile.id,
        date: confirmedSlot.startTime,
      },
    });

    const confirmedBooking =
      confirmedBookingExists ||
      (await prisma.booking.create({
        data: {
          studentId: studentB.id,
          tutorId: tutor.profile.id,
          slotId: confirmedSlot.id,
          date: confirmedSlot.startTime,
          status: "CONFIRMED",
          paymentStatus: "PAID",
          totalHours: confirmedHours,
          totalAmountCents: confirmedTotal,
          commissionAmountCents: confirmedCommission,
          tutorAmountCents: confirmedTotal - confirmedCommission,
          currency: "usd",
        },
      }));

    const pendingHours = 1;
    const pendingTotal = Math.round(pendingHours * tutor.seed.pricePerHr * 100);
    const pendingCommission = Math.round(pendingTotal * 0.15);

    const pendingBookingExists = await prisma.booking.findFirst({
      where: {
        studentId: studentC.id,
        tutorId: tutor.profile.id,
        date: pendingSlot.startTime,
      },
    });

    const pendingBooking =
      pendingBookingExists ||
      (await prisma.booking.create({
        data: {
          studentId: studentC.id,
          tutorId: tutor.profile.id,
          slotId: pendingSlot.id,
          date: pendingSlot.startTime,
          status: "PENDING",
          paymentStatus: "PENDING",
          totalHours: pendingHours,
          totalAmountCents: pendingTotal,
          commissionAmountCents: pendingCommission,
          tutorAmountCents: pendingTotal - pendingCommission,
          currency: "usd",
        },
      }));

    const cancelledHours = 1;
    const cancelledTotal = Math.round(
      cancelledHours * tutor.seed.pricePerHr * 100,
    );
    const cancelledCommission = Math.round(cancelledTotal * 0.15);

    const cancelledBookingExists = await prisma.booking.findFirst({
      where: {
        studentId: studentD.id,
        tutorId: tutor.profile.id,
        date: cancelledSlot.startTime,
      },
    });

    const cancelledBooking =
      cancelledBookingExists ||
      (await prisma.booking.create({
        data: {
          studentId: studentD.id,
          tutorId: tutor.profile.id,
          slotId: cancelledSlot.id,
          date: cancelledSlot.startTime,
          status: "CANCELLED",
          paymentStatus: "REFUNDED",
          totalHours: cancelledHours,
          totalAmountCents: cancelledTotal,
          commissionAmountCents: cancelledCommission,
          tutorAmountCents: cancelledTotal - cancelledCommission,
          currency: "usd",
        },
      }));

    await prisma.availabilitySlot.update({
      where: { id: completedSlot.id },
      data: { isBooked: true },
    });

    await prisma.availabilitySlot.update({
      where: { id: confirmedSlot.id },
      data: { isBooked: true },
    });

    await prisma.availabilitySlot.update({
      where: { id: pendingSlot.id },
      data: { isBooked: true },
    });

    await prisma.availabilitySlot.update({
      where: { id: cancelledSlot.id },
      data: { isBooked: false },
    });

    const invoiceCandidates = [
      { booking: completedBooking, status: "ISSUED" as const },
      { booking: confirmedBooking, status: "ISSUED" as const },
      { booking: cancelledBooking, status: "REFUNDED" as const },
    ];

    for (const item of invoiceCandidates) {
      const invoiceExists = await prisma.invoice.findUnique({
        where: { bookingId: item.booking.id },
      });

      if (!invoiceExists) {
        await prisma.invoice.create({
          data: {
            invoiceNumber: toInvoiceNumber(item.booking.date, item.booking.id),
            status: item.status,
            amountCents: item.booking.totalAmountCents,
            commissionAmountCents: item.booking.commissionAmountCents,
            tutorAmountCents: item.booking.tutorAmountCents,
            currency: item.booking.currency,
            issuedAt: item.booking.createdAt,
            bookingId: item.booking.id,
            studentId: item.booking.studentId,
            tutorId: item.booking.tutorId,
            pdfGeneratedAt: new Date(item.booking.createdAt.getTime() + 60_000),
          },
        });
      }
    }

    const reviewTemplate = reviewTemplates[i % reviewTemplates.length];
    await prisma.review.upsert({
      where: { bookingId: completedBooking.id },
      update: {
        studentId: completedBooking.studentId,
        tutorId: completedBooking.tutorId,
        rating: reviewTemplate.rating,
        comment: reviewTemplate.comment,
      },
      create: {
        studentId: completedBooking.studentId,
        tutorId: completedBooking.tutorId,
        bookingId: completedBooking.id,
        rating: reviewTemplate.rating,
        comment: reviewTemplate.comment,
      },
    });

    const chatBookings = [completedBooking, confirmedBooking, pendingBooking];
    for (const booking of chatBookings) {
      const existingConversation = await prisma.chatConversation.findUnique({
        where: { bookingId: booking.id },
      });

      const conversation =
        existingConversation ||
        (await prisma.chatConversation.create({
          data: {
            bookingId: booking.id,
            studentId: booking.studentId,
            tutorId: booking.tutorId,
          },
        }));

      const messageCount = await prisma.chatMessage.count({
        where: { conversationId: conversation.id },
      });

      if (messageCount === 0) {
        await prisma.chatMessage.createMany({
          data: [
            {
              conversationId: conversation.id,
              senderId: booking.studentId,
              text: "Hello, I have shared my learning goals for this session.",
            },
            {
              conversationId: conversation.id,
              senderId: tutor.user.id,
              text: "Great, I reviewed them. We will start with a quick baseline assessment.",
            },
            {
              conversationId: conversation.id,
              senderId: booking.studentId,
              text: "Sounds good. I have uploaded my last practice notes as well.",
            },
          ],
        });
      }
    }

    const lessonPlanExists = await prisma.lessonPlan.findFirst({
      where: {
        studentId: studentA.id,
        tutorId: tutor.profile.id,
        goal: { contains: tutor.seed.categories[0] },
      },
    });

    if (!lessonPlanExists) {
      const primaryTopic = tutor.seed.categories[0] || "General Studies";
      const goal = `Build strong ${primaryTopic} fundamentals and score higher in tests within 8 weeks`;

      await prisma.lessonPlan.create({
        data: {
          title: `${primaryTopic} Mastery Roadmap`,
          description:
            "8-week guided study plan with weekly milestones and assessments.",
          goal,
          weeks: 8,
          status: "active",
          studentId: studentA.id,
          tutorId: tutor.profile.id,
          content: {
            weeks: [
              {
                week: 1,
                title: "Foundation and diagnostic",
                topics: ["Core concepts recap", "Baseline quiz"],
                exercises: ["20-minute concept drill", "Short practice set"],
                milestone: "Identify weak areas and set targets",
                estimatedHours: 6,
              },
              {
                week: 4,
                title: "Applied problem solving",
                topics: ["Mixed difficulty practice", "Timed solving"],
                exercises: ["Past-paper section", "Error log review"],
                milestone: "Increase accuracy and speed",
                estimatedHours: 8,
              },
              {
                week: 8,
                title: "Final revision and mock assessment",
                topics: ["Full revision", "Final mock test"],
                exercises: ["Mock exam", "Tutor feedback session"],
                milestone: "Reach target performance level",
                estimatedHours: 9,
              },
            ],
            totalHours: 56,
            resources: [
              `${primaryTopic} course workbook`,
              "Weekly flashcards",
              "Past exam questions",
            ],
            assessmentStrategy:
              "Weekly quizzes, bi-weekly mock tests, and tutor progress reviews.",
          },
        },
      });
    }

    completedBookingCount += 1;
    confirmedBookingCount += 1;
    pendingBookingCount += 1;
    cancelledBookingCount += 1;
  }

  const ratingByTutor = await prisma.review.groupBy({
    by: ["tutorId"],
    _avg: { rating: true },
  });

  for (const row of ratingByTutor) {
    await prisma.tutorProfile.update({
      where: { id: row.tutorId },
      data: { rating: Number((row._avg.rating || 0).toFixed(1)) },
    });
  }

  const [
    categoryCount,
    tutorUserCount,
    studentCount,
    profileCount,
    slotCount,
    bookingCount,
    reviewCount,
    invoiceCount,
    conversationCount,
    messageCount,
    lessonPlanCount,
  ] = await Promise.all([
    prisma.category.count(),
    prisma.user.count({ where: { role: "TUTOR" } }),
    prisma.user.count({ where: { role: "STUDENT" } }),
    prisma.tutorProfile.count(),
    prisma.availabilitySlot.count(),
    prisma.booking.count(),
    prisma.review.count(),
    prisma.invoice.count(),
    prisma.chatConversation.count(),
    prisma.chatMessage.count(),
    prisma.lessonPlan.count(),
  ]);

  console.log("===== Dummy data seeding complete =====");
  console.log(`Categories: ${categoryCount}`);
  console.log(`Tutor users: ${tutorUserCount}`);
  console.log(`Student users: ${studentCount}`);
  console.log(`Tutor profiles: ${profileCount}`);
  console.log(`Availability slots: ${slotCount}`);
  console.log(`Bookings total: ${bookingCount}`);
  console.log(
    `Bookings created this run (by type): completed=${completedBookingCount}, confirmed=${confirmedBookingCount}, pending=${pendingBookingCount}, cancelled=${cancelledBookingCount}`,
  );
  console.log(`Reviews: ${reviewCount}`);
  console.log(`Invoices: ${invoiceCount}`);
  console.log(`Chat conversations: ${conversationCount}`);
  console.log(`Chat messages: ${messageCount}`);
  console.log(`Lesson plans: ${lessonPlanCount}`);
  console.log("Default tutor password: TutorPass123!");
  console.log("Default student password: StudentPass123!");
}

seedAllDummyData()
  .catch((error) => {
    console.error("Comprehensive dummy seeding failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
