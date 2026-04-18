import Stripe from "stripe";
import {
  BookingStatus,
  InvoiceStatus,
  PaymentStatus,
  Role,
} from "../../../generated/prisma/enums";
import { prisma } from "../../../lib/prisma";

const createInvoiceNumber = (bookingId: string) => {
  const slug = bookingId.replace(/-/g, "").slice(0, 12).toUpperCase();
  return `INV-${new Date().getFullYear()}-${slug}`;
};

const PLATFORM_COMMISSION_PERCENT = 10;
const DEFAULT_CURRENCY = (process.env.STRIPE_CURRENCY || "usd").toLowerCase();

let stripeClient: Stripe | null = null;

const getStripeClient = () => {
  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }

  if (!stripeClient) {
    stripeClient = new Stripe(secretKey);
  }

  return stripeClient;
};

const toCents = (amount: number) => Math.round(amount * 100);

const parseIntegerMeta = (
  value: string | null | undefined,
  fallback: number,
) => {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const parseFloatMeta = (value: string | null | undefined, fallback: number) => {
  if (!value) return fallback;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const calculateSlotAmounts = (
  startTime: Date,
  endTime: Date,
  pricePerHr: number,
) => {
  const durationMs = endTime.getTime() - startTime.getTime();
  if (durationMs <= 0) {
    throw new Error("Invalid slot duration");
  }

  const totalHours = Number((durationMs / (1000 * 60 * 60)).toFixed(2));
  const totalAmountCents = toCents(totalHours * pricePerHr);

  if (totalAmountCents <= 0) {
    throw new Error("Payment amount must be greater than zero");
  }

  const commissionAmountCents = Math.round(
    (totalAmountCents * PLATFORM_COMMISSION_PERCENT) / 100,
  );
  const tutorAmountCents = totalAmountCents - commissionAmountCents;

  return {
    totalHours,
    totalAmountCents,
    commissionAmountCents,
    tutorAmountCents,
  };
};

export const bookingService = {
  async getAvailableSlots(tutorId: string, date: Date) {
    return prisma.availabilitySlot.findMany({
      where: {
        tutorId,
        isBooked: false,
        startTime: date
          ? {
              gte: new Date(date.setHours(0, 0, 0, 0)),
              lt: new Date(date.setHours(23, 59, 59, 999)),
            }
          : { gte: new Date() },
      },
      orderBy: { startTime: "asc" },
    });
  },
};

const getDashboardData = async (userId: string, role: Role) => {
  const now = new Date();
  const where: Record<string, unknown> = {};

  if (role === Role.STUDENT) {
    where.studentId = userId;
  }

  if (role === Role.TUTOR) {
    const tutorProfile = await prisma.tutorProfile.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!tutorProfile) throw new Error("Tutor profile not found");
    where.tutorId = tutorProfile.id;
  }

  const bookings = await prisma.booking.findMany({
    where,
    include: {
      student: { select: { name: true, email: true } },
      tutor: {
        include: {
          user: { select: { name: true, email: true } },
        },
      },
      slot: true,
    },
    orderBy: { date: "asc" },
  });

  const upcomingBookings = bookings.filter(
    (b) => new Date(b.date) >= now && b.status !== BookingStatus.CANCELLED,
  );

  const pastBookings = bookings.filter(
    (b) => new Date(b.date) < now || b.status === BookingStatus.COMPLETED,
  );

  const stats = {
    total: bookings.length,
    upcoming: upcomingBookings.length,
    completed: bookings.filter((b) => b.status === BookingStatus.COMPLETED)
      .length,
    cancelled: bookings.filter((b) => b.status === BookingStatus.CANCELLED)
      .length,
  };

  return {
    stats,
    upcomingBookings,
    pastBookings,
  };
};

const createBookingPaymentIntent = async (
  studentId: string,
  slotId: string,
) => {
  const slot = await prisma.availabilitySlot.findFirst({
    where: {
      id: slotId,
      isBooked: false,
    },
    include: {
      tutor: {
        select: {
          id: true,
          userId: true,
          pricePerHr: true,
        },
      },
    },
  });

  if (!slot) {
    throw new Error("Time slot not found or already booked");
  }

  if (slot.tutor.userId === studentId) {
    throw new Error("Cannot book your own tutoring session");
  }

  const existingBooking = await prisma.booking.findFirst({
    where: {
      studentId,
      status: { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] },
      slot: {
        startTime: { lt: slot.endTime },
        endTime: { gt: slot.startTime },
      },
    },
  });

  if (existingBooking) {
    throw new Error("You already have a booking during this time");
  }

  const student = await prisma.user.findUnique({
    where: { id: studentId },
    select: {
      id: true,
      email: true,
      name: true,
      stripeCustomerId: true,
    },
  });

  if (!student) {
    throw new Error("Student not found");
  }

  const {
    totalHours,
    totalAmountCents,
    commissionAmountCents,
    tutorAmountCents,
  } = calculateSlotAmounts(slot.startTime, slot.endTime, slot.tutor.pricePerHr);

  const stripe = getStripeClient();
  let customerId = student.stripeCustomerId;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: student.email,
      name: student.name,
      metadata: {
        userId: student.id,
      },
    });

    customerId = customer.id;

    await prisma.user.update({
      where: { id: studentId },
      data: { stripeCustomerId: customerId },
    });
  }

  const paymentIntent = await stripe.paymentIntents.create({
    amount: totalAmountCents,
    currency: DEFAULT_CURRENCY,
    customer: customerId,
    automatic_payment_methods: { enabled: true },
    metadata: {
      slotId: slot.id,
      studentId,
      tutorId: slot.tutor.id,
      totalHours: String(totalHours),
      totalAmountCents: String(totalAmountCents),
      commissionAmountCents: String(commissionAmountCents),
      tutorAmountCents: String(tutorAmountCents),
    },
  });

  return {
    paymentIntentId: paymentIntent.id,
    clientSecret: paymentIntent.client_secret,
    currency: paymentIntent.currency,
    totalHours,
    totalAmountCents,
    commissionAmountCents,
    tutorAmountCents,
  };
};

