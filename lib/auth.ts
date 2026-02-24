import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./prisma";
// If your Prisma file is located elsewhere, you can change the path

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql", // or "mysql", "postgresql", ...etc
  }),
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  cookies: {
    secure: true,
    sameSite: "none",
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    },
  },

  trustedOrigins: ["*"],
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: true,
        defaultValue: "STUDENT",
      },
      status: {
        type: "string",
        required: true,
        defaultValue: "ACTIVE",
      },
    },
  },
  emailAndPassword: {
    enabled: true,
    origin: [
      "http://localhost:5000",
      "https://api-skillbridge-server.onrender.com",
    ],
  },
});
