import express from "express";
import { smartMatchController } from "./smartMatch.controller";

export const smartMatchRouter = express.Router();

/**
 * @route   POST /api/v1/smart-match
 * @desc    Find best tutor matches for a student's learning goal using AI
 * @access  Public
 * @body    { goal: string }
 * @example POST /api/v1/smart-match
 *          { "goal": "I want to learn TypeScript for backend development" }
 */
smartMatchRouter.post("/", smartMatchController.findMatches);

/**
 * @route   POST /api/v1/smart-match/detailed
 * @desc    Get detailed category-wise tutor recommendations
 * @access  Public
 * @body    { goal: string, limit?: number }
 * @example POST /api/v1/smart-match/detailed
 *          { "goal": "React and Next.js web development", "limit": 3 }
 */
smartMatchRouter.post("/detailed", smartMatchController.getDetailedMatches);
