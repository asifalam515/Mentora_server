// src/server.ts
import { toNodeHandler } from "better-auth/node";
import cors from "cors";
import express from "express";

// lib/auth.ts
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";

// lib/prisma.ts
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";

// generated/prisma/client.ts
import * as path from "path";
import { fileURLToPath } from "url";

// generated/prisma/internal/class.ts
import * as runtime from "@prisma/client/runtime/client";
var config = {
  "previewFeatures": [],
  "clientVersion": "7.3.0",
  "engineVersion": "9d6ad21cbbceab97458517b147a6a09ff43aa735",
  "activeProvider": "postgresql",
  "inlineSchema": '// This is your Prisma schema file,\n// learn more about it in the docs: https://pris.ly/d/prisma-schema\n\n// Looking for ways to speed up your queries, or scale easily with your serverless or edge functions?\n// Try Prisma Accelerate: https://pris.ly/cli/accelerate-init\n\ngenerator client {\n  provider = "prisma-client"\n  output   = "../generated/prisma"\n}\n\ndatasource db {\n  provider = "postgresql"\n}\n\nenum BookingStatus {\n  PENDING\n  CONFIRMED\n  COMPLETED\n  CANCELLED\n}\n\nenum UserStatus {\n  ACTIVE\n  BANNED\n}\n\nenum Role {\n  STUDENT\n  TUTOR\n  ADMIN\n}\n\nmodel User {\n  id            String     @id\n  name          String\n  email         String\n  role          Role       @default(STUDENT)\n  emailVerified Boolean    @default(false)\n  image         String?\n  createdAt     DateTime   @default(now())\n  updatedAt     DateTime   @updatedAt\n  sessions      Session[]\n  accounts      Account[]\n  status        UserStatus @default(ACTIVE)\n\n  tutorProfile TutorProfile?\n  bookings     Booking[]     @relation("StudentBookings")\n  reviews      Review[]\n\n  banned     Boolean?  @default(false)\n  banReason  String?\n  banExpires DateTime?\n\n  @@unique([email])\n  @@map("user")\n}\n\nmodel TutorProfile {\n  id         String  @id @default(uuid())\n  bio        String\n  pricePerHr Float\n  rating     Float   @default(0)\n  experience Int\n  isVerified Boolean @default(false)\n  isFeatured Boolean @default(false)\n  userId     String  @unique\n  user       User    @relation(fields: [userId], references: [id])\n\n  categories   TutorCategory[]\n  bookings     Booking[]\n  reviews      Review[]\n  availability AvailabilitySlot[]\n\n  createdAt DateTime @default(now())\n}\n\nmodel Category {\n  id   String @id @default(uuid())\n  name String @unique\n\n  tutors TutorCategory[]\n}\n\nmodel TutorCategory {\n  tutorId    String\n  categoryId String\n\n  tutor    TutorProfile @relation(fields: [tutorId], references: [id])\n  category Category     @relation(fields: [categoryId], references: [id])\n\n  @@id([tutorId, categoryId])\n}\n\nmodel AvailabilitySlot {\n  id        String   @id @default(uuid())\n  startTime DateTime\n  endTime   DateTime\n  isBooked  Boolean  @default(false)\n\n  tutorId  String\n  bookings Booking[]\n  tutor    TutorProfile @relation(fields: [tutorId], references: [id])\n\n  @@unique([tutorId, startTime])\n  @@unique([tutorId, endTime])\n}\n\nmodel Booking {\n  id     String        @id @default(uuid())\n  status BookingStatus @default(PENDING)\n  date   DateTime\n\n  studentId String\n  tutorId   String\n  slotId    String\n\n  student User             @relation("StudentBookings", fields: [studentId], references: [id])\n  tutor   TutorProfile     @relation(fields: [tutorId], references: [id])\n  slot    AvailabilitySlot @relation(fields: [slotId], references: [id])\n\n  review Review?\n\n  createdAt DateTime @default(now())\n}\n\nmodel Review {\n  id      String  @id @default(uuid())\n  rating  Int\n  comment String?\n\n  studentId String\n  tutorId   String\n  bookingId String @unique\n\n  student User         @relation(fields: [studentId], references: [id])\n  tutor   TutorProfile @relation(fields: [tutorId], references: [id])\n  booking Booking      @relation(fields: [bookingId], references: [id])\n\n  createdAt DateTime @default(now())\n}\n\nmodel Session {\n  id        String   @id\n  expiresAt DateTime\n  token     String\n  createdAt DateTime @default(now())\n  updatedAt DateTime @updatedAt\n  ipAddress String?\n  userAgent String?\n  userId    String\n  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)\n\n  impersonatedBy String?\n\n  @@unique([token])\n  @@index([userId])\n  @@map("session")\n}\n\nmodel Account {\n  id                    String    @id\n  accountId             String\n  providerId            String\n  userId                String\n  user                  User      @relation(fields: [userId], references: [id], onDelete: Cascade)\n  accessToken           String?\n  refreshToken          String?\n  idToken               String?\n  accessTokenExpiresAt  DateTime?\n  refreshTokenExpiresAt DateTime?\n  scope                 String?\n  password              String?\n  createdAt             DateTime  @default(now())\n  updatedAt             DateTime  @updatedAt\n\n  @@index([userId])\n  @@map("account")\n}\n\nmodel Verification {\n  id         String   @id\n  identifier String\n  value      String\n  expiresAt  DateTime\n  createdAt  DateTime @default(now())\n  updatedAt  DateTime @updatedAt\n\n  @@index([identifier])\n  @@map("verification")\n}\n',
  "runtimeDataModel": {
    "models": {},
    "enums": {},
    "types": {}
  }
};
config.runtimeDataModel = JSON.parse('{"models":{"User":{"fields":[{"name":"id","kind":"scalar","type":"String"},{"name":"name","kind":"scalar","type":"String"},{"name":"email","kind":"scalar","type":"String"},{"name":"role","kind":"enum","type":"Role"},{"name":"emailVerified","kind":"scalar","type":"Boolean"},{"name":"image","kind":"scalar","type":"String"},{"name":"createdAt","kind":"scalar","type":"DateTime"},{"name":"updatedAt","kind":"scalar","type":"DateTime"},{"name":"sessions","kind":"object","type":"Session","relationName":"SessionToUser"},{"name":"accounts","kind":"object","type":"Account","relationName":"AccountToUser"},{"name":"status","kind":"enum","type":"UserStatus"},{"name":"tutorProfile","kind":"object","type":"TutorProfile","relationName":"TutorProfileToUser"},{"name":"bookings","kind":"object","type":"Booking","relationName":"StudentBookings"},{"name":"reviews","kind":"object","type":"Review","relationName":"ReviewToUser"},{"name":"banned","kind":"scalar","type":"Boolean"},{"name":"banReason","kind":"scalar","type":"String"},{"name":"banExpires","kind":"scalar","type":"DateTime"}],"dbName":"user"},"TutorProfile":{"fields":[{"name":"id","kind":"scalar","type":"String"},{"name":"bio","kind":"scalar","type":"String"},{"name":"pricePerHr","kind":"scalar","type":"Float"},{"name":"rating","kind":"scalar","type":"Float"},{"name":"experience","kind":"scalar","type":"Int"},{"name":"isVerified","kind":"scalar","type":"Boolean"},{"name":"isFeatured","kind":"scalar","type":"Boolean"},{"name":"userId","kind":"scalar","type":"String"},{"name":"user","kind":"object","type":"User","relationName":"TutorProfileToUser"},{"name":"categories","kind":"object","type":"TutorCategory","relationName":"TutorCategoryToTutorProfile"},{"name":"bookings","kind":"object","type":"Booking","relationName":"BookingToTutorProfile"},{"name":"reviews","kind":"object","type":"Review","relationName":"ReviewToTutorProfile"},{"name":"availability","kind":"object","type":"AvailabilitySlot","relationName":"AvailabilitySlotToTutorProfile"},{"name":"createdAt","kind":"scalar","type":"DateTime"}],"dbName":null},"Category":{"fields":[{"name":"id","kind":"scalar","type":"String"},{"name":"name","kind":"scalar","type":"String"},{"name":"tutors","kind":"object","type":"TutorCategory","relationName":"CategoryToTutorCategory"}],"dbName":null},"TutorCategory":{"fields":[{"name":"tutorId","kind":"scalar","type":"String"},{"name":"categoryId","kind":"scalar","type":"String"},{"name":"tutor","kind":"object","type":"TutorProfile","relationName":"TutorCategoryToTutorProfile"},{"name":"category","kind":"object","type":"Category","relationName":"CategoryToTutorCategory"}],"dbName":null},"AvailabilitySlot":{"fields":[{"name":"id","kind":"scalar","type":"String"},{"name":"startTime","kind":"scalar","type":"DateTime"},{"name":"endTime","kind":"scalar","type":"DateTime"},{"name":"isBooked","kind":"scalar","type":"Boolean"},{"name":"tutorId","kind":"scalar","type":"String"},{"name":"bookings","kind":"object","type":"Booking","relationName":"AvailabilitySlotToBooking"},{"name":"tutor","kind":"object","type":"TutorProfile","relationName":"AvailabilitySlotToTutorProfile"}],"dbName":null},"Booking":{"fields":[{"name":"id","kind":"scalar","type":"String"},{"name":"status","kind":"enum","type":"BookingStatus"},{"name":"date","kind":"scalar","type":"DateTime"},{"name":"studentId","kind":"scalar","type":"String"},{"name":"tutorId","kind":"scalar","type":"String"},{"name":"slotId","kind":"scalar","type":"String"},{"name":"student","kind":"object","type":"User","relationName":"StudentBookings"},{"name":"tutor","kind":"object","type":"TutorProfile","relationName":"BookingToTutorProfile"},{"name":"slot","kind":"object","type":"AvailabilitySlot","relationName":"AvailabilitySlotToBooking"},{"name":"review","kind":"object","type":"Review","relationName":"BookingToReview"},{"name":"createdAt","kind":"scalar","type":"DateTime"}],"dbName":null},"Review":{"fields":[{"name":"id","kind":"scalar","type":"String"},{"name":"rating","kind":"scalar","type":"Int"},{"name":"comment","kind":"scalar","type":"String"},{"name":"studentId","kind":"scalar","type":"String"},{"name":"tutorId","kind":"scalar","type":"String"},{"name":"bookingId","kind":"scalar","type":"String"},{"name":"student","kind":"object","type":"User","relationName":"ReviewToUser"},{"name":"tutor","kind":"object","type":"TutorProfile","relationName":"ReviewToTutorProfile"},{"name":"booking","kind":"object","type":"Booking","relationName":"BookingToReview"},{"name":"createdAt","kind":"scalar","type":"DateTime"}],"dbName":null},"Session":{"fields":[{"name":"id","kind":"scalar","type":"String"},{"name":"expiresAt","kind":"scalar","type":"DateTime"},{"name":"token","kind":"scalar","type":"String"},{"name":"createdAt","kind":"scalar","type":"DateTime"},{"name":"updatedAt","kind":"scalar","type":"DateTime"},{"name":"ipAddress","kind":"scalar","type":"String"},{"name":"userAgent","kind":"scalar","type":"String"},{"name":"userId","kind":"scalar","type":"String"},{"name":"user","kind":"object","type":"User","relationName":"SessionToUser"},{"name":"impersonatedBy","kind":"scalar","type":"String"}],"dbName":"session"},"Account":{"fields":[{"name":"id","kind":"scalar","type":"String"},{"name":"accountId","kind":"scalar","type":"String"},{"name":"providerId","kind":"scalar","type":"String"},{"name":"userId","kind":"scalar","type":"String"},{"name":"user","kind":"object","type":"User","relationName":"AccountToUser"},{"name":"accessToken","kind":"scalar","type":"String"},{"name":"refreshToken","kind":"scalar","type":"String"},{"name":"idToken","kind":"scalar","type":"String"},{"name":"accessTokenExpiresAt","kind":"scalar","type":"DateTime"},{"name":"refreshTokenExpiresAt","kind":"scalar","type":"DateTime"},{"name":"scope","kind":"scalar","type":"String"},{"name":"password","kind":"scalar","type":"String"},{"name":"createdAt","kind":"scalar","type":"DateTime"},{"name":"updatedAt","kind":"scalar","type":"DateTime"}],"dbName":"account"},"Verification":{"fields":[{"name":"id","kind":"scalar","type":"String"},{"name":"identifier","kind":"scalar","type":"String"},{"name":"value","kind":"scalar","type":"String"},{"name":"expiresAt","kind":"scalar","type":"DateTime"},{"name":"createdAt","kind":"scalar","type":"DateTime"},{"name":"updatedAt","kind":"scalar","type":"DateTime"}],"dbName":"verification"}},"enums":{},"types":{}}');
async function decodeBase64AsWasm(wasmBase64) {
  const { Buffer } = await import("buffer");
  const wasmArray = Buffer.from(wasmBase64, "base64");
  return new WebAssembly.Module(wasmArray);
}
config.compilerWasm = {
  getRuntime: async () => await import("@prisma/client/runtime/query_compiler_fast_bg.postgresql.mjs"),
  getQueryCompilerWasmModule: async () => {
    const { wasm } = await import("@prisma/client/runtime/query_compiler_fast_bg.postgresql.wasm-base64.mjs");
    return await decodeBase64AsWasm(wasm);
  },
  importName: "./query_compiler_fast_bg.js"
};
function getPrismaClientClass() {
  return runtime.getPrismaClient(config);
}

