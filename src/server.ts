import cors from "cors";
import express, { Request, Response } from "express";
import { AuthRouter } from "./modules/Auth/auth.router";
const app = express();
const port = process.env.PORT || 5000;
app.use(
  cors({
    origin: [
      "https://skill-bridge-4216.vercel.app",
      "http://localhost:3000",
      "http://localhost:5000",
    ],
    credentials: true,
  }),
);

app.use(express.json());

app.get("/", (req: Request, res: Response) => {
  res.send("skillBridge project started!");
});

// auth related routes
app.use("/api/v1/", AuthRouter);
// // tutor categories route
// app.use("/api/v1/tutor-categories", categoriesRoute);
// // category route
// app.use("/api/v1/categories", categoryRouter);
// // tutor profile route
// app.use("/api/v1/tutor-profiles", tutorProfileRouter);
// //availability slot route
// app.use("/api/v1/availability-slots", slotRouter);
// // booking related router
// app.use("/api/v1/bookings", bookingRouter);
// // review related router
// app.use("/api/v1/reviews", reviewRouter);
// // admin related router
// app.use("/api/v1/admin", adminRouter);
// // profile related router
// app.use("/api/v1/profile", profileRouter);
app.get("/", (req, res) => {
  res.send("API is running");
});
app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
export default app;