const createBooking = async (
  studentId: string,
  slotId: string,
  paymentIntentId: string,
) => {
  const existing = await prisma.booking.findUnique({
    where: { stripePaymentIntentId: paymentIntentId },
    include: {
      student: {
        select: { id: true, name: true, email: true },
      },
      tutor: {
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      },
      slot: true,
    },
  });

  if (existing) {
    if (existing.studentId !== studentId) {
      throw new Error("Payment intent does not belong to this student");
    }
    return existing;
  }

  const stripe = getStripeClient();
  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, {
    expand: ["latest_charge"],
  });

  if (paymentIntent.status !== "succeeded") {
    throw new Error("Payment has not been completed");
  }

  if (paymentIntent.metadata.studentId !== studentId) {
    throw new Error("Payment intent does not belong to this student");
  }

  if (paymentIntent.metadata.slotId !== slotId) {
    throw new Error("Payment intent is for a different slot");
  }

  return prisma.$transaction(async (tx) => {
    const slot = await tx.availabilitySlot.findFirst({
      where: { id: slotId, isBooked: false },
      include: {
        tutor: {
          select: { userId: true, pricePerHr: true },
        },
      },
    });

    if (!slot) {
      throw new Error("Time slot not found or already booked");
    }

    if (slot.tutor.userId === studentId) {
      throw new Error("Cannot book your own tutoring session");
    }

    const conflict = await tx.booking.findFirst({
      where: {
        studentId,
        status: { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] },
        slot: {
          startTime: { lt: slot.endTime },
          endTime: { gt: slot.startTime },
        },
      },
    });

    if (conflict) {
      throw new Error("You already have a booking during this time");
    }

    const fallbackAmounts = calculateSlotAmounts(
      slot.startTime,
      slot.endTime,
      slot.tutor.pricePerHr,
    );

    const totalAmountCents = parseIntegerMeta(
      paymentIntent.metadata.totalAmountCents,
      fallbackAmounts.totalAmountCents,
    );
    const commissionAmountCents = parseIntegerMeta(
      paymentIntent.metadata.commissionAmountCents,
      fallbackAmounts.commissionAmountCents,
    );
    const tutorAmountCents = parseIntegerMeta(
      paymentIntent.metadata.tutorAmountCents,
      fallbackAmounts.tutorAmountCents,
    );
    const totalHours = parseFloatMeta(
      paymentIntent.metadata.totalHours,
      fallbackAmounts.totalHours,
    );

    if (paymentIntent.amount_received !== totalAmountCents) {
      throw new Error("Paid amount does not match booking amount");
    }

    const latestCharge = paymentIntent.latest_charge;
    const stripeChargeId =
      typeof latestCharge === "string"
        ? latestCharge
        : (latestCharge?.id ?? null);

    const booking = await tx.booking.create({
      data: {
        studentId,
        tutorId: slot.tutorId,
        slotId: slot.id,
        date: slot.startTime,
        status: BookingStatus.PENDING,
        paymentStatus: PaymentStatus.PAID,
        totalHours,
        totalAmountCents,
        commissionAmountCents,
        tutorAmountCents,
        currency: paymentIntent.currency,
        stripePaymentIntentId: paymentIntent.id,
        stripeChargeId,
      },
      include: {
        student: {
          select: { id: true, name: true, email: true },
        },
        tutor: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        },
        slot: true,
      },
    });

    await tx.availabilitySlot.update({
      where: { id: slotId },
      data: { isBooked: true },
    });

    await tx.invoice.create({
      data: {
        invoiceNumber: createInvoiceNumber(booking.id),
        bookingId: booking.id,
        studentId: booking.studentId,
        tutorId: booking.tutorId,
        amountCents: booking.totalAmountCents,
        commissionAmountCents: booking.commissionAmountCents,
        tutorAmountCents: booking.tutorAmountCents,
        currency: booking.currency,
        status: InvoiceStatus.ISSUED,
      },
    });

    return booking;
  });
};

