import PDFDocument from "pdfkit";
import { prisma } from "../../../lib/prisma";

type InvoicePdfResult = {
  fileName: string;
  buffer: Buffer;
};

const formatMoney = (amountCents: number, currency: string) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amountCents / 100);
};

const toPdfBuffer = (doc: any) => {
  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => chunks.push(Buffer.from(chunk)));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.end();
  });
};

const listMyInvoices = async (studentId: string) => {
  const invoices = await prisma.invoice.findMany({
    where: { studentId },
    include: {
      booking: {
        select: {
          id: true,
          date: true,
          status: true,
          paymentStatus: true,
          totalHours: true,
        },
      },
      tutor: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
    },
    orderBy: { issuedAt: "desc" },
  });

  return invoices.map((invoice) => ({
    id: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    status: invoice.status,
    amountCents: invoice.amountCents,
    commissionAmountCents: invoice.commissionAmountCents,
    tutorAmountCents: invoice.tutorAmountCents,
    currency: invoice.currency,
    issuedAt: invoice.issuedAt,
    booking: invoice.booking,
    tutor: {
      id: invoice.tutor.id,
      name: invoice.tutor.user.name,
      email: invoice.tutor.user.email,
    },
    downloadUrl: `/api/v1/invoices/booking/${invoice.bookingId}/pdf`,
  }));
};

const generateInvoicePdfForStudent = async (
  studentId: string,
  bookingId: string,
): Promise<InvoicePdfResult> => {
  const invoice = await prisma.invoice.findFirst({
    where: {
      bookingId,
      studentId,
    },
    include: {
      student: {
        select: {
          name: true,
          email: true,
        },
      },
      tutor: {
        include: {
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      },
      booking: {
        include: {
          slot: {
            select: {
              startTime: true,
              endTime: true,
            },
          },
        },
      },
    },
  });

  if (!invoice) {
    throw new Error("Invoice not found");
  }

  const doc = new PDFDocument({
    size: "A4",
    margin: 50,
  });

  doc
    .fontSize(22)
    .fillColor("#111827")
    .text("Mentora Invoice", { align: "left" });
  doc.moveDown(0.3);
  doc
    .fontSize(11)
    .fillColor("#4b5563")
    .text(`Invoice #: ${invoice.invoiceNumber}`);
  doc.text(`Issued: ${invoice.issuedAt.toISOString().slice(0, 10)}`);
  doc.text(`Booking ID: ${invoice.booking.id}`);

  doc.moveDown(1);
  doc.fontSize(14).fillColor("#111827").text("Billed To");
  doc.fontSize(11).fillColor("#374151").text(invoice.student.name);
  doc.text(invoice.student.email);

  doc.moveDown(0.8);
  doc.fontSize(14).fillColor("#111827").text("Tutor");
  doc.fontSize(11).fillColor("#374151").text(invoice.tutor.user.name);
  doc.text(invoice.tutor.user.email);

  doc.moveDown(1);
  doc.fontSize(14).fillColor("#111827").text("Session Summary");
  doc
    .fontSize(11)
    .fillColor("#374151")
    .text(`Session Date: ${invoice.booking.date.toISOString()}`);
  doc.text(`Start: ${invoice.booking.slot.startTime.toISOString()}`);
  doc.text(`End: ${invoice.booking.slot.endTime.toISOString()}`);
  doc.text(`Duration: ${invoice.booking.totalHours} hours`);
  doc.text(`Booking Status: ${invoice.booking.status}`);
  doc.text(`Payment Status: ${invoice.booking.paymentStatus}`);

  doc.moveDown(1);
  doc.fontSize(14).fillColor("#111827").text("Amount Breakdown");
  doc
    .fontSize(11)
    .fillColor("#374151")
    .text(`Total Paid: ${formatMoney(invoice.amountCents, invoice.currency)}`);
  doc.text(
    `Platform Commission (10%): ${formatMoney(invoice.commissionAmountCents, invoice.currency)}`,
  );
  doc.text(
    `Tutor Earnings: ${formatMoney(invoice.tutorAmountCents, invoice.currency)}`,
  );

  doc.moveDown(1);
  doc
    .fontSize(10)
    .fillColor("#6b7280")
    .text(
      "This is a system-generated invoice for your tutoring session on Mentora.",
    );

  const buffer = await toPdfBuffer(doc);

  await prisma.invoice.update({
    where: { id: invoice.id },
    data: { pdfGeneratedAt: new Date() },
  });

  return {
    fileName: `${invoice.invoiceNumber}.pdf`,
    buffer,
  };
};

export const invoiceService = {
  listMyInvoices,
  generateInvoicePdfForStudent,
};