// generated/prisma/internal/prismaNamespace.ts
import * as runtime2 from "@prisma/client/runtime/client";
var getExtensionContext = runtime2.Extensions.getExtensionContext;
var NullTypes2 = {
  DbNull: runtime2.NullTypes.DbNull,
  JsonNull: runtime2.NullTypes.JsonNull,
  AnyNull: runtime2.NullTypes.AnyNull
};
var TransactionIsolationLevel = runtime2.makeStrictEnum({
  ReadUncommitted: "ReadUncommitted",
  ReadCommitted: "ReadCommitted",
  RepeatableRead: "RepeatableRead",
  Serializable: "Serializable"
});
var defineExtension = runtime2.Extensions.defineExtension;

// generated/prisma/enums.ts
var UserStatus = {
  ACTIVE: "ACTIVE",
  BANNED: "BANNED"
};

// generated/prisma/client.ts
globalThis["__dirname"] = path.dirname(fileURLToPath(import.meta.url));
var PrismaClient = getPrismaClientClass();

// lib/prisma.ts
var connectionString = `${process.env.DATABASE_URL}`;
var adapter = new PrismaPg({ connectionString });
var prisma = new PrismaClient({ adapter });

// lib/auth.ts
var auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql"
    // or "mysql", "postgresql", ...etc
  }),
  baseURL: "https://skill-bridge-4216.vercel.app",
  secret: process.env.BETTER_AUTH_SECRET,
  cors: {
    origin: [
      "https://skill-bridge-4216.vercel.app",
      "http://localhost:3000"
      // your frontend domain
    ],
    credentials: true
    // allow cookies to be sent
  },
  cookies: {
    sessionToken: {
      attributes: {
        sameSite: "none",
        // ✅ THIS FIXES YOUR LOGIN
        secure: true,
        //will be true in production with HTTPS
        httpOnly: true,
        path: "/",
        maxAge: 60 * 60 * 24 * 7
        // 7 days
      }
    }
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET
    }
  },
  trustedOrigins: [
    "https://skill-bridge-4216.vercel.app",
    "https://skillbridge-client-ax3eqs709-asibul-alams-projects.vercel.app",
    "http://localhost:3000"
  ],
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: true,
        defaultValue: "STUDENT"
      },
      status: {
        type: "string",
        required: true,
        defaultValue: "ACTIVE"
      }
    }
  },
  emailAndPassword: {
    enabled: true,
    origin: ["http://localhost:3000", "https://skill-bridge-4216.vercel.app"]
  }
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

