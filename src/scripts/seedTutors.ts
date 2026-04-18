import bcrypt from "bcryptjs";
import { prisma } from "../../lib/prisma";

type SlotSeed = {
  dayOffset: number;
  startHour: number;
  endHour: number;
};

type TutorSeed = {
  name: string;
  email: string;
  bio: string;
  pricePerHr: number;
  experience: number;
  rating: number;
  isFeatured: boolean;
  isVerified: boolean;
  categories: string[];
  slots: SlotSeed[];
};

const tutorSeeds: TutorSeed[] = [
  {
    name: "Ayesha Rahman",
    email: "ayesha.rahman.tutor@mentora.dev",
    bio: "I help students build strong fundamentals in algebra and calculus with practical problem-solving strategies.",
    pricePerHr: 25,
    experience: 4,
    rating: 4.8,
    isFeatured: true,
    isVerified: true,
    categories: ["Mathematics", "SAT", "Test Preparation"],
    slots: [
      { dayOffset: 1, startHour: 9, endHour: 10 },
      { dayOffset: 2, startHour: 14, endHour: 15 },
      { dayOffset: 4, startHour: 18, endHour: 19 },
    ],
  },
  {
    name: "Nafis Chowdhury",
    email: "nafis.chowdhury.tutor@mentora.dev",
    bio: "Physics tutor focused on conceptual clarity, exam tactics, and confidence building for high school students.",
    pricePerHr: 28,
    experience: 5,
    rating: 4.7,
    isFeatured: false,
    isVerified: true,
    categories: ["Physics", "Test Preparation"],
    slots: [
      { dayOffset: 1, startHour: 11, endHour: 12 },
      { dayOffset: 3, startHour: 16, endHour: 17 },
      { dayOffset: 5, startHour: 19, endHour: 20 },
    ],
  },
  {
    name: "Tania Sultana",
    email: "tania.sultana.tutor@mentora.dev",
    bio: "Chemistry mentor specializing in organic chemistry, reaction mechanisms, and lab-report guidance.",
    pricePerHr: 30,
    experience: 6,
    rating: 4.9,
    isFeatured: true,
    isVerified: true,
    categories: ["Chemistry", "Biology"],
    slots: [
      { dayOffset: 2, startHour: 10, endHour: 11 },
      { dayOffset: 4, startHour: 15, endHour: 16 },
      { dayOffset: 6, startHour: 17, endHour: 18 },
    ],
  },
  {
    name: "Imran Hossain",
    email: "imran.hossain.tutor@mentora.dev",
    bio: "Programming tutor for beginners. I teach JavaScript and Python using small, real-world projects.",
    pricePerHr: 35,
    experience: 5,
    rating: 4.6,
    isFeatured: false,
    isVerified: true,
    categories: ["Programming", "Computer Science", "Web Development"],
    slots: [
      { dayOffset: 1, startHour: 13, endHour: 14 },
      { dayOffset: 3, startHour: 18, endHour: 19 },
      { dayOffset: 5, startHour: 20, endHour: 21 },
    ],
  },
  {
    name: "Farhana Kabir",
    email: "farhana.kabir.tutor@mentora.dev",
    bio: "Data science tutor with hands-on sessions in statistics, pandas, and machine learning basics.",
    pricePerHr: 42,
    experience: 7,
    rating: 4.8,
    isFeatured: true,
    isVerified: true,
    categories: ["Data Science", "Programming", "Mathematics"],
    slots: [
      { dayOffset: 2, startHour: 9, endHour: 10 },
      { dayOffset: 4, startHour: 14, endHour: 15 },
      { dayOffset: 6, startHour: 19, endHour: 20 },
    ],
  },
  {
    name: "Rafi Mahmud",
    email: "rafi.mahmud.tutor@mentora.dev",
    bio: "English language coach for IELTS and spoken fluency with weekly performance tracking.",
    pricePerHr: 24,
    experience: 4,
    rating: 4.5,
    isFeatured: false,
    isVerified: true,
    categories: ["English", "IELTS"],
    slots: [
      { dayOffset: 1, startHour: 8, endHour: 9 },
      { dayOffset: 3, startHour: 12, endHour: 13 },
      { dayOffset: 5, startHour: 17, endHour: 18 },
    ],
  },
  {
    name: "Samia Karim",
    email: "samia.karim.tutor@mentora.dev",
    bio: "Biology and medical admission prep tutor focused on diagrams, mnemonics, and active recall.",
    pricePerHr: 32,
    experience: 6,
    rating: 4.7,
    isFeatured: true,
    isVerified: true,
    categories: ["Biology", "Test Preparation"],
    slots: [
      { dayOffset: 2, startHour: 11, endHour: 12 },
      { dayOffset: 4, startHour: 16, endHour: 17 },
      { dayOffset: 6, startHour: 18, endHour: 19 },
    ],
  },
  {
    name: "Fahim Anwar",
    email: "fahim.anwar.tutor@mentora.dev",
    bio: "Web development instructor teaching React, APIs, and project architecture for job-ready skills.",
    pricePerHr: 40,
    experience: 8,
    rating: 4.9,
    isFeatured: true,
    isVerified: true,
    categories: ["Web Development", "Programming", "Computer Science"],
    slots: [
      { dayOffset: 1, startHour: 15, endHour: 16 },
      { dayOffset: 3, startHour: 19, endHour: 20 },
      { dayOffset: 5, startHour: 21, endHour: 22 },
    ],
  },
  {
    name: "Mithila Islam",
    email: "mithila.islam.tutor@mentora.dev",
    bio: "Economics and business tutor helping students connect theory with current market examples.",
    pricePerHr: 27,
    experience: 5,
    rating: 4.6,
    isFeatured: false,
    isVerified: true,
    categories: ["Economics", "Business"],
    slots: [
      { dayOffset: 2, startHour: 13, endHour: 14 },
      { dayOffset: 4, startHour: 18, endHour: 19 },
      { dayOffset: 6, startHour: 20, endHour: 21 },
    ],
  },
  {
    name: "Arif Hasan",
    email: "arif.hasan.tutor@mentora.dev",
    bio: "Computer science tutor for algorithms, data structures, and interview-style coding practice.",
    pricePerHr: 38,
    experience: 7,
    rating: 4.8,
    isFeatured: true,
    isVerified: true,
    categories: ["Computer Science", "Programming", "Mathematics"],
    slots: [
      { dayOffset: 1, startHour: 10, endHour: 11 },
      { dayOffset: 3, startHour: 14, endHour: 15 },
      { dayOffset: 5, startHour: 18, endHour: 19 },
    ],
  },
];

