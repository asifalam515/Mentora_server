import { Request, Response } from "express";
import { invoiceService } from "./invoice.service";

const listMyInvoices = async (req: Request, res: Response) => {
  try {
    const studentId = req.user?.id;
    if (!studentId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const invoices = await invoiceService.listMyInvoices(studentId);

    return res.status(200).json(invoices);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
};

const downloadInvoicePdf = async (req: Request, res: Response) => {
  try {
    const studentId = req.user?.id;
    const bookingId = req.params.bookingId as string;

    if (!studentId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const pdf = await invoiceService.generateInvoicePdfForStudent(
      studentId,
      bookingId,
    );

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${pdf.fileName}"`,
    );

    return res.status(200).send(pdf.buffer);
  } catch (error: any) {
    return res.status(404).json({ error: error.message });
  }
};

export const invoiceController = {
  listMyInvoices,
  downloadInvoicePdf,
};
