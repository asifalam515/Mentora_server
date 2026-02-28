import { Request, Response } from "express";
import { slotService } from "./slot.service";
// load slot for students also, so that they can see which slots are available for booking
const getAvailabilitySlots = async (req: Request, res: Response) => {
  try {
    const tutorId = req.params.tutorId as string;

    const slots = await slotService.getAvailabilitySlots(tutorId);
    res.status(200).json(slots);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Failed to retrieve availability slots" });
  }
};
const createTimeSlot = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id as string;

    const newSlot = await slotService.createTimeSlotService(req.body, userId);
    res.status(201).json(newSlot);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Failed to create time slot" });
  }
};
const getAvailabilitySlotsByTutorId = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id as string;

    const slots = await slotService.getAvailabilitySlotsByTutorId(userId);
    res.status(200).json(slots);
  } catch (error) {
    res.status(500).json({ error: "Failed to retrieve availability slots" });
  }
};
const deleteAvailabilitySlot = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id as string;
    const slotId = req.params.slotId as string;

    const slot = await slotService.deleteAvailabilitySlotById(slotId, userId);

    res.status(200).json(slot);
  } catch (error: any) {
    console.error("DELETE SLOT ERROR:", error.message);

    res.status(400).json({
      error: error.message || "Failed to delete availability slots",
    });
  }
};
const updateAvailAbility = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id as string;
    const slotId = req.params.slotId as string;
    const data = req.body;
    const slot = await slotService.updateAvailabilitySlotById(
      slotId,
      userId,
      data,
    );

    res.status(200).json(slot);
  } catch (error: any) {
    console.error("Update SLOT ERROR:", error.message);

    res.status(400).json({
      error: error.message || "Failed to delete availability slots",
    });
  }
};

export const slotController = {
  createTimeSlot,
  getAvailabilitySlotsByTutorId,
  deleteAvailabilitySlot,
  getAvailabilitySlots,
  updateAvailAbility,
};
