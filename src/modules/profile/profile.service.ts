import { prisma } from "../../../lib/prisma";
import { UserRole } from "./../../middleware/auth";

// ----------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------

export interface StudentProfileData {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  role: UserRole;
  createdAt: Date;
  bookings?: any[]; // optional, can be expanded
  reviews?: any[];
}

export interface TutorProfileData {
  id: string; // tutor profile id
  userId: string;
  name: string;
  email: string;
  image?: string | null;
  bio: string;
  headline?: string | null; // if you have it
  pricePerHr: number;
  rating: number;
  experience: number;
  isVerified: boolean;
  categories: { id: string; name: string }[];
  availability: AvailabilitySlotData[];
  // ... other tutor fields
}

export interface AdminProfileData {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  role: UserRole;
  createdAt: Date;
  // admin specific stats can be added later
}

export interface AvailabilitySlotData {
  id: string;
  startTime: Date;
  endTime: Date;
  isBooked: boolean;
}

// Input for updating availability (batch)
export interface AvailabilitySlotInput {
  id?: string; // if updating existing slot
  startTime: Date;
  endTime: Date;
  isBooked?: boolean; // usually false when creating
}

// ----------------------------------------------------------------------
// Profile Service
// ----------------------------------------------------------------------

export const profileService = {
  /**
   * Get profile information based on user role.
   * - STUDENT: returns basic user info + bookings & reviews.
   * - TUTOR: returns full tutor profile with categories and availability.
   * - ADMIN: returns user info (admin has no separate profile).
   */
  async getProfile(userId: string) {
    const role = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    switch (role?.role) {
      case "STUDENT":
        return this.getStudentProfile(userId);
      case "TUTOR":
        return this.getTutorProfile(userId);
      case "ADMIN":
        return this.getAdminProfile(userId);
      default:
        throw new Error("Invalid user role");
    }
  },

  /**
   * Update profile based on role. Allowed fields are restricted.
   * - STUDENT: can update name, email, image, etc.
   * - TUTOR: can update bio, headline, pricePerHr, experience, categories.
   * - ADMIN: can update name, email, image, role? (maybe limited)
   */
  async updateProfile(userId: string, data: any) {
    const role = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    switch (role?.role) {
      case "STUDENT":
        return this.updateStudentProfile(userId, data);
      case "TUTOR":
        return this.updateTutorProfile(userId, data);
      case "ADMIN":
        return this.updateAdminProfile(userId, data);
      default:
        throw new Error("Invalid user role");
    }
  },

  /**
   * Tutor-specific: update availability slots (create, update, delete).
   * Accepts an array of slots. If slot has an id, it updates; otherwise creates.
   * Slots not in the array (but belonging to tutor) can be deleted if desired.
   */
  async updateAvailability(userId: string, slots: AvailabilitySlotInput[]) {
    const tutorId = await prisma.tutorProfile
      .findUnique({
        where: { userId },
        select: { id: true },
      })
      .then((t) => t?.id);

    if (!tutorId) {
      throw new Error("Tutor profile not found");
    }
    return await prisma.$transaction(async (tx) => {
      // First, get all existing slots for this tutor
      const existingSlots = await tx.availabilitySlot.findMany({
        where: { tutorId },
        select: { id: true },
      });
      const existingIds = existingSlots.map((s) => s.id);

      // Determine which slots to keep/update
      const incomingIds = slots.filter((s) => s.id).map((s) => s.id!);

      // Delete slots that are not in the incoming list (and are not booked)
      const idsToDelete = existingIds.filter((id) => !incomingIds.includes(id));
      if (idsToDelete.length > 0) {
        // Ensure they are not booked
        const booked = await tx.availabilitySlot.findMany({
          where: { id: { in: idsToDelete }, isBooked: true },
        });
        if (booked.length > 0) {
          throw new Error("Cannot delete booked slots");
        }
        await tx.availabilitySlot.deleteMany({
          where: { id: { in: idsToDelete } },
        });
      }

      // Now upsert each slot
      const results = [];
      for (const slot of slots) {
        if (slot.id) {
          // Update existing slot (only if not booked)
          const existing = await tx.availabilitySlot.findUnique({
            where: { id: slot.id },
          });
          if (!existing) throw new Error(`Slot ${slot.id} not found`);
          if (existing.isBooked) {
            throw new Error(`Cannot update booked slot ${slot.id}`);
          }
          const updated = await tx.availabilitySlot.update({
            where: { id: slot.id },
            data: {
              startTime: slot.startTime,
              endTime: slot.endTime,
              // isBooked remains as is (should be false)
            },
          });
          results.push(updated);
        } else {
          // Create new slot
          const created = await tx.availabilitySlot.create({
            data: {
              tutorId,
              startTime: slot.startTime,
              endTime: slot.endTime,
              isBooked: slot.isBooked ?? false,
            },
          });
          results.push(created);
        }
      }

      return results;
    });
  },

  async getStudentProfile(userId: string): Promise<StudentProfileData> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        createdAt: true,
        bookings: {
          include: {
            tutor: {
              include: {
                user: { select: { name: true, email: true, image: true } },
              },
            },
            slot: true,
          },
          orderBy: { date: "desc" },
          take: 10,
        },
        reviews: {
          include: {
            tutor: {
              include: {
                user: { select: { name: true } },
              },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 5,
        },
      },
    });

    if (!user) throw new Error("User not found");
    return user;
  },

  async getTutorProfile(userId: string): Promise<TutorProfileData> {
    const tutorProfile = await prisma.tutorProfile.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        categories: {
          include: {
            category: true,
          },
        },
        availability: {
          where: { startTime: { gt: new Date() } },
          orderBy: { startTime: "asc" },
        },
        _count: {
          select: {
            reviews: true,
            bookings: { where: { status: "COMPLETED" } },
          },
        },
      },
    });

    if (!tutorProfile) throw new Error("Tutor profile not found");

    return {
      id: tutorProfile.id,
      userId: tutorProfile.userId,
      name: tutorProfile.user.name,
      email: tutorProfile.user.email,
      image: tutorProfile.user.image,
      bio: tutorProfile.bio,
      headline: (tutorProfile as any).headline, // if you have it
      pricePerHr: tutorProfile.pricePerHr,
      rating: tutorProfile.rating,
      experience: tutorProfile.experience,
      isVerified: tutorProfile.isVerified,
      categories: tutorProfile.categories.map((c) => ({
        id: c.category.id,
        name: c.category.name,
      })),
      availability: tutorProfile.availability.map((a) => ({
        id: a.id,
        startTime: a.startTime,
        endTime: a.endTime,
        isBooked: a.isBooked,
      })),
      totalReviews: tutorProfile._count.reviews,
      completedSessions: tutorProfile._count.bookings,
    };
  },

  async getAdminProfile(userId: string): Promise<AdminProfileData> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        createdAt: true,
      },
    });
    if (!user) throw new Error("User not found");
    return user;
  },

  async updateStudentProfile(userId: string, data: any) {
    // Allowed fields for student
    const allowedFields = ["name", "email", "image"];
    const updateData: any = {};
    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        updateData[field] = data[field];
      }
    }
    return prisma.user.update({
      where: { id: userId },
      data: updateData,
    });
  },

  async updateTutorProfile(userId: string, data: any) {
    // First get the tutor profile id
    const tutorProfile = await prisma.tutorProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!tutorProfile) throw new Error("Tutor profile not found");

    // Allowed fields for tutor (on TutorProfile)
    const allowedProfileFields = [
      "bio",
      "headline",
      "pricePerHr",
      "experience",
    ];
    const profileUpdate: any = {};
    for (const field of allowedProfileFields) {
      if (data[field] !== undefined) {
        profileUpdate[field] = data[field];
      }
    }

    // Handle category updates if provided
    const { categoryIds } = data;

    return await prisma.$transaction(async (tx) => {
      // Update basic profile
      const updatedProfile = await tx.tutorProfile.update({
        where: { id: tutorProfile.id },
        data: profileUpdate,
      });

      // Update categories if provided
      if (categoryIds !== undefined) {
        // Remove existing categories
        await tx.tutorCategory.deleteMany({
          where: { tutorId: tutorProfile.id },
        });
        // Add new categories
        if (categoryIds.length > 0) {
          await tx.tutorCategory.createMany({
            data: categoryIds.map((catId: string) => ({
              tutorId: tutorProfile.id,
              categoryId: catId,
            })),
            skipDuplicates: true,
          });
        }
      }

      // Return updated profile with categories
      return tx.tutorProfile.findUnique({
        where: { id: tutorProfile.id },
        include: {
          categories: { include: { category: true } },
          user: { select: { name: true, email: true, image: true } },
        },
      });
    });
  },

  async updateAdminProfile(userId: string, data: any) {
    // Admins can update name, email, image (maybe role cautiously)
    const allowedFields = ["name", "email", "image"];
    const updateData: any = {};
    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        updateData[field] = data[field];
      }
    }
    return prisma.user.update({
      where: { id: userId },
      data: updateData,
    });
  },
};
