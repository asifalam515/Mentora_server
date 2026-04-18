import { TutorCategory } from "../../../generated/prisma/browser";
import { prisma } from "../../../lib/prisma";

const getAllCategories = async () => {
  const categories = await prisma.tutorCategory.findMany({
    include: {
      category: true,
    },
  });
  return categories;
};
const createCategory = async (categoryData: TutorCategory) => {
  const newCategory = await prisma.tutorCategory.create({
    data: categoryData,
    include: {
      category: true,
    },
  });
  return newCategory;
};

export const categoriesService = {
  createCategory,
  getAllCategories,
};
