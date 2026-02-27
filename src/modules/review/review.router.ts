import { Router } from "express";
import auth, { UserRole } from "../../middleware/auth";
import { reviewController } from "./review.controller";

export const reviewRouter = Router();
reviewRouter.post("/", auth(UserRole.student), reviewController.createReview);