// src/modules/admin/admin.router.ts
import { Router } from "express";

// src/middleware/auth.ts
var auth2 = (...roles) => {
  return async (req, res, next) => {
    try {
      const session = await auth.api.getSession({
        headers: req.headers
      });
      if (!session) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized"
        });
      }
      req.user = {
        id: session.user.id,
        email: session.user.email,
        role: session.user.role,
        status: session.user.status
      };
      if (roles.length && !roles.includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: "Forbidden! You do not have access to this resource."
        });
      }
      next();
    } catch (error) {
      console.error("Authentication error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal Server Error"
      });
    }
  };
};

// src/modules/admin/admin.service.ts
var adminService = {
  // 1. Get all users with filtering
  async getAllUsers(filters) {
    const { role, status, search, page = 1, limit = 20 } = filters;
    const skip = (page - 1) * limit;
    const where = {};
    if (role) {
      where.role = role;
    }
    if (status) {
      where.status = status;
    }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } }
      ];
    }
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          status: true,
          banned: true,
          banReason: true,
          banExpires: true,
          createdAt: true,
          tutorProfile: {
            select: {
              id: true,
              rating: true,
              isVerified: true
            }
          },
          _count: {
            select: {
              bookings: true,
              reviews: true
            }
          }
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit
      }),
      prisma.user.count({ where })
    ]);
    return {
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  },
  // 2. Get user by ID with detailed info
  async getUserDetails(userId) {
    return await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        banned: true,
        banReason: true,
        banExpires: true,
        createdAt: true,
        updatedAt: true,
        // Student info
        bookings: {
          include: {
            tutor: {
              include: {
                user: {
                  select: {
                    name: true,
                    email: true
                  }
                }
              }
            },
            slot: true,
            review: true
          },
          orderBy: { createdAt: "desc" },
          take: 10
        },
        // Tutor info
        tutorProfile: {
          include: {
            categories: {
              include: {
                category: true
              }
            },
            bookings: {
              include: {
                student: {
                  select: {
                    name: true,
                    email: true
                  }
                }
              },
              orderBy: { createdAt: "desc" },
              take: 10
            },
            reviews: {
              include: {
                student: {
                  select: {
                    name: true
                  }
                }
              },
              orderBy: { createdAt: "desc" },
              take: 10
            },
            availability: {
              orderBy: { startTime: "desc" },
              take: 10
            }
          }
        },
        _count: {
          select: {
            bookings: true,
            reviews: true
          }
        }
      }
    });
  },
  // 3. Update user status (ban/unban)
  async updateUserStatus(userId, data) {
    return await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId }
      });
      if (!user) {
        throw new Error("User not found");
      }
      const updateData = { ...data };
      if (data.banned === true) {
        updateData.status = UserStatus.BANNED;
      } else if (data.banned === false) {
        updateData.status = UserStatus.ACTIVE;
        updateData.banReason = null;
        updateData.banExpires = null;
      }
      return await tx.user.update({
        where: { id: userId },
        data: updateData,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          status: true,
          banned: true,
          banReason: true,
          banExpires: true
        }
      });
    });
  },
  // 4. Get all bookings with filters
  async getAllBookings(filters) {
    const {
      status,
      tutorId,
      studentId,
      startDate,
      endDate,
      search,
      page = 1,
      limit = 20
    } = filters;
    const skip = (page - 1) * limit;
    const where = {};
    if (status) {
      where.status = status;
    }
    if (tutorId) {
      where.tutorId = tutorId;
    }
    if (studentId) {
      where.studentId = studentId;
    }
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = startDate;
      if (endDate) where.date.lte = endDate;
    }
    if (search) {
      where.OR = [
        {
          student: {
            name: { contains: search, mode: "insensitive" }
          }
        },
        {
          student: {
            email: { contains: search, mode: "insensitive" }
          }
        },
        {
          tutor: {
            user: {
              name: { contains: search, mode: "insensitive" }
            }
          }
        },
        {
          tutor: {
            user: {
              email: { contains: search, mode: "insensitive" }
            }
          }
        }
      ];
    }
    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        include: {
          student: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          tutor: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true
                }
              }
            }
          },
          slot: true,
          review: true
        },
        orderBy: { date: "desc" },
        skip,
        take: limit
      }),
      prisma.booking.count({ where })
    ]);
    const stats = await prisma.booking.aggregate({
      where,
      _count: { id: true }
    });
    return {
      bookings,
      stats: {
        total: stats._count.id
        // Add other stats as needed
      },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  },
  // 5. Update booking status (admin can override)
  async updateBookingStatus(bookingId, status) {
    return await prisma.booking.update({
      where: { id: bookingId },
      data: { status },
      include: {
        student: {
          select: {
            name: true,
            email: true
          }
        },
        tutor: {
          include: {
            user: {
              select: {
                name: true,
                email: true
              }
            }
          }
        }
      }
    });
  },
  // 6. Get dashboard statistics
  async getDashboardStats() {
    const [
      totalUsers,
      totalTutors,
      totalStudents,
      totalBookings,
      totalRevenue,
      recentUsers,
      recentBookings,
      categoryStats,
      userGrowth
    ] = await Promise.all([
      // Total counts
      prisma.user.count(),
      prisma.user.count({ where: { role: "TUTOR" } }),
      prisma.user.count({ where: { role: "STUDENT" } }),
      prisma.booking.count(),
      // Total revenue (assuming you have pricing)
      prisma.booking.aggregate({
        where: { status: "COMPLETED" }
      }),
      // Recent users (last 7 days)
      prisma.user.findMany({
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true
        }
      }),
      // Recent bookings
      prisma.booking.findMany({
        orderBy: { createdAt: "desc" },
        take: 10,
        include: {
          student: {
            select: { name: true }
          },
          tutor: {
            include: {
              user: {
                select: { name: true }
              }
            }
          }
        }
      }),
      // Category statistics
      prisma.category.findMany({
        include: {
          _count: {
            select: { tutors: true }
          }
        },
        orderBy: {
          tutors: {
            _count: "desc"
          }
        },
        take: 5
      }),
      (async () => {
        const thirtyDaysAgo = /* @__PURE__ */ new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const dailyStats = await prisma.$queryRaw`
          SELECT 
            DATE("createdAt") as date,
            COUNT(*) as count,
            SUM(CASE WHEN role = 'TUTOR' THEN 1 ELSE 0 END) as tutors,
            SUM(CASE WHEN role = 'STUDENT' THEN 1 ELSE 0 END) as students
          FROM "User"
          WHERE "createdAt" >= ${thirtyDaysAgo}
          GROUP BY DATE("createdAt")
          ORDER BY date ASC
        `;
        return dailyStats;
      })()
    ]);
    return {
      overview: {
        totalUsers,
        totalTutors,
        totalStudents,
        totalBookings
      },
      recentUsers,
      recentBookings,
      categoryStats,
      userGrowth
    };
  }
};

