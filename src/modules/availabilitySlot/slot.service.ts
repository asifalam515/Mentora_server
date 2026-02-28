import { prisma } from "../../../lib/prisma";

const getAvailabilitySlots = async (tutorId: string) => {
  const slots = await prisma.availabilitySlot.findMany({
    where: { tutorId: tutorId },
  });
  return slots;
};

const createTimeSlotService = async (data: any, userId: string) => {
  const tutorId = await prisma.tutorProfile
    .findUnique({
      where: { userId: userId },
    })
    .then((profile) => {
      if (!profile) {
        throw new Error("Tutor profile not found for the user");
      }
      return profile.id;
    });
  const newSlot = await prisma.availabilitySlot.create({
    data: {
      ...data,

      tutorId: tutorId,
    },
  });
  return newSlot;
};
const getAvailabilitySlotsByTutorId = async (userId: string) => {
  const tutorId = await prisma.tutorProfile
    .findUnique({
      where: { userId: userId },
    })
    .then((profile) => {
      if (!profile) {
        throw new Error("Tutor profile not found for the user");
      }
      return profile.id;
    });
  const slots = await prisma.availabilitySlot.findMany({
    where: { tutorId: tutorId },
  });
  return slots;
};
const deleteAvailabilitySlotById = async (slotId: string, userId: string) => {
  return await prisma.$transaction(async (tx) => {
    // 1. Find the tutor profile for the given user
    const tutorProfile = await tx.tutorProfile.findUnique({
      where: { userId },
    });

    if (!tutorProfile) {
      throw new Error("Tutor profile not found for the user");
    }

    // 2. Find the slot and verify it belongs to this tutor
    const slot = await tx.availabilitySlot.findUnique({
      where: { id: slotId },
    });

    if (!slot) {
      throw new Error("Slot not found");
    }

    if (slot.tutorId !== tutorProfile.id) {
      throw new Error("Not authorized to delete this slot");
    }

    // 3. Optionally: prevent deletion if slot is booked
    if (slot.isBooked) {
      throw new Error("Cannot delete a booked slot");
    }

    // 4. Delete the slot
    const deletedSlot = await tx.availabilitySlot.delete({
      where: { id: slotId },
    });

    return deletedSlot;
  });
};
const updateAvailabilitySlotById = async (
  slotId: string,
  userId: string,
  data: { startTime: Date; endTime: Date },
) => {
  return await prisma.$transaction(async (tx) => {
    // 1. Find the tutor profile for the given user
    const tutorProfile = await tx.tutorProfile.findUnique({
      where: { userId },
    });

    if (!tutorProfile) {
      throw new Error("Tutor profile not found for the user");
    }

    // 2. Find the slot and verify it belongs to this tutor
    const slot = await tx.availabilitySlot.findUnique({
      where: { id: slotId },
    });

    if (!slot) {
      throw new Error("Slot not found");
    }

    if (slot.tutorId !== tutorProfile.id) {
      throw new Error("Not authorized to update this slot");
    }

    // 3. Prevent update if slot is already booked
    if (slot.isBooked) {
      throw new Error("Cannot update a booked slot");
    }

    // 4. Validate new time range
    if (data.startTime >= data.endTime) {
      throw new Error("Start time must be before end time");
    }

    // 5. Optional: check for overlapping slots (excluding this one)
    const overlappingSlot = await tx.availabilitySlot.findFirst({
      where: {
        tutorId: tutorProfile.id,
        id: { not: slotId },
        OR: [
          {
            startTime: { lt: data.endTime },
            endTime: { gt: data.startTime },
          },
        ],
      },
    });

    if (overlappingSlot) {
      throw new Error("Updated slot overlaps with an existing slot");
    }

    // 6. Update the slot
    const updatedSlot = await tx.availabilitySlot.update({
      where: { id: slotId },
      data: {
        startTime: data.startTime,
        endTime: data.endTime,
      },
    });

    return updatedSlot;
  });
};
export const slotService = {
  createTimeSlotService,
  getAvailabilitySlotsByTutorId,
  deleteAvailabilitySlotById,
  getAvailabilitySlots,
  updateAvailabilitySlotById,
};
