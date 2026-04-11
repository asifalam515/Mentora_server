import "express";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: "STUDENT" | "TUTOR" | "ADMIN";
        status: "ACTIVE" | "BANNED";
      };
      file?: Multer.File;
      cookies?: Record<string, string>;
    }
  }
}