// src/modules/admin/admin.controller.ts
var adminController = {
  // 1. Get all users
  getAllUsers: async (req, res) => {
    try {
      const { role, status, search, page = 1, limit = 20 } = req.query;
      const result = await adminService.getAllUsers({
        role,
        status,
        search,
        page: parseInt(page),
        limit: parseInt(limit)
      });
      res.json(result);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  },
  // 2. Get user details
  getUserDetails: async (req, res) => {
    try {
      const userId = req.params.userId;
      const user = await adminService.getUserDetails(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json(user);
    } catch (error) {
      console.error("Error fetching user details:", error);
      res.status(500).json({ error: "Failed to fetch user details" });
    }
  },
  // 3. Update user status (ban/unban)
  updateUserStatus: async (req, res) => {
    try {
      const userId = req.params.userId;
      const { status, banned, banReason, banExpires } = req.body;
      if (!userId) {
        return res.status(400).json({ error: "User ID is required" });
      }
      const updatedUser = await adminService.updateUserStatus(userId, {
        status,
        banned,
        banReason,
        banExpires: banExpires ? new Date(banExpires) : void 0
      });
      res.json({
        message: "User status updated successfully",
        user: updatedUser
      });
    } catch (error) {
      console.error("Error updating user status:", error);
      if (error.message === "User not found") {
        return res.status(404).json({ error: error.message });
      }
      res.status(500).json({ error: "Failed to update user status" });
    }
  },
  // 4. Get all bookings
  getAllBookings: async (req, res) => {
    try {
      const {
        status,
        tutorId,
        studentId,
        startDate,
        endDate,
        search,
        page = 1,
        limit = 20
      } = req.query;
      const result = await adminService.getAllBookings({
        status,
        tutorId,
        studentId,
        startDate: startDate ? new Date(startDate) : void 0,
        endDate: endDate ? new Date(endDate) : void 0,
        search,
        page: parseInt(page),
        limit: parseInt(limit)
      });
      res.json(result);
    } catch (error) {
      console.error("Error fetching bookings:", error);
      res.status(500).json({ error: "Failed to fetch bookings" });
    }
  },
  // 5. Update booking status
  updateBookingStatus: async (req, res) => {
    try {
      const bookingId = req.params.bookingId;
      const { status } = req.body;
      if (!bookingId || !status) {
        return res.status(400).json({ error: "Booking ID and status are required" });
      }
      const updatedBooking = await adminService.updateBookingStatus(
        bookingId,
        status
      );
      res.json({
        message: "Booking status updated successfully",
        booking: updatedBooking
      });
    } catch (error) {
      console.error("Error updating booking status:", error);
      res.status(500).json({ error: "Failed to update booking status" });
    }
  },
  // 6. Get dashboard statistics
  getDashboardStats: async (req, res) => {
    try {
      const stats = await adminService.getDashboardStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ error: "Failed to fetch dashboard statistics" });
    }
  },
  // 7. Delete user (soft delete or hard delete)
  deleteUser: async (req, res) => {
    try {
      const userId = req.params.userId;
      const { hardDelete = true } = req.body;
      if (!userId) {
        return res.status(400).json({ error: "User ID is required" });
      }
      if (hardDelete) {
        await prisma.user.delete({
          where: { id: userId }
        });
        return res.json({ message: "User permanently deleted" });
      } else {
        await prisma.user.update({
          where: { id: userId },
          data: {
            status: "BANNED",
            banned: true
          }
        });
        return res.json({ message: "User banned successfully" });
      }
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ error: "Failed to delete user" });
    }
  },
  // 8. Verify/Unverify tutor
  verifyTutor: async (req, res) => {
    try {
      const tutorId = req.params.tutorId;
      const { isVerified } = req.body;
      if (isVerified === void 0) {
        return res.status(400).json({ error: "Verification status is required" });
      }
      const tutor = await prisma.tutorProfile.update({
        where: { id: tutorId },
        data: { isVerified },
        include: {
          user: {
            select: {
              name: true,
              email: true
            }
          }
        }
      });
      res.json({
        message: `Tutor ${isVerified ? "verified" : "unverified"} successfully`,
        tutor
      });
    } catch (error) {
      console.error("Error verifying tutor:", error);
      res.status(500).json({ error: "Failed to update tutor verification" });
    }
  }
};

// src/modules/admin/admin.router.ts
var adminRouter = Router();
adminRouter.get(
  "/dashboard",
  auth2("ADMIN" /* ADMIN */),
  adminController.getDashboardStats
);
adminRouter.get("/users", auth2("ADMIN" /* ADMIN */), adminController.getAllUsers);
adminRouter.get(
  "/users/:userId",
  auth2("ADMIN" /* ADMIN */),
  adminController.getUserDetails
);
adminRouter.put(
  "/users/:userId/status",
  auth2("ADMIN" /* ADMIN */),
  adminController.updateUserStatus
);
adminRouter.delete(
  "/users/:userId",
  auth2("ADMIN" /* ADMIN */),
  adminController.deleteUser
);
adminRouter.put(
  "/tutors/:tutorId/verify",
  auth2("ADMIN" /* ADMIN */),
  adminController.verifyTutor
);
adminRouter.get(
  "/bookings",
  auth2("ADMIN" /* ADMIN */),
  adminController.getAllBookings
);
adminRouter.put(
  "/bookings/:bookingId/status",
  auth2("ADMIN" /* ADMIN */),
  adminController.updateBookingStatus
);

// src/modules/availabilitySlot/slot.router.ts
import { Router as Router2 } from "express";

// src/modules/availabilitySlot/slot.service.ts
var getAvailabilitySlots = async (tutorId) => {
  const slots = await prisma.availabilitySlot.findMany({
    where: { tutorId }
  });
  return slots;
};
var createTimeSlotService = async (data, userId) => {
  const tutorId = await prisma.tutorProfile.findUnique({
    where: { userId }
  }).then((profile) => {
    if (!profile) {
      throw new Error("Tutor profile not found for the user");
    }
    return profile.id;
  });
  const newSlot = await prisma.availabilitySlot.create({
    data: {
      ...data,
      tutorId
    }
  });
  return newSlot;
};
var getAvailabilitySlotsByTutorId = async (userId) => {
  const tutorId = await prisma.tutorProfile.findUnique({
    where: { userId }
  }).then((profile) => {
    if (!profile) {
      throw new Error("Tutor profile not found for the user");
    }
    return profile.id;
  });
  const slots = await prisma.availabilitySlot.findMany({
    where: { tutorId }
  });
  return slots;
};
var deleteAvailabilitySlotById = async (slotId, userId) => {
  return await prisma.$transaction(async (tx) => {
    const tutorProfile = await tx.tutorProfile.findUnique({
      where: { userId }
    });
    if (!tutorProfile) {
      throw new Error("Tutor profile not found for the user");
    }
    const slot = await tx.availabilitySlot.findUnique({
      where: { id: slotId }
    });
    if (!slot) {
      throw new Error("Slot not found");
    }
    if (slot.tutorId !== tutorProfile.id) {
      throw new Error("Not authorized to delete this slot");
    }
    if (slot.isBooked) {
      throw new Error("Cannot delete a booked slot");
    }
    const deletedSlot = await tx.availabilitySlot.delete({
      where: { id: slotId }
    });
    return deletedSlot;
  });
};
var slotService = {
  createTimeSlotService,
  getAvailabilitySlotsByTutorId,
  deleteAvailabilitySlotById,
  getAvailabilitySlots
};

