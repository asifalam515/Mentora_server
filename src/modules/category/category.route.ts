import { Router } from "express";
import auth, { UserRole } from "../../middleware/auth";
import { categoryController } from "./category.controller";
export const categoryRouter = Router();
categoryRouter.get("/", categoryController.getAllCategory);
categoryRouter.post(
  "/",
  auth(UserRole.admin),

  categoryController.createCategoryByAdmin,
);
categoryRouter.put(
  "/:id",
  auth(UserRole.admin),
  categoryController.updateCategoryByAdmin,
);
categoryRouter.delete(
  "/:id",
  auth(UserRole.admin),
  categoryController.deleteCategoryByAdmin,
);
