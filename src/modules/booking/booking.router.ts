import { Router } from "express";
import auth, { UserRole } from "../../middleware/auth";
import { bookingController } from "./booking.controller";

export const bookingRouter = Router();
bookingRouter.get(
  "/dashboard",
  auth(UserRole.student, UserRole.tutor, UserRole.admin),
  bookingController.getDashboard,
);
bookingRouter.get(
  "/",
  auth(UserRole.student, UserRole.admin, UserRole.tutor),
  bookingController.getBookings,
);
// CANCEL BOOKING by STUDENT
bookingRouter.put(
  "/:bookingId",
  auth(UserRole.student),
  bookingController.cancelBooking,
);
// booking completion by STUDENT
bookingRouter.put(
  "/complete/:bookingId",
  auth(UserRole.student),
  bookingController.bookingCompletion,
);
// tutor routes
// get tutor bookings
bookingRouter.get(
  "/tutor/:tutorId",
  auth(UserRole.tutor, UserRole.admin),
  bookingController.getTutorBookings,
);
// universal route for updating booking status (CONFIRM/REJECT) by tutor or admin
bookingRouter.patch(
  "/status/:bookingId",
  auth(UserRole.tutor, UserRole.student, UserRole.admin),
  bookingController.updateBookingStatus,
);

bookingRouter.post(
  "/payment-intent",
  auth(UserRole.student),
  bookingController.createBookingPaymentIntent,
);
bookingRouter.post(
  "/",
  auth(UserRole.student),
  bookingController.createBooking,
);