// src/modules/availabilitySlot/slot.controller.ts
var getAvailabilitySlots2 = async (req, res) => {
  try {
    const tutorId = req.params.tutorId;
    const slots = await slotService.getAvailabilitySlots(tutorId);
    res.status(200).json(slots);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Failed to retrieve availability slots" });
  }
};
var createTimeSlot = async (req, res) => {
  try {
    const userId = req.user?.id;
    const newSlot = await slotService.createTimeSlotService(req.body, userId);
    res.status(201).json(newSlot);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Failed to create time slot" });
  }
};
var getAvailabilitySlotsByTutorId2 = async (req, res) => {
  try {
    const userId = req.user?.id;
    const slots = await slotService.getAvailabilitySlotsByTutorId(userId);
    res.status(200).json(slots);
  } catch (error) {
    res.status(500).json({ error: "Failed to retrieve availability slots" });
  }
};
var deleteAvailabilitySlot = async (req, res) => {
  try {
    const userId = req.user?.id;
    const slotId = req.params.slotId;
    const slot = await slotService.deleteAvailabilitySlotById(slotId, userId);
    res.status(200).json(slot);
  } catch (error) {
    console.error("DELETE SLOT ERROR:", error.message);
    res.status(400).json({
      error: error.message || "Failed to delete availability slots"
    });
  }
};
var slotController = {
  createTimeSlot,
  getAvailabilitySlotsByTutorId: getAvailabilitySlotsByTutorId2,
  deleteAvailabilitySlot,
  getAvailabilitySlots: getAvailabilitySlots2
};

// src/modules/availabilitySlot/slot.router.ts
var slotRouter = Router2();
slotRouter.get(
  "/",
  auth2("TUTOR" /* TUTOR */, "STUDENT" /* STUDENT */, "ADMIN" /* ADMIN */),
  slotController.getAvailabilitySlotsByTutorId
);
slotRouter.get(
  "/tutor/:tutorId",
  slotController.getAvailabilitySlots
);
slotRouter.post("/", auth2("TUTOR" /* TUTOR */), slotController.createTimeSlot);
slotRouter.delete(
  "/:slotId",
  auth2("TUTOR" /* TUTOR */, "ADMIN" /* ADMIN */),
  slotController.deleteAvailabilitySlot
);

// src/modules/booking/booking.router.ts
import { Router as Router3 } from "express";

// src/modules/booking/booking.service.ts
var getDashboardData = async (userId, role) => {
  const now = /* @__PURE__ */ new Date();
  let where = {};
  if (role === "STUDENT") {
    where.studentId = userId;
  }
  if (role === "TUTOR") {
    const tutorProfile = await prisma.tutorProfile.findUnique({
      where: { userId },
      select: { id: true }
    });
    if (!tutorProfile) throw new Error("Tutor profile not found");
    where.tutorId = tutorProfile.id;
  }
  const bookings = await prisma.booking.findMany({
    where,
    include: {
      student: { select: { name: true, email: true } },
      tutor: {
        include: {
          user: { select: { name: true, email: true } }
        }
      },
      slot: true
    },
    orderBy: { date: "asc" }
  });
  const upcomingBookings = bookings.filter(
    (b) => new Date(b.date) >= now && b.status !== "CANCELLED"
  );
  const pastBookings = bookings.filter(
    (b) => new Date(b.date) < now || b.status === "COMPLETED"
  );
  const stats = {
    total: bookings.length,
    upcoming: upcomingBookings.length,
    completed: bookings.filter((b) => b.status === "COMPLETED").length,
    cancelled: bookings.filter((b) => b.status === "CANCELLED").length
  };
  return {
    stats,
    upcomingBookings,
    pastBookings
  };
};
var createBooking = async (studentId, slotId) => {
  return await prisma.$transaction(async (tx) => {
    const slot = await tx.availabilitySlot.findUnique({
      where: { id: slotId, isBooked: false },
      include: { tutor: true }
    });
    if (!slot) {
      throw new Error("Time slot not found or already booked");
    }
    const tutorUser = await tx.user.findUnique({
      where: { id: slot.tutor.userId }
    });
    if (tutorUser?.id === studentId) {
      throw new Error("Cannot book your own tutoring session");
    }
    const existingBooking = await tx.booking.findFirst({
      where: {
        studentId,
        status: { in: ["PENDING", "CONFIRMED"] },
        slot: {
          startTime: { lt: slot.endTime },
          endTime: { gt: slot.startTime }
        }
      }
    });
    if (existingBooking) {
      throw new Error("You already have a booking during this time");
    }
    const booking = await tx.booking.create({
      data: {
        studentId,
        tutorId: slot.tutorId,
        slotId: slot.id,
        date: slot.startTime,
        status: "PENDING"
      },
      include: {
        student: {
          select: { id: true, name: true, email: true }
        },
        tutor: {
          include: {
            user: {
              select: { id: true, name: true, email: true }
            }
          }
        },
        slot: true
      }
    });
    await tx.availabilitySlot.update({
      where: { id: slotId },
      data: { isBooked: true }
    });
    return booking;
  });
};
var getBookings = async (userId, userRole, status, filters) => {
  let where = {};
  if (userRole === "STUDENT") {
    where.studentId = userId;
  } else if (userRole === "TUTOR") {
    const tutorProfile = await prisma.tutorProfile.findUnique({
      where: { userId },
      select: { id: true }
    });
    if (!tutorProfile) {
      throw new Error("Tutor profile not found");
    }
    where.tutorId = tutorProfile.id;
  } else if (userRole === "ADMIN") {
  } else {
    throw new Error("Invalid user role");
  }
  if (status) {
    where.status = status;
  }
  return await prisma.booking.findMany({
    where,
    include: {
      student: {
        select: { id: true, name: true, email: true }
      },
      tutor: {
        include: {
          user: {
            select: { name: true, email: true }
          }
        }
      },
      slot: true,
      review: true
    },
    orderBy: { date: "asc" }
  });
};
var getTutorBookings = async (tutorId, status) => {
  return await prisma.booking.findMany({
    where: {
      tutorId,
      ...status && { status }
    },
    include: {
      student: {
        select: { id: true, name: true, email: true }
      },
      slot: true
    },
    orderBy: { date: "asc" }
  });
};
var updateBookingStatus = async (bookingId, userId, role, status) => {
  return await prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({
      where: { id: bookingId }
    });
    if (!booking) throw new Error("Booking not found");
    if (role === "STUDENT") {
      if (booking.studentId !== userId) throw new Error("Not authorized");
      if (status !== "CANCELLED")
        throw new Error("Students can only cancel bookings");
    }
    if (role === "TUTOR") {
      const tutorProfile = await tx.tutorProfile.findUnique({
        where: { userId },
        select: { id: true }
      });
      if (!tutorProfile) throw new Error("Tutor profile not found");
      if (booking.tutorId !== tutorProfile.id)
        throw new Error("Not authorized");
      const allowed = ["CONFIRMED", "CANCELLED", "COMPLETED"];
      if (!allowed.includes(status))
        throw new Error("Invalid status for tutor");
    }
    if (role === "ADMIN") {
    }
    if (status === "CANCELLED") {
      await tx.availabilitySlot.update({
        where: { id: booking.slotId },
        data: { isBooked: false }
      });
    }
    return await tx.booking.update({
      where: { id: bookingId },
      data: { status },
      include: {
        student: { select: { name: true, email: true } },
        tutor: {
          include: {
            user: { select: { name: true, email: true } }
          }
        },
        slot: true
      }
    });
  });
};
var cancelBooking = async (bookingId, studentId) => {
  return await prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({
      where: { id: bookingId }
    });
    if (!booking) throw new Error("Booking not found");
    if (booking.studentId !== studentId) throw new Error("Not authorized");
    await tx.availabilitySlot.update({
      where: { id: booking.slotId },
      data: { isBooked: false }
    });
    return await tx.booking.update({
      where: { id: bookingId },
      data: { status: "CANCELLED" }
    });
  });
};
var bookingCompletion = async (bookingId, studentId) => {
  return await prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({
      where: { id: bookingId }
    });
    if (!booking) throw new Error("Booking not found");
    if (booking.studentId !== studentId) throw new Error("Not authorized");
    if (booking.status !== "CONFIRMED")
      throw new Error("Only confirmed bookings can be completed");
    return await tx.booking.update({
      where: { id: bookingId },
      data: { status: "COMPLETED" }
    });
  });
};
var bookingRelatedService = {
  createBooking,
  getBookings,
  getTutorBookings,
  updateBookingStatus,
  cancelBooking,
  bookingCompletion,
  getDashboardData
};

