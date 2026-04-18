import bcrypt from "bcryptjs";
import { prisma } from "../../lib/prisma";

type ReviewSeed = {
  tutorEmail: string;
  studentName: string;
  studentEmail: string;
  rating: number;
  comment: string;
  hours: number;
};

const reviewSeeds: ReviewSeed[] = [
  {
    tutorEmail: "ayesha.rahman.tutor@mentora.dev",
    studentName: "Mahin Ahmed",
    studentEmail: "mahin.ahmed.student@mentora.dev",
    rating: 5,
    comment:
      "Ayesha explains calculus in a very clear way. My weekly test scores improved within a month.",
    hours: 2,
  },
  {
    tutorEmail: "nafis.chowdhury.tutor@mentora.dev",
    studentName: "Nusrat Jahan",
    studentEmail: "nusrat.jahan.student@mentora.dev",
    rating: 4,
    comment:
      "Great at breaking down hard physics problems. Would love a bit more homework feedback.",
    hours: 1.5,
  },
  {
    tutorEmail: "tania.sultana.tutor@mentora.dev",
    studentName: "Sajib Hasan",
    studentEmail: "sajib.hasan.student@mentora.dev",
    rating: 5,
    comment:
      "Organic chemistry finally makes sense to me. Her reaction-mapping method is excellent.",
    hours: 2,
  },
  {
    tutorEmail: "imran.hossain.tutor@mentora.dev",
    studentName: "Rida Karim",
    studentEmail: "rida.karim.student@mentora.dev",
    rating: 5,
    comment:
      "Very practical coding sessions. I built my first complete project after learning with him.",
    hours: 2,
  },
  {
    tutorEmail: "farhana.kabir.tutor@mentora.dev",
    studentName: "Tanvir Alam",
    studentEmail: "tanvir.alam.student@mentora.dev",
    rating: 4,
    comment:
      "Strong data science guidance and clean explanations. Pace is fast but very productive.",
    hours: 1.5,
  },
  {
    tutorEmail: "rafi.mahmud.tutor@mentora.dev",
    studentName: "Mou Das",
    studentEmail: "mou.das.student@mentora.dev",
    rating: 4,
    comment:
      "Good IELTS speaking practice and structured vocabulary sessions. Helpful weekly plan.",
    hours: 1,
  },
  {
    tutorEmail: "samia.karim.tutor@mentora.dev",
    studentName: "Aritra Dey",
    studentEmail: "aritra.dey.student@mentora.dev",
    rating: 5,
    comment:
      "Samia made biology revision easy with diagrams and memory techniques. Highly recommended.",
    hours: 2,
  },
  {
    tutorEmail: "fahim.anwar.tutor@mentora.dev",
    studentName: "Tanjim Noor",
    studentEmail: "tanjim.noor.student@mentora.dev",
    rating: 5,
    comment:
      "Excellent mentorship on React and APIs. I now understand how to structure full-stack apps.",
    hours: 2,
  },
  {
    tutorEmail: "mithila.islam.tutor@mentora.dev",
    studentName: "Priya Sen",
    studentEmail: "priya.sen.student@mentora.dev",
    rating: 4,
    comment:
      "Her market-based examples made economics much easier to follow for my exams.",
    hours: 1.5,
  },
  {
    tutorEmail: "arif.hasan.tutor@mentora.dev",
    studentName: "Shafin Reza",
    studentEmail: "shafin.reza.student@mentora.dev",
    rating: 5,
    comment:
      "Great algorithm coaching with interview-style practice. Very focused and motivating sessions.",
    hours: 2,
  },
];

const buildPastDate = (daysAgo: number, hour: number) => {
  const base = new Date();
  base.setUTCDate(base.getUTCDate() - daysAgo);
  base.setUTCHours(hour, 0, 0, 0);
  return base;
};

async function seedTutorReviews() {
  try {
    console.log("***** Tutor Review Seeding Started *****");
    const defaultStudentPassword = await bcrypt.hash("StudentPass123!", 8);

    for (let index = 0; index < reviewSeeds.length; index += 1) {
      const reviewSeed = reviewSeeds[index];

      const tutor = await prisma.tutorProfile.findFirst({
        where: {
          user: {
            email: reviewSeed.tutorEmail,
          },
        },
      });

      if (!tutor) {
        console.warn(
          `Tutor not found for email ${reviewSeed.tutorEmail}. Skipping review seed.`,
        );
        continue;
      }

      const student = await prisma.user.upsert({
        where: { email: reviewSeed.studentEmail },
        update: {
          name: reviewSeed.studentName,
          role: "STUDENT",
          emailVerified: true,
          status: "ACTIVE",
          banned: false,
          banReason: null,
        },
        create: {
          name: reviewSeed.studentName,
          email: reviewSeed.studentEmail,
          password: defaultStudentPassword,
          role: "STUDENT",
          emailVerified: true,
          status: "ACTIVE",
          banned: false,
        },
      });

      const daysAgo = 14 + index;
      const startTime = buildPastDate(daysAgo, 10 + (index % 6));
      const endTime = buildPastDate(daysAgo, 11 + (index % 6));

      const existingSlot = await prisma.availabilitySlot.findFirst({
        where: {
          tutorId: tutor.id,
          startTime,
        },
      });

      const slot =
        existingSlot ||
        (await prisma.availabilitySlot.create({
          data: {
            tutorId: tutor.id,
            startTime,
            endTime,
            isBooked: true,
          },
        }));

      const totalAmountCents = Math.round(
        reviewSeed.hours * tutor.pricePerHr * 100,
      );
      const commissionAmountCents = Math.round(totalAmountCents * 0.15);
      const tutorAmountCents = totalAmountCents - commissionAmountCents;

      let booking = await prisma.booking.findFirst({
        where: {
          studentId: student.id,
          tutorId: tutor.id,
          date: startTime,
        },
      });

      if (!booking) {
        booking = await prisma.booking.create({
          data: {
            studentId: student.id,
            tutorId: tutor.id,
            slotId: slot.id,
            date: startTime,
            status: "COMPLETED",
            paymentStatus: "PAID",
            totalHours: reviewSeed.hours,
            totalAmountCents,
            commissionAmountCents,
            tutorAmountCents,
            currency: "usd",
          },
        });
      }

      await prisma.review.upsert({
        where: { bookingId: booking.id },
        update: {
          studentId: student.id,
          tutorId: tutor.id,
          rating: reviewSeed.rating,
          comment: reviewSeed.comment,
        },
        create: {
          studentId: student.id,
          tutorId: tutor.id,
          bookingId: booking.id,
          rating: reviewSeed.rating,
          comment: reviewSeed.comment,
        },
      });

      await prisma.availabilitySlot.update({
        where: { id: slot.id },
        data: { isBooked: true },
      });

      console.log(
        `Seeded review for ${reviewSeed.tutorEmail} by ${reviewSeed.studentEmail} (${reviewSeed.rating}/5)`,
      );
    }

    const ratingSummaries = await prisma.review.groupBy({
      by: ["tutorId"],
      _avg: {
        rating: true,
      },
    });

    for (const summary of ratingSummaries) {
      await prisma.tutorProfile.update({
        where: { id: summary.tutorId },
        data: { rating: Number((summary._avg.rating || 0).toFixed(1)) },
      });
    }

    console.log("***** Tutor reviews seeded successfully *****");
    console.log("Default password for seeded students: StudentPass123!");
  } catch (error) {
    console.error("Tutor review seeding failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

seedTutorReviews();
