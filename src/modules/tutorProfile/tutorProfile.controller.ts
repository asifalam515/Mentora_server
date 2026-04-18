import { Request, Response } from "express";
import { tutorProfileService } from "./tutorProfile.service";
const createTutorProfile = async (req: Request, res: Response) => {
  try {
    const tutorProfileData = req.body;

    const userId = req.user?.id as string;

    if (req.user?.role != "TUTOR") {
      return res
        .status(403)
        .json({ error: "Only tutors can create tutor profiles" });
    }
    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }
    const newTutorProfile = await tutorProfileService.createTutorProfile(
      tutorProfileData,
      userId,
    );
    res.status(201).json(newTutorProfile);
  } catch (error) {
    console.error("Error creating tutor profile:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
export const getAllTutorProfiles = async (req: Request, res: Response) => {
  try {
    const search = req.query.search as string | undefined;

    // ✅ CategoryIds (fixed)
    const categoryParam = req.query.categoryIds;
    let categoryIds: string[] = [];

    if (Array.isArray(categoryParam)) {
      categoryIds = categoryParam.filter(
        (value): value is string => typeof value === "string",
      );
    } else if (typeof categoryParam === "string") {
      categoryIds = [categoryParam];
    }

    const minRating = req.query.minRating
      ? parseFloat(req.query.minRating as string)
      : undefined;

    const maxPrice = req.query.maxPrice
      ? parseFloat(req.query.maxPrice as string)
      : undefined;

    const minPrice = req.query.minPrice
      ? parseFloat(req.query.minPrice as string)
      : undefined;

    const isVerified =
      req.query.isVerified === "true"
        ? true
        : req.query.isVerified === "false"
          ? false
          : undefined;

    const isFeatured =
      req.query.isFeatured === "true"
        ? true
        : req.query.isFeatured === "false"
          ? false
          : undefined;

    // Pagination
    const page = req.query.page ? parseInt(req.query.page as string) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;

    // ✅ Sorting mapper (frontend friendly)
    let sortBy: any = "rating";
    let sortOrder: "asc" | "desc" = "desc";

    const sortParam = req.query.sortBy as string | undefined;

    if (sortParam === "price_low") {
      sortBy = "pricePerHr";
      sortOrder = "asc";
    } else if (sortParam === "price_high") {
      sortBy = "pricePerHr";
      sortOrder = "desc";
    } else if (sortParam === "experience") {
      sortBy = "experience";
      sortOrder = "desc";
    } else if (sortParam === "newest") {
      sortBy = "createdAt";
      sortOrder = "desc";
    }

    const filters = {
      ...(search !== undefined ? { search } : {}),
      ...(categoryIds.length > 0 ? { categoryIds } : {}),
      ...(minRating !== undefined ? { minRating } : {}),
      ...(maxPrice !== undefined ? { maxPrice } : {}),
      ...(minPrice !== undefined ? { minPrice } : {}),
      ...(isVerified !== undefined ? { isVerified } : {}),
      ...(isFeatured !== undefined ? { isFeatured } : {}),
      page,
      limit,
      sortBy,
      sortOrder,
    };

    const result = await tutorProfileService.getAllTutorProfiles(filters);

    res.status(200).json(result);
  } catch (error) {
    console.error("Error fetching tutor profiles:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
const getTutorProfileByUserId = async (req: Request, res: Response) => {
  try {
    const userId = req.params.userId as string;
    const tutorProfile =
      await tutorProfileService.getTutorProfileByUserId(userId);
    if (!tutorProfile) {
      return res.status(404).json({ error: "Tutor profile not found" });
    }
    res.status(200).json(tutorProfile);
  } catch (error) {
    console.error("Error fetching tutor profile:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
const getTutorProfileByTutorProfileId = async (req: Request, res: Response) => {
  try {
    const tutorProfileId = req.params.tutorProfileId as string;
    const tutorProfile =
      await tutorProfileService.getTutorProfileByTutorId(tutorProfileId);
    if (!tutorProfile) {
      return res.status(404).json({ error: "Tutor profile not found" });
    }
    res.status(200).json(tutorProfile);
  } catch (error) {
    console.error("Error fetching tutor profile:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const getTopTutors = async (_req: Request, res: Response) => {
  try {
    const topTutors = await tutorProfileService.getTopTutors();
    res.status(200).json(topTutors);
  } catch (error) {
    console.error("Error fetching top tutors:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const updateTutorProfileById = async (req: Request, res: Response) => {
  try {
    const tutorProfileId = req.params.id as string;
    const updatedData = req.body;
    const updatedTutorProfile =
      await tutorProfileService.updateTutorProfileById(
        updatedData,
        tutorProfileId,
      );
    res.status(200).json(updatedTutorProfile);
  } catch (error) {
    console.error("Error updating tutor profile:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
const deleteTutorProfileById = async (req: Request, res: Response) => {
  try {
    const tutorProfileId = req.params.id as string;
    await tutorProfileService.deleteTutorProfileById(tutorProfileId);
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting tutor profile:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
export const tutorProfileController = {
  createTutorProfile,
  getAllTutorProfiles,
  getTutorProfileByUserId,
  updateTutorProfileById,
  deleteTutorProfileById,
  getTutorProfileByTutorProfileId,
  getTopTutors,
};