// src/modules/booking/booking.controller.ts
var createBooking2 = async (req, res) => {
  const { studentId, slotId } = req.body;
  try {
    const booking = await bookingRelatedService.createBooking(
      studentId,
      slotId
    );
    res.status(201).json(booking);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
var getBookings2 = async (req, res) => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;
    const { status } = req.query;
    if (!userId || !userRole) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const filters = {};
    if (userRole === "ADMIN") {
      if (req.query.studentId)
        filters.studentId = req.query.studentId;
      if (req.query.tutorId) filters.tutorId = req.query.tutorId;
      if (req.query.startDate)
        filters.startDate = new Date(req.query.startDate);
      if (req.query.endDate)
        filters.endDate = new Date(req.query.endDate);
    }
    const bookings = await bookingRelatedService.getBookings(
      userId,
      userRole,
      status,
      filters
    );
    res.json(bookings);
  } catch (error) {
    console.error("Error fetching bookings:", error);
    if (error.message === "Tutor profile not found") {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: "Failed to fetch bookings" });
  }
};
var getDashboard = async (req, res) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;
    const data = await bookingRelatedService.getDashboardData(userId, role);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: "Failed to load dashboard" });
  }
};
var getTutorBookings2 = async (req, res) => {
  try {
    const tutorId = req.params.tutorId;
    const { status } = req.query;
    const tutorProfile = await prisma.tutorProfile.findUnique({
      where: { userId: req.user?.id }
    });
    if (!tutorProfile || tutorProfile.id !== tutorId) {
      return res.status(403).json({ error: "Not authorized" });
    }
    const bookings = await bookingRelatedService.getTutorBookings(
      tutorId,
      status
    );
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch bookings" });
  }
};
var updateBookingStatus2 = async (req, res) => {
  try {
    const bookingId = req.params.bookingId;
    const { status } = req.body;
    const userId = req.user?.id;
    const role = req.user?.role;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    if (!status) return res.status(400).json({ error: "Status is required" });
    const booking = await bookingRelatedService.updateBookingStatus(
      bookingId,
      userId,
      role,
      status
    );
    res.json(booking);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
var cancelBooking2 = async (req, res) => {
  try {
    const bookingId = req.params.bookingId;
    const studentId = req.user?.id;
    if (!studentId) return res.status(401).json({ error: "Unauthorized" });
    const booking = await bookingRelatedService.cancelBooking(
      bookingId,
      studentId
    );
    res.json(booking);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
var bookingCompletion2 = async (req, res) => {
  try {
    const bookingId = req.params.bookingId;
    const studentId = req.user?.id;
    if (!studentId) return res.status(401).json({ error: "Unauthorized" });
    const booking = await bookingRelatedService.bookingCompletion(
      bookingId,
      studentId
    );
    res.json(booking);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
var bookingController = {
  createBooking: createBooking2,
  getBookings: getBookings2,
  getTutorBookings: getTutorBookings2,
  cancelBooking: cancelBooking2,
  updateBookingStatus: updateBookingStatus2,
  bookingCompletion: bookingCompletion2,
  getDashboard
};

// src/modules/booking/booking.router.ts
var bookingRouter = Router3();
bookingRouter.get(
  "/dashboard",
  auth2("STUDENT" /* STUDENT */, "TUTOR" /* TUTOR */, "ADMIN" /* ADMIN */),
  bookingController.getDashboard
);
bookingRouter.get(
  "/",
  auth2("STUDENT" /* STUDENT */, "ADMIN" /* ADMIN */, "TUTOR" /* TUTOR */),
  bookingController.getBookings
);
bookingRouter.put(
  "/:bookingId",
  auth2("STUDENT" /* STUDENT */),
  bookingController.cancelBooking
);
bookingRouter.put(
  "/complete/:bookingId",
  auth2("STUDENT" /* STUDENT */),
  bookingController.bookingCompletion
);
bookingRouter.get(
  "/tutor/:tutorId",
  auth2("TUTOR" /* TUTOR */),
  bookingController.getTutorBookings
);
bookingRouter.patch(
  "/status/:bookingId",
  auth2("TUTOR" /* TUTOR */, "STUDENT" /* STUDENT */, "ADMIN" /* ADMIN */),
  bookingController.updateBookingStatus
);
bookingRouter.post("/", bookingController.createBooking);

// src/modules/category/category.route.ts
import { Router as Router4 } from "express";

// src/modules/category/category.service.ts
var getAllCategories = async () => {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { name: "asc" }
    });
    return categories;
  } catch (error) {
    console.error("Error fetching categories:", error);
    throw error;
  }
};
var createCategoryByAdmin = async (categoryData, userId) => {
  try {
    const createdCategory = await prisma.category.create({
      data: categoryData
    });
    return createdCategory;
  } catch (error) {
    console.error("Error creating category:", error);
    throw error;
  }
};
var addCategoriesToTutor = async (tutorId, categoryIds) => {
  return await prisma.$transaction(async (tx) => {
    await tx.tutorCategory.deleteMany({
      where: { tutorId }
    });
    const tutorCategories = categoryIds.map((categoryId) => ({
      tutorId,
      categoryId
    }));
    await tx.tutorCategory.createMany({
      data: tutorCategories,
      skipDuplicates: true
    });
    return await tx.tutorProfile.findUnique({
      where: { id: tutorId },
      include: {
        categories: {
          include: {
            category: true
          }
        }
      }
    });
  });
};
var getTutorCategories = async (tutorId) => {
  const tutorCategories = await prisma.tutorCategory.findMany({
    where: { tutorId },
    include: {
      category: true
    }
  });
  return tutorCategories.map((tc) => tc.category);
};
var getTutorsByCategory = async (categoryId, page = 1, limit = 10) => {
  const skip = (page - 1) * limit;
  const [tutorCategories, total] = await Promise.all([
    prisma.tutorCategory.findMany({
      where: { categoryId },
      include: {
        tutor: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                image: true
              }
            },
            _count: {
              select: {
                reviews: true
              }
            }
          }
        }
      },
      skip,
      take: limit
    }),
    prisma.tutorCategory.count({
      where: { categoryId }
    })
  ]);
  const tutors = tutorCategories.map((tc) => ({
    ...tc.tutor,
    user: tc.tutor.user,
    reviewCount: tc.tutor._count.reviews
  }));
  return {
    tutors,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  };
};
var categoryService = {
  createCategoryByAdmin,
  getAllCategories,
  addCategoriesToTutor,
  getTutorCategories,
  getTutorsByCategory
};

// src/modules/category/category.controller.ts
var createCategoryByAdmin2 = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized"
      });
    }
    const category = await categoryService.createCategoryByAdmin(
      req.body,
      req.user?.id
    );
    res.status(201).json({
      success: true,
      data: category,
      message: "Category created successfully by admin"
    });
  } catch (error) {
    console.error("Category creation error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create category by admin",
      error: process.env.NODE_ENV === "development" ? error.message : void 0
    });
  }
};
var getAllCategory = async (req, res) => {
  try {
    const results = await categoryService.getAllCategories();
    res.status(200).json({
      success: true,
      data: results,
      message: "Retrieved all Category"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to retrieve all category"
    });
  }
};
var categoryController = {
  createCategoryByAdmin: createCategoryByAdmin2,
  getAllCategory
};

// src/modules/category/category.route.ts
var categoryRouter = Router4();
categoryRouter.post(
  "/",
  auth2("ADMIN" /* ADMIN */),
  categoryController.createCategoryByAdmin
);
categoryRouter.get("/", categoryController.getAllCategory);

// src/modules/review/review.router.ts
import { Router as Router5 } from "express";

