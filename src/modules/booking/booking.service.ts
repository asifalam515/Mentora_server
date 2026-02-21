import { BookingStatus, Role } from "../../../generated/prisma/enums";
import { prisma } from "../../../lib/prisma";

export const bookingService = {
  async getAvailableSlots(tutorId: string, date: Date) {
    // Logic to get available slots for a tutor on a specific date
    return prisma.availabilitySlot.findMany({
      where: {
        tutorId,

        isBooked: false,
        startTime: date
          ? {
              gte: new Date(date.setHours(0, 0, 0, 0)),
              lt: new Date(date.setHours(23, 59, 59, 999)),
            }
          : { gte: new Date() }, // Future slots only
      },
      orderBy: { startTime: "asc" },
    });
  },
};
const getDashboardData = async (userId: string, role: Role) => {
  const now = new Date();

  // ===============================
  // Build role-based filter
  // ===============================
  let where: any = {};

  if (role === "STUDENT") {
    where.studentId = userId;
  }

  if (role === "TUTOR") {
    const tutorProfile = await prisma.tutorProfile.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!tutorProfile) throw new Error("Tutor profile not found");
    where.tutorId = tutorProfile.id;
  }

  // ADMIN -> no filter (sees all)

  // ===============================
  // Fetch all bookings
  // ===============================
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

  // ===============================
  // Split upcoming vs past
  // ===============================
  const upcomingBookings = bookings.filter(
    (b) => new Date(b.date) >= now && b.status !== "CANCELLED",
  );

  const pastBookings = bookings.filter(
    (b) => new Date(b.date) < now || b.status === "COMPLETED",
  );

  // ===============================
  // Stats
  // ===============================
  const stats = {
    total: bookings.length,
    upcoming: upcomingBookings.length,
    completed: bookings.filter((b) => b.status === "COMPLETED").length,
    cancelled: bookings.filter((b) => b.status === "CANCELLED").length,
  };

  return {
    stats,
    upcomingBookings,
    pastBookings,
  };
};
// Create a booking
const createBooking = async (studentId: string, slotId: string) => {
  return await prisma.$transaction(async (tx) => {
    // 1. Check if slot exists and is available
    const slot = await tx.availabilitySlot.findUnique({
      where: { id: slotId, isBooked: false },
      include: { tutor: true },
    });

    if (!slot) {
      throw new Error("Time slot not found or already booked");
    }

    // 3. Check if student is trying to book themselves (student != tutor)
    const tutorUser = await tx.user.findUnique({
      where: { id: slot.tutor.userId },
    });

    if (tutorUser?.id === studentId) {
      throw new Error("Cannot book your own tutoring session");
    }

    // 4. Check if student already has overlapping booking
    const existingBooking = await tx.booking.findFirst({
      where: {
        studentId,
        status: { in: ["PENDING", "CONFIRMED"] },
        slot: {
          startTime: { lt: slot.endTime },
          endTime: { gt: slot.startTime },
        },
      },
    });

    if (existingBooking) {
      throw new Error("You already have a booking during this time");
    }

    // 5. Create the booking
    const booking = await tx.booking.create({
      data: {
        studentId,
        tutorId: slot.tutorId,
        slotId: slot.id,
        date: slot.startTime,
        status: "PENDING",
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

    // 6. Mark slot as booked
    await tx.availabilitySlot.update({
      where: { id: slotId },
      data: { isBooked: true },
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
  // optionally add other filters like startDate, endDate, tutorId, etc.
) => {
  // Build where condition based on role
  let where: any = {};
  if (userRole === "STUDENT") {
    where.studentId = userId;
  } else if (userRole === "TUTOR") {
    // Need to get tutor profile id from userId
    const tutorProfile = await prisma.tutorProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!tutorProfile) {
      throw new Error("Tutor profile not found");
    }
    where.tutorId = tutorProfile.id;
  } else if (userRole === "ADMIN") {
    // admin can see all, optionally apply filters
    // maybe allow filtering by studentId, tutorId, etc. via additional params
  } else {
    throw new Error("Invalid user role");
  }

  // Add status filter if provided
  if (status) {
    where.status = status;
  }

  // Optional: add date range filters if provided as parameters

  return await prisma.booking.findMany({
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
  return await prisma.booking.findMany({
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
  return await prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) throw new Error("Booking not found");

    // =========================
    // STUDENT LOGIC
    // =========================
    if (role === "STUDENT") {
      if (booking.studentId !== userId) throw new Error("Not authorized");

      if (status !== "CANCELLED")
        throw new Error("Students can only cancel bookings");
    }

    // =========================
    // TUTOR LOGIC
    // =========================
    if (role === "TUTOR") {
      const tutorProfile = await tx.tutorProfile.findUnique({
        where: { userId },
        select: { id: true },
      });

      if (!tutorProfile) throw new Error("Tutor profile not found");

      if (booking.tutorId !== tutorProfile.id)
        throw new Error("Not authorized");

      // optional restrictions
      const allowed = ["CONFIRMED", "CANCELLED", "COMPLETED"];
      if (!allowed.includes(status))
        throw new Error("Invalid status for tutor");
    }

    // =========================
    // ADMIN LOGIC
    // =========================
    if (role === "ADMIN") {
      // admin can do anything
    }

    // =========================
    // Free slot if cancelled
    // =========================
    if (status === "CANCELLED") {
      await tx.availabilitySlot.update({
        where: { id: booking.slotId },
        data: { isBooked: false },
      });
    }

    return await tx.booking.update({
      where: { id: bookingId },
      data: { status },
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
  return await prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) throw new Error("Booking not found");
    if (booking.studentId !== studentId) throw new Error("Not authorized");

    // Free up the slot
    await tx.availabilitySlot.update({
      where: { id: booking.slotId },
      data: { isBooked: false },
    });

    return await tx.booking.update({
      where: { id: bookingId },
      data: { status: "CANCELLED" },
    });
  });
};
const bookingCompletion = async (bookingId: string, studentId: string) => {
  return await prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) throw new Error("Booking not found");
    if (booking.studentId !== studentId) throw new Error("Not authorized");
    if (booking.status !== "CONFIRMED")
      throw new Error("Only confirmed bookings can be completed");

    return await tx.booking.update({
      where: { id: bookingId },
      data: { status: "COMPLETED" },
    });
  });
};

export const bookingRelatedService = {
  createBooking,
  getBookings,
  getTutorBookings,
  updateBookingStatus,
  cancelBooking,
  bookingCompletion,
  getDashboardData,
};
