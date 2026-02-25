import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./prisma";
// If your Prisma file is located elsewhere, you can change the path

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql", // or "mysql", "postgresql", ...etc
  }),
  baseURL:
    process.env.BETTER_AUTH_URL ||
    "https://api-skillbridge-server.onrender.com",
  secret: process.env.BETTER_AUTH_SECRET,
  cors: {
    origin: [
      process.env.FRONTEND_URL || "http://localhost:3000", // your frontend domain
    ],
    credentials: true, // allow cookies to be sent
  },
  cookies: {
    sessionToken: {
      attributes: {
        // sameSite: "none", // ✅ THIS FIXES YOUR LOGIN
        secure: false, //will be true in production with HTTPS
        httpOnly: true,
        path: "/",
        maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
      },
    },
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    },
  },

  trustedOrigins: ["http://localhost:3000"],
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
    origin: ["http://localhost:3000"],
  },
  //
  // advanced: {
  //   disableCSRFCheck: true,
  //   disableOriginCheck: true,
  //   useSecureCookies: false,
  //   cookies: {
  //     state: {
  //       attributes: {
  //         sameSite: "none",
  //         secure: false,
  //         httpOnly: true,
  //         path: "/",
  //       },
  //     },
  //     sessionToken: {
  //       attributes: {
  //         sameSite: "none",
  //         secure: false,
  //         httpOnly: true,
  //         path: "/",
  //       },
  //     },
  //   },
  // },
});