// src/modules/review/review.service.ts
var createReview = async (data, studentId) => {
  return await prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({
      where: { id: data.bookingId },
      include: {
        student: true,
        tutor: true,
        review: true
        // Check if review already exists
      }
    });
    if (!booking) {
      throw new Error("Booking not found");
    }
    if (booking.studentId !== studentId) {
      throw new Error("Not authorized to review this booking");
    }
    if (booking.review) {
      throw new Error("Review already exists for this booking");
    }
    if (booking.status !== "COMPLETED") {
      throw new Error("Only completed bookings can be reviewed");
    }
    if (data.rating < 1 || data.rating > 5) {
      throw new Error("Rating must be between 1 and 5");
    }
    const review = await tx.review.create({
      data: {
        rating: data.rating,
        comment: data.comment,
        studentId: booking.studentId,
        tutorId: booking.tutorId,
        bookingId: booking.id
      },
      include: {
        student: {
          select: { id: true, name: true, email: true }
        },
        booking: true
      }
    });
    const reviews = await tx.review.findMany({
      where: { tutorId: booking.tutorId },
      select: { rating: true }
    });
    const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
    await tx.tutorProfile.update({
      where: { id: booking.tutorId },
      data: { rating: Number(avgRating.toFixed(1)) }
    });
    return review;
  });
};
var getReviewByBooking = (bookingId) => {
  return prisma.review.findUnique({
    where: { bookingId }
  });
};
var getTutorReviews = async (tutorId, page = 1, limit = 10) => {
  const skip = (page - 1) * limit;
  const [reviews, total] = await Promise.all([
    prisma.review.findMany({
      where: { tutorId },
      include: {
        student: {
          select: { id: true, name: true, email: true }
        },
        booking: true
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit
    }),
    prisma.review.count({ where: { tutorId } })
  ]);
  return {
    reviews,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  };
};
var getStudentReviews = async (studentId) => {
  return await prisma.review.findMany({
    where: { studentId },
    include: {
      tutor: {
        include: {
          user: {
            select: { name: true, email: true }
          }
        }
      },
      booking: true
    },
    orderBy: { createdAt: "desc" }
  });
};
var reviewService = {
  createReview,
  getReviewByBooking,
  getTutorReviews,
  getStudentReviews
};

// src/modules/review/review.controller.ts
var createReview2 = async (req, res) => {
  try {
    const studentId = req.user?.id;
    const { bookingId, rating, comment } = req.body;
    if (!studentId) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    if (!bookingId || !rating) {
      return res.status(400).json({ error: "Booking ID and rating are required" });
    }
    const review = await reviewService.createReview(req.body, studentId);
    res.status(201).json(review);
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: error.message });
  }
};
var getTutorReview = async (req, res) => {
  try {
    const tutorId = req.params.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const result = await reviewService.getTutorReviews(tutorId, page, limit);
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch reviews" });
  }
};
var reviewController = {
  createReview: createReview2,
  getTutorReview
};

// src/modules/review/review.router.ts
var reviewRouter = Router5();
reviewRouter.post("/", auth2("STUDENT" /* STUDENT */), reviewController.createReview);

// src/modules/tutorCategories/categories.route.ts
import { Router as Router6 } from "express";

// src/modules/tutorCategories/categories.service.ts
var createCategory = async (categoryData) => {
  const newCategory = await prisma.tutorCategory.create({
    data: categoryData
  });
  return newCategory;
};
var categoriesService = {
  createCategory
};

// src/modules/tutorCategories/categories.controller.ts
var createCategory2 = async (req, res) => {
  try {
    const category = await categoriesService.createCategory(req.body);
    res.status(201).json({
      success: true,
      data: category,
      message: "Category created successfully"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to create category"
    });
  }
};
var addTutorCategories = async (req, res) => {
  try {
    const tutorId = req.params.tutorId;
    const { categoryIds } = req.body;
    if (!categoryIds || !Array.isArray(categoryIds)) {
      return res.status(400).json({ error: "Category IDs array is required" });
    }
    const updatedTutor = await categoryService.addCategoriesToTutor(
      tutorId,
      categoryIds
    );
    res.json(updatedTutor);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to add categories to tutor" });
  }
};
var categoriesController = {
  createCategory: createCategory2,
  addTutorCategories
};

// src/modules/tutorCategories/categories.route.ts
var categoriesRoute = Router6();
categoriesRoute.post("/", categoriesController.createCategory);
categoriesRoute.post(
  "/tutor/:tutorId",
  auth2("TUTOR" /* TUTOR */),
  categoriesController.addTutorCategories
);

// src/modules/tutorProfile/tutorProfile.router.ts
import { Router as Router7 } from "express";

// src/modules/tutorProfile/tutorProfile.service.ts
var createTutorProfile = async (data, userId) => {
  return await prisma.$transaction(async (tx) => {
    const tutorProfile = await tx.tutorProfile.create({
      data: {
        bio: data.bio,
        pricePerHr: data.pricePerHr,
        experience: data.experience,
        userId
      }
    });
    if (data.categoryIds && data.categoryIds.length > 0) {
      const tutorCategories = data.categoryIds.map((categoryId) => ({
        tutorId: tutorProfile.id,
        categoryId
      }));
      await tx.tutorCategory.createMany({
        data: tutorCategories,
        skipDuplicates: true
      });
    }
    return await tx.tutorProfile.findUnique({
      where: { id: tutorProfile.id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true
          }
        },
        categories: {
          include: {
            category: true
          }
        }
      }
    });
  });
};
var getAllTutorProfiles = async (filters) => {
  const {
    search,
    categoryIds = [],
    minRating,
    maxPrice,
    minPrice,
    isFeatured,
    isVerified,
    page = 1,
    limit = 10,
    sortBy = "rating",
    sortOrder = "desc"
  } = filters;
  const skip = (page - 1) * limit;
  const conditions = [];
  if (search) {
    conditions.push({
      OR: [
        { bio: { contains: search, mode: "insensitive" } },
        { user: { name: { contains: search, mode: "insensitive" } } }
      ]
    });
  }
  if (categoryIds.length > 0) {
    conditions.push({
      categories: {
        some: {
          categoryId: { in: categoryIds }
        }
      }
    });
  }
  if (minRating !== void 0) {
    conditions.push({
      rating: { gte: minRating }
    });
  }
  if (minPrice !== void 0 || maxPrice !== void 0) {
    conditions.push({
      pricePerHr: {
        gte: minPrice ?? 0,
        lte: maxPrice ?? Number.MAX_SAFE_INTEGER
      }
    });
  }
  if (isVerified !== void 0) {
    conditions.push({ isVerified });
  }
  if (isFeatured !== void 0) {
    conditions.push({ isFeatured });
  }
  const where = { AND: conditions };
  const total = await prisma.tutorProfile.count({ where });
  const orderBy = {};
  orderBy[sortBy] = sortOrder;
  const tutorsProfile = await prisma.tutorProfile.findMany({
    where,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true
        }
      },
      categories: {
        include: {
          category: true
        }
      },
      reviews: {
        take: 3,
        orderBy: { createdAt: "desc" },
        include: {
          student: {
            select: {
              name: true,
              image: true
            }
          }
        }
      },
      availability: {
        where: {
          isBooked: false,
          startTime: { gt: /* @__PURE__ */ new Date() }
        },
        take: 5
      },
      _count: {
        select: {
          reviews: true,
          bookings: { where: { status: "COMPLETED" } }
        }
      }
    },
    orderBy,
    skip,
    take: limit
  });
  const formattedTutors = tutorsProfile.map((tutor) => ({
    id: tutor.id,
    name: tutor.user.name,
    email: tutor.user.email,
    image: tutor.user.image,
    bio: tutor.bio,
    pricePerHr: tutor.pricePerHr,
    rating: tutor.rating,
    experience: tutor.experience,
    isVerified: tutor.isVerified,
    createdAt: tutor.createdAt,
    categories: tutor.categories.map((c) => ({
      id: c.category.id,
      name: c.category.name
    })),
    recentReviews: tutor.reviews.map((review) => ({
      id: review.id,
      rating: review.rating,
      comment: review.comment,
      createdAt: review.createdAt,
      studentName: review.student.name,
      studentImage: review.student.image
    })),
    totalReviews: tutor._count.reviews,
    completedSessions: tutor._count.bookings,
    availableSlots: tutor.availability.length,
    nextAvailableSlot: tutor.availability.length > 0 ? tutor.availability[0]?.startTime : null
  }));
  return {
    tutors: formattedTutors,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page * limit < total,
      hasPrevPage: page > 1
    }
  };
};
var getTutorProfileByUserId = async (userId) => {
  const tutorProfile = await prisma.tutorProfile.findUnique({
    where: { userId }
  });
  return tutorProfile;
};
var getTutorProfileByTutorId = async (tutorProfileId) => {
  const tutorProfile = await prisma.tutorProfile.findUnique({
    where: { id: tutorProfileId },
    include: {
      user: true,
      categories: {
        include: {
          category: true
        }
      }
    }
  });
  return tutorProfile;
};
var updateTutorProfileById = async (updatedData, tutorProfileId) => {
  const updatedTutorProfile = await prisma.tutorProfile.update({
    where: { id: tutorProfileId },
    data: updatedData
  });
  return updatedTutorProfile;
};
var deleteTutorProfileById = async (tutorProfileId) => {
  await prisma.tutorProfile.delete({
    where: { id: tutorProfileId }
  });
};
var tutorProfileService = {
  createTutorProfile,
  getAllTutorProfiles,
  getTutorProfileByUserId,
  updateTutorProfileById,
  deleteTutorProfileById,
  getTutorProfileByTutorId
};

