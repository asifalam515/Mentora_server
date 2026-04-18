import { Request, Response } from "express";
import { smartMatchService, type TutorWithReviews } from "./smartMatch.service";

const serializeTutor = (tutor: TutorWithReviews) => ({
  id: tutor.id,
  userId: tutor.userId,
  bio: tutor.bio,
  pricePerHr: tutor.pricePerHr,
  rating: tutor.rating,
  experience: tutor.experience,
  isVerified: tutor.isVerified,
  isFeatured: tutor.isFeatured,
  user: tutor.user,
  categories: tutor.categories.map((tc) => tc.category),
  reviews: tutor.reviews,
});

/**
 * POST /api/v1/smart-match
 * Find best tutor matches for a student's learning goal using Groq AI
 * Premium SaaS feature: Ultra-fast inference powered by Groq
 */
const findMatches = async (req: Request, res: Response) => {
  try {
    const { goal } = req.body;

    if (!goal) {
      res.status(400).json({
        success: false,
        message: "Learning goal is required",
        code: "MISSING_GOAL",
      });
      return;
    }

    // Try AI-powered matching with Groq first
    try {
      const matches = await smartMatchService.findSmartMatches(goal);
      res.status(200).json({
        success: true,
        data: matches,
        metadata: {
          aiProvider: "groq",
          responseTimeMs: matches.responseTime,
          cached: false,
        },
      });
    } catch (aiError: any) {
      // Fallback to simple matching if AI service fails
      console.warn("Groq AI matching failed, using fallback:", aiError.message);

      const matches = await smartMatchService.findSimpleMatches(goal);
      res.status(200).json({
        success: true,
        data: matches,
        metadata: {
          aiProvider: "fallback",
          fallbackReason: aiError.message,
        },
        warning:
          "Using keyword-based matching. AI analysis temporarily unavailable.",
      });
    }
  } catch (error: any) {
    console.error("Error in findMatches:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to find tutor matches",
      code: "MATCHING_ERROR",
    });
  }
};

/**
 * POST /api/v1/smart-match/detailed
 * More detailed analysis with category-specific recommendations
 */
const getDetailedMatches = async (req: Request, res: Response) => {
  try {
    const { goal, limit = 5 } = req.body;

    if (!goal) {
      res.status(400).json({
        success: false,
        message: "Learning goal is required",
      });
      return;
    }

    const tutors = await smartMatchService.getAllTutorsForMatching();

    if (tutors.length === 0) {
      res.status(400).json({
        success: false,
        message: "No tutors available",
      });
      return;
    }

    // Group tutors by category
    const categorizedTutors: Record<string, typeof tutors> = {};
    tutors.forEach((tutor) => {
      tutor.categories.forEach((tc) => {
        const categoryName = tc.category.name;
        if (!categorizedTutors[categoryName]) {
          categorizedTutors[categoryName] = [];
        }
        categorizedTutors[categoryName].push(tutor);
      });
    });

    // For each category, get top tutors
    const detailedRecommendations = Object.entries(categorizedTutors).map(
      ([category, categoryTutors]) => {
        const topInCategory = categoryTutors
          .sort((a, b) => b.rating - a.rating)
          .slice(0, Math.min(3, limit))
          .map((tutor) => serializeTutor(tutor));

        return {
          category,
          topTutors: topInCategory,
        };
      },
    );

    res.status(200).json({
      success: true,
      data: {
        goal,
        timestamp: new Date().toISOString(),
        byCategory: detailedRecommendations,
        totalTutors: tutors.length,
        categoriesCount: Object.keys(categorizedTutors).length,
      },
      metadata: {
        responseType: "category-based",
        analysisTier: "premium",
      },
    });
  } catch (error: any) {
    console.error("Error in getDetailedMatches:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to get detailed matches",
    });
  }
};

export const smartMatchController = {
  findMatches,
  getDetailedMatches,
};
