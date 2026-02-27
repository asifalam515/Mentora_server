import express from "express";
import { AuthController } from "./auth.controller";

export const AuthRouter = express.Router();

AuthRouter.post("/register", AuthController.createUser);
AuthRouter.post("/login", AuthController.loginUser);
