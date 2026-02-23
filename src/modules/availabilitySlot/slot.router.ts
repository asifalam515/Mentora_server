import { Router } from "express";
import { auth, UserRole } from "../../middleware/auth";
import { slotController } from "./slot.controller";

export const slotRouter = Router();
slotRouter.get(
  "/",
  auth(UserRole.TUTOR, UserRole.STUDENT, UserRole.ADMIN),
  slotController.getAvailabilitySlotsByTutorId,
);
slotRouter.get(
  "/tutor/:tutorId",

  slotController.getAvailabilitySlots,
);
// get availability slots for a tutor

slotRouter.post("/", auth(UserRole.TUTOR), slotController.createTimeSlot);
// get all availability slots for a tutor, this will be used by students to see which slots are available for booking

slotRouter.delete(
  "/:slotId",
  auth(UserRole.TUTOR, UserRole.ADMIN),
  slotController.deleteAvailabilitySlot,
);
