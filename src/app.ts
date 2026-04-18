import cookieParser from "cookie-parser";
import cors from "cors";
import express, { Request, Response } from "express";
import path from "path";
import { adminRouter } from "./modules/admin/admin.router";
import { AuthRouter } from "./modules/Auth/auth.router";
import { slotRouter } from "./modules/availabilitySlot/slot.router";
import { bookingRouter } from "./modules/booking/booking.router";
import { categoryRouter } from "./modules/category/category.route";
import { chatRouter } from "./modules/chat/chat.router";
import { invoiceRouter } from "./modules/invoice/invoice.router";
import { lessonPlanRouter } from "./modules/lessonPlan/lesson-plan.router";
import { notificationRouter } from "./modules/notification/notification.router";
import { profileRouter } from "./modules/profile/profile.router";
import { resumeBuilderRouter } from "./modules/resumeBuilder/resume-builder.router";
import { reviewRouter } from "./modules/review/review.router";
import { smartMatchRouter } from "./modules/smartMatch/smartMatch.router";
import { categoriesRoute } from "./modules/tutorCategories/categories.route";
import { tutorProfileRouter } from "./modules/tutorProfile/tutorProfile.router";

export const allowedOrigins = [
  "https://skill-bridge-4216.vercel.app",
  "http://localhost:3000",
  "http://localhost:5000",
];

const app = express();

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  }),
);

app.use(express.json());
app.use(cookieParser());
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

app.get("/", (_req: Request, res: Response) => {
  res.send("skillBridge project started!");
});

// auth related routes
app.use("/api/v1/", AuthRouter);
// tutor categories route
app.use("/api/v1/tutor-categories", categoriesRoute);
// category route
app.use("/api/v1/categories", categoryRouter);
// tutor profile route
app.use("/api/v1/tutor-profiles", tutorProfileRouter);
// availability slot route
app.use("/api/v1/availability-slots", slotRouter);
// booking related router
app.use("/api/v1/bookings", bookingRouter);
// chat related router
app.use("/api/v1/chats", chatRouter);
// invoice related router
app.use("/api/v1/invoices", invoiceRouter);
// notification related router
app.use("/api/v1/notifications", notificationRouter);
// review related router
app.use("/api/v1/reviews", reviewRouter);
// admin related router
app.use("/api/v1/admin", adminRouter);
// profile related router
app.use("/api/v1/profile", profileRouter);
// smart match router (AI-powered tutor matching)
app.use("/api/v1/smart-match", smartMatchRouter);
// lesson plan router (AI-powered personalized curriculum)
app.use("/api/v1/lesson-plans", lessonPlanRouter);
// resume builder router (AI-powered tutor bio enhancement)
app.use("/api/v1/resume-builder", resumeBuilderRouter);

export default app;
