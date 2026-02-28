import { Request, Response } from "express";
import { categoryService } from "./category.service";

const createCategoryByAdmin = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }
    const category = await categoryService.createCategoryByAdmin(
      req.body,
      req.user?.id as string,
    );
    res.status(201).json({
      success: true,
      data: category,
      message: "Category created successfully by admin",
    });
  } catch (error: any) {
    // Log the actual error for debugging
    console.error("Category creation error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create category by admin",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};
const getAllCategory = async (req: Request, res: Response) => {
  try {
    const results = await categoryService.getAllCategories();
    res.status(200).json({
      success: true,
      data: results,
      message: "Retrieved all Category",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to retrieve all category",
    });
  }
};
const updateCategoryByAdmin = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const { id } = req.params;
    const { name } = req.body;

    const updated = await categoryService.updateCategoryByAdmin(id, name);

    res.status(200).json({
      success: true,
      data: updated,
      message: "Category updated successfully",
    });
  } catch (error: any) {
    console.error("Update category error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update category",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};
const deleteCategoryByAdmin = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const { id } = req.params;

    await categoryService.deleteCategoryByAdmin(id);

    res.status(200).json({
      success: true,
      message: "Category deleted successfully",
    });
  } catch (error: any) {
    console.error("Delete category error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to delete category",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};
export const categoryController = {
  createCategoryByAdmin,
  getAllCategory,
  updateCategoryByAdmin,
  deleteCategoryByAdmin,
};
