import { Router } from "express";
import auth, { UserRole } from "../../middleware/auth";
import { categoryController } from "./category.controller";
export const categoryRouter = Router();
categoryRouter.post(
  "/",
  auth(UserRole.admin),

  categoryController.createCategoryByAdmin,
);
categoryRouter.get("/", categoryController.getAllCategory);