const getBookings = async (
  userId: string,
  userRole: Role,
  status?: BookingStatus,
  filters?: {
    studentId?: string;
    tutorId?: string;
    startDate?: Date;
    endDate?: Date;
  },
) => {
  const where: Record<string, unknown> = {};

  if (userRole === Role.STUDENT) {
    where.studentId = userId;
  } else if (userRole === Role.TUTOR) {
    const tutorProfile = await prisma.tutorProfile.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!tutorProfile) {
      throw new Error("Tutor profile not found");
    }

    where.tutorId = tutorProfile.id;
  } else if (userRole === Role.ADMIN) {
    if (filters?.studentId) where.studentId = filters.studentId;
    if (filters?.tutorId) where.tutorId = filters.tutorId;
    if (filters?.startDate || filters?.endDate) {
      where.date = {
        gte: filters.startDate,
        lte: filters.endDate,
      };
    }
  } else {
    throw new Error("Invalid user role");
  }

  if (status) {
    where.status = status;
  }

  return prisma.booking.findMany({
    where,
    include: {
      student: {
        select: { id: true, name: true, email: true },
      },
      tutor: {
        include: {
          user: {
            select: { name: true, email: true },
          },
        },
      },
      slot: true,
      review: true,
    },
    orderBy: { date: "asc" },
  });
};

const getTutorBookings = async (tutorId: string, status?: BookingStatus) => {
  return prisma.booking.findMany({
    where: {
      tutorId,
      ...(status && { status }),
    },
    include: {
      student: {
        select: { id: true, name: true, email: true },
      },
      slot: true,
    },
    orderBy: { date: "asc" },
  });
};

