import { NextFunction, Request, Response } from "express";
import sendResponse from "../../utils/sendResponse";
import { AuthService } from "./auth.service";

const createUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await AuthService.createUserIntoDB(req.body);

    sendResponse(res, {
      statusCode: 201,
      success: true,
      message: "User created successfully",
      data: result,
    });
  } catch (error: any) {
    next(error);
  }
};
const loginUser = async (req: Request, res: Response) => {
  try {
    const result = await AuthService.loginUserIntoDB(req.body);

    // Set cookie for browser
    res.cookie("token", result.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 24 * 60 * 60 * 1000, // 1 day
    });

    // Return user + token for Postman / API clients
    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "User logged in successfully",
      data: {
        user: result.user,
        token: result.accessToken, // 🔥 ADD THIS
      },
    });
  } catch (error: any) {
    sendResponse(res, {
      statusCode: 401,
      success: false,
      message: error?.message || "Invalid credentials",
      data: null,
    });
  }
};

export const AuthController = {
  createUser,
  loginUser,
};
