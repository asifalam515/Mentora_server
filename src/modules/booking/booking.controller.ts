import { Request, Response } from "express";
import { BookingStatus } from "../../../generated/prisma/client";
import { prisma } from "../../../lib/prisma";
import { bookingRelatedService } from "./booking.service";

const createBookingPaymentIntent = async (req: Request, res: Response) => {
  const studentId = req.user?.id;
  const { slotId } = req.body;

  try {
    if (!studentId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!slotId) {
      return res.status(400).json({ error: "slotId is required" });
    }

    const payload = await bookingRelatedService.createBookingPaymentIntent(
      studentId,
      slotId,
    );

    res.status(200).json(payload);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

const createBooking = async (req: Request, res: Response) => {
  const studentId = req.user?.id;
  const { slotId, paymentIntentId } = req.body;

  try {
    if (!studentId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!slotId || !paymentIntentId) {
      return res
        .status(400)
        .json({ error: "slotId and paymentIntentId are required" });
    }

    const booking = await bookingRelatedService.createBooking(
      studentId,
      slotId,
      paymentIntentId,
    );

    res.status(201).json(booking);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

const getBookings = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;
    const { status } = req.query;

    if (!userId || !userRole) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Optional filters (mainly for admin)
    const filters: any = {};
    if (userRole === "ADMIN") {
      if (req.query.studentId)
        filters.studentId = req.query.studentId as string;
      if (req.query.tutorId) filters.tutorId = req.query.tutorId as string;
      if (req.query.startDate)
        filters.startDate = new Date(req.query.startDate as string);
      if (req.query.endDate)
        filters.endDate = new Date(req.query.endDate as string);
    }

    const bookings = await bookingRelatedService.getBookings(
      userId,
      userRole,
      status as BookingStatus,
      filters,
    );

    res.json(bookings);
  } catch (error: any) {
    console.error("Error fetching bookings:", error);

    // Handle specific errors
    if (error.message === "Tutor profile not found") {
      return res.status(404).json({ error: error.message });
    }

    res.status(500).json({ error: "Failed to fetch bookings" });
  }
};
const getDashboard = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const role = req.user!.role;

    const data = await bookingRelatedService.getDashboardData(userId, role);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: "Failed to load dashboard" });
  }
};
const getTutorBookings = async (req: Request, res: Response) => {
  try {
    const tutorId = req.params.tutorId;
    const { status } = req.query;

    // Verify the tutor owns this profile
    const tutorProfile = await prisma.tutorProfile.findUnique({
      where: { userId: req.user?.id },
    });

    if (!tutorProfile || tutorProfile.id !== tutorId) {
      return res.status(403).json({ error: "Not authorized" });
    }

    const bookings = await bookingRelatedService.getTutorBookings(
      tutorId,
      status as BookingStatus,
    );
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch bookings" });
  }
};
const updateBookingStatus = async (req: Request, res: Response) => {
  try {
    const bookingId = req.params.bookingId as string;
    const { status } = req.body;

    const userId = req.user?.id;
    const role = req.user?.role;

    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    if (!status) return res.status(400).json({ error: "Status is required" });

    const booking = await bookingRelatedService.updateBookingStatus(
      bookingId,
      userId,
      role!,
      status,
    );

    res.json(booking);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};
const cancelBooking = async (req: Request, res: Response) => {
  try {
    const bookingId = req.params.bookingId as string;
    const studentId = req.user?.id;

    if (!studentId) return res.status(401).json({ error: "Unauthorized" });

    const booking = await bookingRelatedService.cancelBooking(
      bookingId,
      studentId,
    );
    res.json(booking);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};
const bookingCompletion = async (req: Request, res: Response) => {
  try {
    const bookingId = req.params.bookingId as string;
    const studentId = req.user?.id;

    if (!studentId) return res.status(401).json({ error: "Unauthorized" });

    const booking = await bookingRelatedService.bookingCompletion(
      bookingId,
      studentId,
    );
    res.json(booking);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};
export const bookingController = {
  createBookingPaymentIntent,
  createBooking,
  getBookings,
  getTutorBookings,
  cancelBooking,
  updateBookingStatus,
  bookingCompletion,
  getDashboard,
};
