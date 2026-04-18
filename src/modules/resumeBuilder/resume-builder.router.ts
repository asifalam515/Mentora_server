import express from "express";
import auth, { UserRole } from "../../middleware/auth";
import { resumeBuilderController } from "./resume-builder.controller";

export const resumeBuilderRouter = express.Router();

/**
 * @route POST /api/v1/resume-builder/enhance
 * @desc AI-powered tutor profile enhancement for better marketplace visibility
 * @access Tutor only
 */
resumeBuilderRouter.post(
  "/enhance",
  auth(UserRole.tutor),
  resumeBuilderController.enhanceTutorResume,
);
