import { Router } from "express";
import auth, { UserRole } from "../../middleware/auth";
import { adminController } from "./admin.controller";

export const adminRouter = Router();
adminRouter.get(
  "/dashboard",

  adminController.getDashboardStats,
);
// User management
adminRouter.get("/users", adminController.getAllUsers);
adminRouter.get(
  "/users/:userId",
  auth(UserRole.admin),
  adminController.getUserDetails,
);
adminRouter.put(
  "/users/:userId/status",
  auth(UserRole.admin),
  adminController.updateUserStatus,
);
adminRouter.delete(
  "/users/:userId",
  auth(UserRole.admin),
  adminController.deleteUser,
);
adminRouter.put(
  "/tutors/:tutorId/verify",
  auth(UserRole.admin),

  adminController.verifyTutor,
);
// Booking management
adminRouter.get(
  "/bookings",
  auth(UserRole.admin),
  adminController.getAllBookings,
);
adminRouter.put(
  "/bookings/:bookingId/status",
  auth(UserRole.admin),

  adminController.updateBookingStatus,
);
