import { Router } from "express";
import auth, { UserRole } from "../../middleware/auth";
import { slotController } from "./slot.controller";

export const slotRouter = Router();
slotRouter.get(
  "/",
  auth(UserRole.admin, UserRole.student, UserRole.tutor),
  slotController.getAvailabilitySlotsByTutorId,
);
slotRouter.get(
  "/tutor/:tutorId",

  slotController.getAvailabilitySlots,
);
// get availability slots for a tutor

slotRouter.post("/", auth(UserRole.tutor), slotController.createTimeSlot);
// get all availability slots for a tutor, this will be used by students to see which slots are available for booking

slotRouter.delete(
  "/:slotId",
  auth(UserRole.tutor, UserRole.admin),
  slotController.deleteAvailabilitySlot,
);
