import { Request, Response } from "express";
import { categoryService } from "../category/category.service";
import { categoriesService } from "./categories.service";
const getAllCategories = async (req: Request, res: Response) => {
  try {
    const categories = await categoriesService.getAllCategories();
    res.json(categories);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch categories",
    });
  }
};
const createCategory = async (req: Request, res: Response) => {
  try {
    const category = await categoriesService.createCategory(req.body);
    res.status(201).json({
      success: true,
      data: category,
      message: "Category created successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to create category",
    });
  }
};
const addTutorCategories = async (req: Request, res: Response) => {
  try {
    const tutorId = req.params.tutorId as string;
    const { categoryIds } = req.body;

    if (!categoryIds || !Array.isArray(categoryIds)) {
      return res.status(400).json({ error: "Category IDs array is required" });
    }

    const updatedTutor = await categoryService.addCategoriesToTutor(
      tutorId,
      categoryIds,
    );
    res.json(updatedTutor);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to add categories to tutor" });
  }
};
export const categoriesController = {
  createCategory,
  addTutorCategories,
  getAllCategories,
};
