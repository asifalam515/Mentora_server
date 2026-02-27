import { Request, Response } from "express";

export function notFound(req: Request, res: Response) {
  res.status(404).json({
    message: "This route is not available!!",
    path: req.originalUrl,
    date: Date(),
  });
}
