import { prisma } from "../../../lib/prisma";

const getAllCategories = async () => {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { name: "asc" },
    });
    return categories;
  } catch (error) {
    console.error("Error fetching categories:", error);
    throw error; // Re-throw to be caught by controller
  }
};

const createCategoryByAdmin = async (categoryData: any, userId: string) => {
  try {
    const createdCategory = await prisma.category.create({
      data: categoryData,
    });
    return createdCategory;
  } catch (error) {
    console.error("Error creating category:", error);
    throw error; // Re-throw to be caught by controller
  }
};
const addCategoriesToTutor = async (tutorId: string, categoryIds: string[]) => {
  return await prisma.$transaction(async (tx) => {
    // First, delete existing categories
    await tx.tutorCategory.deleteMany({
      where: { tutorId },
    });

    // Add new categories
    const tutorCategories = categoryIds.map((categoryId) => ({
      tutorId,
      categoryId,
    }));

    await tx.tutorCategory.createMany({
      data: tutorCategories,
      skipDuplicates: true,
    });

    // Return updated tutor with categories
    return await tx.tutorProfile.findUnique({
      where: { id: tutorId },
      include: {
        categories: {
          include: {
            category: true,
          },
        },
      },
    });
  });
};
const getTutorCategories = async (tutorId: string) => {
  const tutorCategories = await prisma.tutorCategory.findMany({
    where: { tutorId },
    include: {
      category: true,
    },
  });

  return tutorCategories.map((tc) => tc.category);
};
const getTutorsByCategory = async (
  categoryId: string,
  page: number = 1,
  limit: number = 10,
) => {
  const skip = (page - 1) * limit;

  const [tutorCategories, total] = await Promise.all([
    prisma.tutorCategory.findMany({
      where: { categoryId },
      include: {
        tutor: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
            _count: {
              select: {
                reviews: true,
              },
            },
          },
        },
      },
      skip,
      take: limit,
    }),
    prisma.tutorCategory.count({
      where: { categoryId },
    }),
  ]);

  const tutors = tutorCategories.map((tc) => ({
    ...tc.tutor,
    user: tc.tutor.user,
    reviewCount: tc.tutor._count.reviews,
  }));

  return {
    tutors,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};
const deleteCategoryByAdmin = async (id: string) => {
  try {
    // Optional: prevent deleting if used by tutors
    await prisma.tutorCategory.deleteMany({
      where: { categoryId: id },
    });

    const deleted = await prisma.category.delete({
      where: { id },
    });

    return deleted;
  } catch (error) {
    console.error("Error deleting category:", error);
    throw error;
  }
};
const updateCategoryByAdmin = async (id: string, name: string) => {
  try {
    const updated = await prisma.category.update({
      where: { id },
      data: { name },
    });
    return updated;
  } catch (error) {
    console.error("Error updating category:", error);
    throw error;
  }
};
export const categoryService = {
  createCategoryByAdmin,
  getAllCategories,
  addCategoriesToTutor,
  getTutorCategories,
  getTutorsByCategory,
  deleteCategoryByAdmin,
  updateCategoryByAdmin,
};