const buildSlotDate = (dayOffset: number, hour: number) => {
  const base = new Date();
  base.setUTCDate(base.getUTCDate() + dayOffset);
  base.setUTCHours(hour, 0, 0, 0);
  return base;
};

async function seedTutors() {
  try {
    console.log("***** Tutor Seeding Started *****");
    const defaultPassword = await bcrypt.hash("TutorPass123!", 8);

    for (const tutor of tutorSeeds) {
      const user = await prisma.user.upsert({
        where: { email: tutor.email },
        update: {
          name: tutor.name,
          role: "TUTOR",
          emailVerified: true,
          status: "ACTIVE",
          banned: false,
          banReason: null,
        },
        create: {
          name: tutor.name,
          email: tutor.email,
          password: defaultPassword,
          role: "TUTOR",
          emailVerified: true,
          status: "ACTIVE",
          banned: false,
        },
      });

      const tutorProfile = await prisma.tutorProfile.upsert({
        where: { userId: user.id },
        update: {
          bio: tutor.bio,
          pricePerHr: tutor.pricePerHr,
          experience: tutor.experience,
          rating: tutor.rating,
          isFeatured: tutor.isFeatured,
          isVerified: tutor.isVerified,
        },
        create: {
          userId: user.id,
          bio: tutor.bio,
          pricePerHr: tutor.pricePerHr,
          experience: tutor.experience,
          rating: tutor.rating,
          isFeatured: tutor.isFeatured,
          isVerified: tutor.isVerified,
        },
      });

      const categoryRecords = await Promise.all(
        tutor.categories.map((categoryName) =>
          prisma.category.upsert({
            where: { name: categoryName },
            update: {},
            create: { name: categoryName },
          }),
        ),
      );

      await prisma.tutorCategory.deleteMany({
        where: { tutorId: tutorProfile.id },
      });

      await prisma.tutorCategory.createMany({
        data: categoryRecords.map((category) => ({
          tutorId: tutorProfile.id,
          categoryId: category.id,
        })),
        skipDuplicates: true,
      });

      await prisma.availabilitySlot.deleteMany({
        where: { tutorId: tutorProfile.id },
      });

      await prisma.availabilitySlot.createMany({
        data: tutor.slots.map((slot) => ({
          tutorId: tutorProfile.id,
          startTime: buildSlotDate(slot.dayOffset, slot.startHour),
          endTime: buildSlotDate(slot.dayOffset, slot.endHour),
        })),
      });

      console.log(`Seeded tutor: ${tutor.name} (${tutor.email})`);
    }

    console.log("***** 10 tutors seeded successfully *****");
    console.log("Default password for all seeded tutors: TutorPass123!");
  } catch (error) {
    console.error("Tutor seeding failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

seedTutors();