// src/modules/tutorProfile/tutorProfile.controller.ts
var createTutorProfile2 = async (req, res) => {
  try {
    const tutorProfileData = req.body;
    const userId = req.user?.id;
    if (req.user?.role != "TUTOR") {
      return res.status(403).json({ error: "Only tutors can create tutor profiles" });
    }
    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }
    const newTutorProfile = await tutorProfileService.createTutorProfile(
      tutorProfileData,
      userId
    );
    res.status(201).json(newTutorProfile);
  } catch (error) {
    console.error("Error creating tutor profile:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
var getAllTutorProfiles2 = async (req, res) => {
  try {
    const search = req.query.search;
    const categoryParam = req.query.categoryIds;
    let categoryIds = [];
    if (Array.isArray(categoryParam)) {
      categoryIds = categoryParam;
    } else if (typeof categoryParam === "string") {
      categoryIds = [categoryParam];
    }
    const minRating = req.query.minRating ? parseFloat(req.query.minRating) : void 0;
    const maxPrice = req.query.maxPrice ? parseFloat(req.query.maxPrice) : void 0;
    const minPrice = req.query.minPrice ? parseFloat(req.query.minPrice) : void 0;
    const isVerified = req.query.isVerified === "true" ? true : req.query.isVerified === "false" ? false : void 0;
    const isFeatured = req.query.isFeatured === "true" ? true : req.query.isFeatured === "false" ? false : void 0;
    const page = req.query.page ? parseInt(req.query.page) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit) : 10;
    let sortBy = "rating";
    let sortOrder = "desc";
    const sortParam = req.query.sortBy;
    if (sortParam === "price_low") {
      sortBy = "pricePerHr";
      sortOrder = "asc";
    } else if (sortParam === "price_high") {
      sortBy = "pricePerHr";
      sortOrder = "desc";
    } else if (sortParam === "experience") {
      sortBy = "experience";
      sortOrder = "desc";
    } else if (sortParam === "newest") {
      sortBy = "createdAt";
      sortOrder = "desc";
    }
    const result = await tutorProfileService.getAllTutorProfiles({
      search,
      categoryIds,
      minRating,
      maxPrice,
      minPrice,
      isVerified,
      isFeatured,
      page,
      limit,
      sortBy,
      sortOrder
    });
    res.status(200).json(result);
  } catch (error) {
    console.error("Error fetching tutor profiles:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
var getTutorProfileByUserId2 = async (req, res) => {
  try {
    const userId = req.params.userId;
    const tutorProfile = await tutorProfileService.getTutorProfileByUserId(userId);
    if (!tutorProfile) {
      return res.status(404).json({ error: "Tutor profile not found" });
    }
    res.status(200).json(tutorProfile);
  } catch (error) {
    console.error("Error fetching tutor profile:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
var getTutorProfileByTutorProfileId = async (req, res) => {
  try {
    const tutorProfileId = req.params.tutorProfileId;
    const tutorProfile = await tutorProfileService.getTutorProfileByTutorId(tutorProfileId);
    if (!tutorProfile) {
      return res.status(404).json({ error: "Tutor profile not found" });
    }
    res.status(200).json(tutorProfile);
  } catch (error) {
    console.error("Error fetching tutor profile:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
var updateTutorProfileById2 = async (req, res) => {
  try {
    const tutorProfileId = req.params.id;
    const updatedData = req.body;
    const updatedTutorProfile = await tutorProfileService.updateTutorProfileById(
      updatedData,
      tutorProfileId
    );
    res.status(200).json(updatedTutorProfile);
  } catch (error) {
    console.error("Error updating tutor profile:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
var deleteTutorProfileById2 = async (req, res) => {
  try {
    const tutorProfileId = req.params.id;
    await tutorProfileService.deleteTutorProfileById(tutorProfileId);
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting tutor profile:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
var tutorProfileController = {
  createTutorProfile: createTutorProfile2,
  getAllTutorProfiles: getAllTutorProfiles2,
  getTutorProfileByUserId: getTutorProfileByUserId2,
  updateTutorProfileById: updateTutorProfileById2,
  deleteTutorProfileById: deleteTutorProfileById2,
  getTutorProfileByTutorProfileId
};

// src/modules/tutorProfile/tutorProfile.router.ts
var tutorProfileRouter = Router7();
tutorProfileRouter.post(
  "/",
  auth2("TUTOR" /* TUTOR */),
  tutorProfileController.createTutorProfile
);
tutorProfileRouter.get("/", tutorProfileController.getAllTutorProfiles);
tutorProfileRouter.get(
  "/:tutorProfileId",
  tutorProfileController.getTutorProfileByTutorProfileId
);
tutorProfileRouter.get(
  "/:userId",
  tutorProfileController.getTutorProfileByUserId
);
tutorProfileRouter.put(
  "/:id",
  auth2("TUTOR" /* TUTOR */),
  tutorProfileController.updateTutorProfileById
);
tutorProfileRouter.delete(
  "/:id",
  auth2("TUTOR" /* TUTOR */, "ADMIN" /* ADMIN */),
  tutorProfileController.deleteTutorProfileById
);

// src/server.ts
var app = express();
var port = process.env.PORT || 5e3;
app.use(
  cors({
    origin: ["https://skill-bridge-4216.vercel.app", "http://localhost:3000"],
    credentials: true
  })
);
app.all("/api/auth/*splat", toNodeHandler(auth));
app.use(express.json());
app.get("/", (req, res) => {
  res.send("skillBridge project started!");
});
app.use("/api/v1/tutor-categories", categoriesRoute);
app.use("/api/v1/categories", categoryRouter);
app.use("/api/v1/tutor-profiles", tutorProfileRouter);
app.use("/api/v1/availability-slots", slotRouter);
app.use("/api/v1/bookings", bookingRouter);
app.use("/api/v1/reviews", reviewRouter);
app.use("/api/v1/admin", adminRouter);
app.get("/", (req, res) => {
  res.send("API is running");
});
app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
var server_default = app;

// src/index.ts
var index_default = server_default;
export {
  index_default as default
};
