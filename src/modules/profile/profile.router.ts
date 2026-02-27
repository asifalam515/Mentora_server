import { Router } from "express";
import auth, { UserRole } from "../../middleware/auth";
import {
  getProfile,
  updateAvailability,
  updateProfile,
} from "./profile.controller";

export const profileRouter = Router();
profileRouter.get(
  "/",
  auth(UserRole.admin, UserRole.tutor, UserRole.student),
  getProfile,
);
profileRouter.patch(
  "/",
  auth(UserRole.admin, UserRole.tutor, UserRole.student),
  updateProfile,
);
profileRouter.patch("/availability", auth(UserRole.tutor), updateAvailability);
