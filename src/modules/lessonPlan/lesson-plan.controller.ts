import { Request, Response } from "express";
import { lessonPlanService } from "./lesson-plan.service";

/**
 * POST /api/v1/lesson-plans/generate
 * Generate an AI-powered personalized lesson plan
 */
const generateLessonPlan = async (req: Request, res: Response) => {
  try {
    const {
      studentGoal,
      duration,
      studentLevel = "intermediate",
      tutorId,
      studentId,
    } = req.body;

    // Validate required fields
    if (!studentGoal) {
      res.status(400).json({
        success: false,
        message: "Student goal is required",
        code: "MISSING_GOAL",
      });
      return;
    }

    if (!duration) {
      res.status(400).json({
        success: false,
        message: "Duration (in weeks) is required",
        code: "MISSING_DURATION",
      });
      return;
    }

    const result = await lessonPlanService.generateLessonPlan({
      studentGoal,
      duration: parseInt(duration as string),
      studentLevel,
      tutorId,
      studentId,
    });

    res.status(201).json(result);
  } catch (error: any) {
    console.error("Error generating lesson plan:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to generate lesson plan",
      error: error.message,
    });
  }
};

/**
 * GET /api/v1/lesson-plans/:planId
 * Retrieve a lesson plan by ID
 */
const getLessonPlan = async (req: Request, res: Response) => {
  try {
    const { planId } = req.params;

    if (!planId) {
      res.status(400).json({
        success: false,
        message: "Plan ID is required",
        code: "MISSING_PLAN_ID",
      });
      return;
    }

    const plan = await lessonPlanService.getLessonPlanById(planId);

    res.status(200).json({
      success: true,
      data: plan,
    });
  } catch (error: any) {
    console.error("Error retrieving lesson plan:", error);

    if (error.message === "Lesson plan not found") {
      res.status(404).json({
        success: false,
        message: "Lesson plan not found",
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: error.message || "Failed to retrieve lesson plan",
    });
  }
};

/**
 * GET /api/v1/lesson-plans/student/:studentId
 * Get all lesson plans for a student
 */
const getStudentLessonPlans = async (req: Request, res: Response) => {
  try {
    const { studentId } = req.params;

    if (!studentId) {
      res.status(400).json({
        success: false,
        message: "Student ID is required",
        code: "MISSING_STUDENT_ID",
      });
      return;
    }

    const plans = await lessonPlanService.getStudentLessonPlans(studentId);

    res.status(200).json({
      success: true,
      data: plans,
      count: plans.length,
    });
  } catch (error: any) {
    console.error("Error retrieving student lesson plans:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to retrieve lesson plans",
    });
  }
};

/**
 * PATCH /api/v1/lesson-plans/:planId/status
 * Update lesson plan status
 */
const updateLessonPlanStatus = async (req: Request, res: Response) => {
  try {
    const { planId } = req.params;
    const { status } = req.body;

    if (!planId) {
      res.status(400).json({
        success: false,
        message: "Plan ID is required",
      });
      return;
    }

    if (!status || !["active", "completed", "archived"].includes(status)) {
      res.status(400).json({
        success: false,
        message: "Valid status required: active, completed, or archived",
      });
      return;
    }

    const updated = await lessonPlanService.updateLessonPlanStatus(
      planId,
      status,
    );

    res.status(200).json({
      success: true,
      data: updated,
      message: "Lesson plan status updated successfully",
    });
  } catch (error: any) {
    console.error("Error updating lesson plan status:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to update lesson plan status",
    });
  }
};

/**
 * DELETE /api/v1/lesson-plans/:planId
 * Delete a lesson plan
 */
const deleteLessonPlan = async (req: Request, res: Response) => {
  try {
    const { planId } = req.params;

    if (!planId) {
      res.status(400).json({
        success: false,
        message: "Plan ID is required",
      });
      return;
    }

    await lessonPlanService.deleteLessonPlan(planId);

    res.status(200).json({
      success: true,
      message: "Lesson plan deleted successfully",
    });
  } catch (error: any) {
    console.error("Error deleting lesson plan:", error);

    if (
      error.message &&
      error.message.includes("Record to delete does not exist")
    ) {
      res.status(404).json({
        success: false,
        message: "Lesson plan not found",
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: error.message || "Failed to delete lesson plan",
    });
  }
};

export const lessonPlanController = {
  generateLessonPlan,
  getLessonPlan,
  getStudentLessonPlans,
  updateLessonPlanStatus,
  deleteLessonPlan,
};
