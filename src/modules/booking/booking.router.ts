import { Router } from "express";
import { auth, UserRole } from "../../middleware/auth";
import { bookingController } from "./booking.controller";

export const bookingRouter = Router();
bookingRouter.get(
  "/dashboard",
  auth(UserRole.STUDENT, UserRole.TUTOR, UserRole.ADMIN),
  bookingController.getDashboard,
);
bookingRouter.get(
  "/",
  auth(UserRole.STUDENT, UserRole.ADMIN, UserRole.TUTOR),
  bookingController.getBookings,
);
// CANCEL BOOKING by STUDENT
bookingRouter.put(
  "/:bookingId",
  auth(UserRole.STUDENT),
  bookingController.cancelBooking,
);
// booking completion by STUDENT
bookingRouter.put(
  "/complete/:bookingId",
  auth(UserRole.STUDENT),
  bookingController.bookingCompletion,
);
// tutor routes
// get tutor bookings
bookingRouter.get(
  "/tutor/:tutorId",
  auth(UserRole.TUTOR),
  bookingController.getTutorBookings,
);
// universal route for updating booking status (CONFIRM/REJECT) by tutor or admin
bookingRouter.patch(
  "/status/:bookingId",
  auth(UserRole.TUTOR, UserRole.STUDENT, UserRole.ADMIN),
  bookingController.updateBookingStatus,
);

bookingRouter.post("/", bookingController.createBooking);
