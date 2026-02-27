import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../../../lib/prisma";

export const secret = process.env.SECRET as string;
if (!secret) {
  throw new Error("SECRET is not defined in environment variables");
}
const createUserIntoDB = async (payload: any) => {
  const existingUser = await prisma.user.findUnique({
    where: { email: payload.email },
  });

  if (existingUser) {
    throw new Error("User already exists with this email");
  }
  const hashPassword = await bcrypt.hash(payload.password, 8);

  const result = await prisma.user.create({
    data: {
      name: payload.name,
      email: payload.email,
      password: hashPassword,
      role: payload.role || "STUDENT",
      status: payload.status || "ACTIVE",
    },
  });
  const { password, ...newResult } = result;
  return newResult;
};

const loginUserIntoDB = async (payload: any) => {
  const user = await prisma.user.findUnique({
    where: {
      email: payload.email,
    },
  });
  if (!user) {
    throw new Error("User not found!");
  }

  const isPasswordMatched = await bcrypt.compare(
    payload.password,
    user.password,
  );

  if (!isPasswordMatched) {
    throw new Error("Invalid credentials!!");
  }
  const tokenPayload = {
    id: user.id,
    email: user.email,
    role: user.role,
  };
  const token = jwt.sign(tokenPayload, secret, {
    expiresIn: "1d",
  });

  const { password, ...safeUser } = user;

  return {
    accessToken: token,
    user: safeUser,
  };
};

export const AuthService = {
  // Add service methods here
  createUserIntoDB,
  loginUserIntoDB,
};
