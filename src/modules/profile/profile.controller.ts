// src/controllers/profile.controller.ts

import { Request, Response } from "express";
import { prisma } from "../../../lib/prisma";
import { profileService } from "./profile.service";

/**
 * GET /profile
 * Returns the profile of the authenticated user based on their role.
 */
export const getProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const profile = await profileService.getProfile(userId);
    res.json(profile);
  } catch (error: any) {
    console.error("Get profile error:", error);
    if (
      error.message === "User not found" ||
      error.message === "Tutor profile not found"
    ) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * PATCH /profile
 * Updates the authenticated user's profile. Allowed fields depend on role.
 */
export const updateProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const updated = await profileService.updateProfile(
      userId,

      req.body,
    );
    res.json(updated);
  } catch (error: any) {
    console.error("Update profile error:", error);
    if (
      error.message === "User not found" ||
      error.message === "Tutor profile not found"
    ) {
      return res.status(404).json({ error: error.message });
    }
    res.status(400).json({ error: error.message });
  }
};

/**
 * PATCH /profile/availability
 * Tutor-only: Updates availability slots (batch create/update/delete).
 * Expects body: { slots: Array<{ id?: string, startTime: string, endTime: string }> }
 */
export const updateAvailability = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const userRole = await prisma.user
      .findUnique({
        where: { id: userId },
        select: { role: true },
      })
      .then((u) => u?.role);

    if (!userRole) {
      return res.status(404).json({ error: "User not found" });
    }

    if (userRole !== "TUTOR") {
      return res
        .status(403)
        .json({ error: "Only tutors can update availability" });
    }

    const { slots } = req.body;
    if (!slots || !Array.isArray(slots)) {
      return res.status(400).json({ error: "Slots array is required" });
    }

    // Convert string dates to Date objects
    const parsedSlots = slots.map((slot: any) => ({
      id: slot.id,
      startTime: new Date(slot.startTime),
      endTime: new Date(slot.endTime),
      isBooked: slot.isBooked ?? false,
    }));

    const result = await profileService.updateAvailability(userId, parsedSlots);
    res.json(result);
  } catch (error: any) {
    console.error("Update availability error:", error);
    if (
      error.message.includes("Cannot delete booked slots") ||
      error.message.includes("Cannot update booked slot")
    ) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: "Internal server error" });
  }
};
