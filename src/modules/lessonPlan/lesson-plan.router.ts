import express from "express";
import { lessonPlanController } from "./lesson-plan.controller";

export const lessonPlanRouter = express.Router();

/**
 * @route   POST /api/v1/lesson-plans/generate
 * @desc    Generate a personalized AI-powered lesson plan
 * @access  Public
 * @body    {
 *   studentGoal: string (required),
 *   duration: number (required, 1-52 weeks),
 *   studentLevel?: "beginner" | "intermediate" | "advanced",
 *   tutorId?: string,
 *   studentId?: string
 * }
 * @example POST /api/v1/lesson-plans/generate
 *          {
 *            "studentGoal": "Master React and Next.js for full-stack development",
 *            "duration": 12,
 *            "studentLevel": "intermediate",
 *            "tutorId": "uuid-123"
 *          }
 */
lessonPlanRouter.post("/generate", lessonPlanController.generateLessonPlan);

/**
 * @route   GET /api/v1/lesson-plans/:planId
 * @desc    Retrieve a specific lesson plan by ID
 * @access  Public
 * @params  planId (string)
 * @example GET /api/v1/lesson-plans/plan-uuid-123
 */
lessonPlanRouter.get("/:planId", lessonPlanController.getLessonPlan);

/**
 * @route   GET /api/v1/lesson-plans/student/:studentId
 * @desc    Get all lesson plans created for a student
 * @access  Public
 * @params  studentId (string)
 * @example GET /api/v1/lesson-plans/student/student-uuid-123
 */
lessonPlanRouter.get(
  "/student/:studentId",
  lessonPlanController.getStudentLessonPlans,
);

/**
 * @route   PATCH /api/v1/lesson-plans/:planId/status
 * @desc    Update lesson plan status (active, completed, archived)
 * @access  Public
 * @params  planId (string)
 * @body    { status: "active" | "completed" | "archived" }
 * @example PATCH /api/v1/lesson-plans/plan-uuid-123/status
 *          { "status": "completed" }
 */
lessonPlanRouter.patch(
  "/:planId/status",
  lessonPlanController.updateLessonPlanStatus,
);

/**
 * @route   DELETE /api/v1/lesson-plans/:planId
 * @desc    Delete a lesson plan
 * @access  Public
 * @params  planId (string)
 * @example DELETE /api/v1/lesson-plans/plan-uuid-123
 */
lessonPlanRouter.delete("/:planId", lessonPlanController.deleteLessonPlan);
