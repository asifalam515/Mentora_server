import { Router } from "express";
import auth, { UserRole } from "../../middleware/auth";
import { categoriesController } from "./categories.controller";

export const categoriesRoute = Router();
categoriesRoute.get("/", categoriesController.getAllCategories);
categoriesRoute.post("/", categoriesController.createCategory);
categoriesRoute.post(
  "/tutor/:tutorId",
  auth(UserRole.tutor),
  categoriesController.addTutorCategories,
);