const updateBookingStatus = async (
  bookingId: string,
  userId: string,
  role: Role,
  status: BookingStatus,
) => {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
  });

  if (!booking) throw new Error("Booking not found");

  if (role === Role.STUDENT) {
    if (booking.studentId !== userId) throw new Error("Not authorized");

    if (status !== BookingStatus.CANCELLED) {
      throw new Error("Students can only cancel bookings");
    }
  }

  if (role === Role.TUTOR) {
    const tutorProfile = await prisma.tutorProfile.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!tutorProfile) throw new Error("Tutor profile not found");

    if (booking.tutorId !== tutorProfile.id) throw new Error("Not authorized");

    const allowed: BookingStatus[] = [
      BookingStatus.CONFIRMED,
      BookingStatus.CANCELLED,
      BookingStatus.COMPLETED,
    ];

    if (!allowed.includes(status)) {
      throw new Error("Invalid status for tutor");
    }
  }

  const bookingUpdateData: {
    status: BookingStatus;
    paymentStatus?: PaymentStatus;
    stripeTransferId?: string;
    stripeRefundId?: string;
  } = {
    status,
  };

  if (
    status === BookingStatus.CONFIRMED &&
    booking.paymentStatus === PaymentStatus.PAID
  ) {
    const tutorProfile = await prisma.tutorProfile.findUnique({
      where: { id: booking.tutorId },
      select: { stripeConnectedAccountId: true },
    });

    // Tutors can confirm bookings even before setting up a Stripe connected account.
    // Transfer is attempted only when payout destination and charge info are available.
    if (tutorProfile?.stripeConnectedAccountId && booking.stripeChargeId) {
      const stripe = getStripeClient();
      const transfer = await stripe.transfers.create({
        amount: booking.tutorAmountCents,
        currency: booking.currency,
        destination: tutorProfile.stripeConnectedAccountId,
        source_transaction: booking.stripeChargeId,
        metadata: {
          bookingId: booking.id,
        },
      });

      bookingUpdateData.paymentStatus = PaymentStatus.TRANSFERRED;
      bookingUpdateData.stripeTransferId = transfer.id;
    }
  }

  if (
    status === BookingStatus.CANCELLED &&
    (booking.paymentStatus === PaymentStatus.PAID ||
      booking.paymentStatus === PaymentStatus.TRANSFERRED)
  ) {
    const stripe = getStripeClient();
    const paymentIntentId = booking.stripePaymentIntentId;
    if (!paymentIntentId) {
      throw new Error("Stripe payment intent ID missing for this booking");
    }

    if (booking.stripeTransferId) {
      await stripe.transfers.createReversal(booking.stripeTransferId, {
        amount: booking.tutorAmountCents,
        metadata: {
          bookingId: booking.id,
          reason: "booking_cancelled",
        },
      });
    }

    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      metadata: {
        bookingId: booking.id,
        reason: "booking_cancelled",
      },
    });

    bookingUpdateData.paymentStatus = PaymentStatus.REFUNDED;
    bookingUpdateData.stripeRefundId = refund.id;
  }

  return prisma.$transaction(async (tx) => {
    if (status === BookingStatus.CANCELLED) {
      await tx.availabilitySlot.update({
        where: { id: booking.slotId },
        data: { isBooked: false },
      });

      await tx.invoice.updateMany({
        where: { bookingId: booking.id },
        data: { status: InvoiceStatus.REFUNDED },
      });
    }

    return tx.booking.update({
      where: { id: bookingId },
      data: bookingUpdateData,
      include: {
        student: { select: { name: true, email: true } },
        tutor: {
          include: {
            user: { select: { name: true, email: true } },
          },
        },
        slot: true,
      },
    });
  });
};

const cancelBooking = async (bookingId: string, studentId: string) => {
  return updateBookingStatus(
    bookingId,
    studentId,
    Role.STUDENT,
    BookingStatus.CANCELLED,
  );
};

const bookingCompletion = async (bookingId: string, studentId: string) => {
  return prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) throw new Error("Booking not found");
    if (booking.studentId !== studentId) throw new Error("Not authorized");
    if (booking.status !== BookingStatus.CONFIRMED) {
      throw new Error("Only confirmed bookings can be completed");
    }

    return tx.booking.update({
      where: { id: bookingId },
      data: { status: BookingStatus.COMPLETED },
    });
  });
};

export const bookingRelatedService = {
  createBookingPaymentIntent,
  createBooking,
  getBookings,
  getTutorBookings,
  updateBookingStatus,
  cancelBooking,
  bookingCompletion,
  getDashboardData,
};
