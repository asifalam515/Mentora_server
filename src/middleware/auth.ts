import { NextFunction, Request, Response } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import { prisma } from "../../lib/prisma";
import { secret } from "../modules/Auth/auth.service";

export enum UserRole {
  admin = "ADMIN",
  student = "STUDENT",
  tutor = "TUTOR",
}
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

const auth = (...roles: UserRole[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers.authorization;
      const cookieToken = req.cookies?.token;

      const token = authHeader?.startsWith("Bearer ")
        ? authHeader.split(" ")[1]
        : cookieToken;

      if (!token) {
        return res.status(401).json({ message: "No token provided" });
      }

      const decoded = jwt.verify(token, secret) as JwtPayload;

      const userData = await prisma.user.findUnique({
        where: { email: decoded.email },
      });

      if (!userData) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      if (userData.status !== "ACTIVE") {
        return res.status(403).json({ message: "User inactive" });
      }

      if (roles.length && !roles.includes(decoded.role)) {
        return res.status(403).json({ message: "Forbidden" });
      }

      req.user = userData; // 🔥 better than decoded
      next();
    } catch (error) {
      return res.status(401).json({ message: "Invalid or expired token" });
    }
  };
};

export default auth;
