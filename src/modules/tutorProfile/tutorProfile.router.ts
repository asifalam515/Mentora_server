import { Router } from "express";
import auth, { UserRole } from "../../middleware/auth";
import { tutorProfileController } from "./tutorProfile.controller";

export const tutorProfileRouter = Router();
tutorProfileRouter.post(
  "/",
  auth(UserRole.tutor),
  tutorProfileController.createTutorProfile,
);
tutorProfileRouter.get("/", tutorProfileController.getAllTutorProfiles);
tutorProfileRouter.get("/top-tutors", tutorProfileController.getTopTutors);
tutorProfileRouter.get(
  "/:tutorProfileId",
  tutorProfileController.getTutorProfileByTutorProfileId,
);
tutorProfileRouter.get(
  "/:userId",
  tutorProfileController.getTutorProfileByUserId,
);

tutorProfileRouter.put(
  "/:id",
  auth(UserRole.tutor),
  tutorProfileController.updateTutorProfileById,
);
tutorProfileRouter.delete(
  "/:id",
  auth(UserRole.tutor, UserRole.admin),
  tutorProfileController.deleteTutorProfileById,
);
