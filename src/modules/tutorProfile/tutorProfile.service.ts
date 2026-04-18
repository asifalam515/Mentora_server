import { TutorProfile } from "../../../generated/prisma/browser";
import { prisma } from "../../../lib/prisma";

const createTutorProfile = async (
  data: {
    bio: string;
    pricePerHr: number;
    experience: number;
    categoryIds?: string[];
    stripeConnectedAccountId?: string;
  },
  userId: string,
) => {
  return await prisma.$transaction(async (tx) => {
    // Create tutor profile
    const tutorProfile = await tx.tutorProfile.create({
      data: {
        bio: data.bio,
        pricePerHr: data.pricePerHr,
        experience: data.experience,
        userId: userId,
        stripeConnectedAccountId: data.stripeConnectedAccountId ?? null,
      },
    });

    // Add categories if provided
    if (data.categoryIds && data.categoryIds.length > 0) {
      const tutorCategories = data.categoryIds.map((categoryId) => ({
        tutorId: tutorProfile.id,
        categoryId,
      }));

      await tx.tutorCategory.createMany({
        data: tutorCategories,
        skipDuplicates: true,
      });
    }

    return await tx.tutorProfile.findUnique({
      where: { id: tutorProfile.id },
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
      },
    });
  });
};
export interface TutorFilters {
  search?: string;
  categoryIds?: string[];
  minRating?: number;
  maxPrice?: number;
  minPrice?: number;
  isFeatured?: boolean;
  isVerified?: boolean;
  page?: number;
  limit?: number;
  sortBy?: "rating" | "pricePerHr" | "experience" | "createdAt";
  sortOrder?: "asc" | "desc";
}

const getAllTutorProfiles = async (filters: TutorFilters) => {
  const {
    search,
    categoryIds = [],
    minRating,
    maxPrice,
    minPrice,
    isFeatured,
    isVerified,
    page = 1,
    limit = 10,
    sortBy = "rating",
    sortOrder = "desc",
  } = filters;

  const skip = (page - 1) * limit;

  const conditions: any[] = [];

  // // 🔹 Always ensure tutor has at least one category
  // conditions.push({
  //   categories: {
  //     some: {},
  //   },
  // });

  // 🔹 Search
  if (search) {
    conditions.push({
      OR: [
        { bio: { contains: search, mode: "insensitive" } },
        { user: { name: { contains: search, mode: "insensitive" } } },
      ],
    });
  }

  // 🔹 Category filter
  if (categoryIds.length > 0) {
    conditions.push({
      categories: {
        some: {
          categoryId: { in: categoryIds },
        },
      },
    });
  }

  // 🔹 Rating filter
  if (minRating !== undefined) {
    conditions.push({
      rating: { gte: minRating },
    });
  }

  // 🔹 Price filter (fixed version)
  if (minPrice !== undefined || maxPrice !== undefined) {
    conditions.push({
      pricePerHr: {
        gte: minPrice ?? 0,
        lte: maxPrice ?? Number.MAX_SAFE_INTEGER,
      },
    });
  }

  // 🔹 Flags
  if (isVerified !== undefined) {
    conditions.push({ isVerified });
  }

  if (isFeatured !== undefined) {
    conditions.push({ isFeatured });
  }

  const where = { AND: conditions };

  // 🔹 Total count
  const total = await prisma.tutorProfile.count({ where });

  // 🔹 Sorting
  const orderBy: any = {};
  orderBy[sortBy] = sortOrder;

  // 🔹 Fetch tutors
  const tutorsProfile = await prisma.tutorProfile.findMany({
    where,
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
      reviews: {
        take: 3,
        orderBy: { createdAt: "desc" },
        include: {
          student: {
            select: {
              name: true,
              image: true,
            },
          },
        },
      },
      availability: {
        where: {
          isBooked: false,
          startTime: { gt: new Date() },
        },
        take: 5,
      },
      _count: {
        select: {
          reviews: true,
          bookings: { where: { status: "COMPLETED" } },
        },
      },
    },
    orderBy,
    skip,
    take: limit,
  });

  // 🔹 Format response
  const formattedTutors = tutorsProfile.map((tutor) => ({
    id: tutor.id,
    name: tutor.user.name,
    email: tutor.user.email,
    image: tutor.user.image,
    bio: tutor.bio,
    pricePerHr: tutor.pricePerHr,
    rating: tutor.rating,
    experience: tutor.experience,
    isVerified: tutor.isVerified,
    createdAt: tutor.createdAt,

    categories: tutor.categories.map((c) => ({
      id: c.category.id,
      name: c.category.name,
    })),

    recentReviews: tutor.reviews.map((review) => ({
      id: review.id,
      rating: review.rating,
      comment: review.comment,
      createdAt: review.createdAt,
      studentName: review.student.name,
      studentImage: review.student.image,
    })),

    totalReviews: tutor._count.reviews,
    completedSessions: tutor._count.bookings,

    availableSlots: tutor.availability.length,
    nextAvailableSlot:
      tutor.availability.length > 0 ? tutor.availability[0]?.startTime : null,
  }));

  return {
    tutors: formattedTutors,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page * limit < total,
      hasPrevPage: page > 1,
    },
  };
};
const getTutorProfileByUserId = async (userId: string) => {
  const tutorProfile = await prisma.tutorProfile.findUnique({
    where: { userId: userId },
  });
  return tutorProfile;
};
const getTutorProfileByTutorId = async (tutorProfileId: string) => {
  const tutorProfile = await prisma.tutorProfile.findUnique({
    where: { id: tutorProfileId },
    include: {
      user: true,
      categories: {
        include: {
          category: true,
        },
      },
    },
  });
  return tutorProfile;
};
const updateTutorProfileById = async (
  updatedData: Partial<TutorProfile>,
  tutorProfileId: string,
) => {
  const updatedTutorProfile = await prisma.tutorProfile.update({
    where: { id: tutorProfileId },
    data: updatedData,
  });
  return updatedTutorProfile;
};
const deleteTutorProfileById = async (tutorProfileId: string) => {
  await prisma.tutorProfile.delete({
    where: { id: tutorProfileId },
  });
};

const avatarFallbacks = [
  "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTrKNa_1guK9qVnTWBnX7IBvjXJeXGuD8vDNw&s",
  "https://i.ibb.co.com/PpR00GD/Whats-App-Image-2026-02-08-at-2-01-16-PM.jpg",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80",
];

const getTopTutors = async () => {
  const tutors = await prisma.tutorProfile.findMany({
    where: {
      user: {
        role: "TUTOR",
        status: "ACTIVE",
      },
    },
    include: {
      user: {
        select: {
          name: true,
          image: true,
        },
      },
      categories: {
        include: {
          category: {
            select: {
              name: true,
            },
          },
        },
      },
      _count: {
        select: {
          bookings: {
            where: {
              status: "COMPLETED",
            },
          },
        },
      },
    },
    orderBy: [{ rating: "desc" }, { experience: "desc" }, { createdAt: "asc" }],
    take: 3,
  });

  return tutors.map((tutor, index) => ({
    name: tutor.user.name,
    subject: tutor.categories[0]?.category.name || "General",
    rating: Number(tutor.rating.toFixed(1)),
    students: tutor._count.bookings,
    avatar: tutor.user.image || avatarFallbacks[index % avatarFallbacks.length],
  }));
};

export const tutorProfileService = {
  createTutorProfile,
  getAllTutorProfiles,
  getTutorProfileByUserId,
  updateTutorProfileById,
  deleteTutorProfileById,
  getTutorProfileByTutorId,
  getTopTutors,
};
