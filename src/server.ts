import { toNodeHandler } from "better-auth/node";
import cors from "cors";
import express, { Request, Response } from "express";
import { auth } from "../lib/auth";
import { adminRouter } from "./modules/admin/admin.router";
import { slotRouter } from "./modules/availabilitySlot/slot.router";
import { bookingRouter } from "./modules/booking/booking.router";
import { categoryRouter } from "./modules/category/category.route";
import { reviewRouter } from "./modules/review/review.router";
import { categoriesRoute } from "./modules/tutorCategories/categories.route";
import { tutorProfileRouter } from "./modules/tutorProfile/tutorProfile.router";
const app = express();
const port = process.env.PORT || 5000;
app.use(
  cors({
    origin: [
      "https://skillbridge-client-self.vercel.app",
      "http://localhost:3000",
    ],
    credentials: true,
  }),
);

app.all("/api/auth/*splat", toNodeHandler(auth));
app.use(express.json());

app.get("/", (req: Request, res: Response) => {
  res.send("skillBridge project started!");
});
// tutor categories route
app.use("/api/v1/tutor-categories", categoriesRoute);
// category route
app.use("/api/v1/categories", categoryRouter);
// tutor profile route
app.use("/api/v1/tutor-profiles", tutorProfileRouter);
//availability slot route
app.use("/api/v1/availability-slots", slotRouter);
// booking related router
app.use("/api/v1/bookings", bookingRouter);
// review related router
app.use("/api/v1/reviews", reviewRouter);
// admin related router
app.use("/api/v1/admin", adminRouter);
app.get("/", (req, res) => {
  res.send("API is running");
});
app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
export default app;
