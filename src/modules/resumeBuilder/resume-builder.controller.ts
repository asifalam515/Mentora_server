import { Request, Response } from "express";
import { resumeBuilderService } from "./resume-builder.service";

const enhanceTutorResume = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id as string | undefined;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
      return;
    }

    const { tone, achievements, teachingStyle, specialties, applyToProfile } =
      req.body;

    const result = await resumeBuilderService.enhanceTutorResume({
      userId,
      tone,
      achievements,
      teachingStyle,
      specialties,
      applyToProfile,
    });

    res.status(200).json({
      success: true,
      message: "Tutor resume enhanced successfully",
      data: result,
    });
  } catch (error: any) {
    const message = error?.message || "Failed to enhance tutor resume";
    const statusCode =
      message === "Tutor profile not found. Please create profile first."
        ? 404
        : 500;

    res.status(statusCode).json({
      success: false,
      message,
    });
  }
};

export const resumeBuilderController = {
  enhanceTutorResume,
};
