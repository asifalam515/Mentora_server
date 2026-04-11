import { Router } from "express";
import auth, { UserRole } from "../../middleware/auth";
import { invoiceController } from "./invoice.controller";

export const invoiceRouter = Router();

invoiceRouter.get(
  "/my",
  auth(UserRole.student),
  invoiceController.listMyInvoices,
);
invoiceRouter.get(
  "/booking/:bookingId/pdf",
  auth(UserRole.student),
  invoiceController.downloadInvoicePdf,
);
