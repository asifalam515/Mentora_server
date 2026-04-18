import {
  BookingStatus,
  InvoiceStatus,
  PaymentStatus,
  Role,
  UserStatus,
  prisma,
  sendBookingConfirmationNotification,
  sendNewMessageNotification,
  sendPaymentSuccessNotification
} from "./chunk-CCFEYHHT.js";

// src/app.ts
import cookieParser from "cookie-parser";
import cors from "cors";
import express3 from "express";
import path2 from "path";

// src/modules/admin/admin.router.ts
import { Router } from "express";

// src/middleware/auth.ts
import jwt2 from "jsonwebtoken";

// src/modules/Auth/auth.service.ts
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
var secret = process.env.SECRET;
if (!secret) {
  throw new Error("SECRET is not defined in environment variables");
}
var createUserIntoDB = async (payload) => {
  const existingUser = await prisma.user.findUnique({
    where: { email: payload.email }
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
      status: payload.status || "ACTIVE"
    }
  });
  const { password, ...newResult } = result;
  return newResult;
};
var loginUserIntoDB = async (payload) => {
  const user = await prisma.user.findUnique({
    where: {
      email: payload.email
    }
  });
  if (!user) {
    throw new Error("User not found!");
  }
  const isPasswordMatched = await bcrypt.compare(
    payload.password,
    user.password
  );
  if (!isPasswordMatched) {
    throw new Error("Invalid credentials!!");
  }
  const tokenPayload = {
    id: user.id,
    email: user.email,
    role: user.role
  };
  const token = jwt.sign(tokenPayload, secret, {
    expiresIn: "1d"
  });
  const { password, ...safeUser } = user;
  return {
    accessToken: token,
    user: safeUser
  };
};
var AuthService = {
  // Add service methods here
  createUserIntoDB,
  loginUserIntoDB
};

// src/middleware/auth.ts
var auth = (...roles) => {
  return async (req, res, next) => {
    try {
      const authHeader = req.headers.authorization;
      const cookieToken = req.cookies?.token;
      const altHeaderToken = req.headers["x-access-token"] || req.headers["token"];
      const rawCookieHeader = req.headers.cookie;
      const cookieHeaderToken = rawCookieHeader?.split(";").map((part) => part.trim()).find((part) => part.startsWith("token="))?.split("=")[1];
      const token = authHeader?.startsWith("Bearer ") ? authHeader.split(" ")[1] : cookieToken || cookieHeaderToken || altHeaderToken;
      if (!token) {
        return res.status(401).json({ message: "No token provided" });
      }
      const decoded = jwt2.verify(
        decodeURIComponent(token),
        secret
      );
      const userData = await prisma.user.findUnique({
        where: { email: decoded.email }
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
      req.user = userData;
      next();
    } catch (error) {
      return res.status(401).json({ message: "Invalid or expired token" });
    }
  };
};
var auth_default = auth;

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
  adminController.getDashboardStats
);
adminRouter.get("/users", adminController.getAllUsers);
adminRouter.get(
  "/users/:userId",
  auth_default("ADMIN" /* admin */),
  adminController.getUserDetails
);
adminRouter.put(
  "/users/:userId/status",
  auth_default("ADMIN" /* admin */),
  adminController.updateUserStatus
);
adminRouter.delete(
  "/users/:userId",
  auth_default("ADMIN" /* admin */),
  adminController.deleteUser
);
adminRouter.put(
  "/tutors/:tutorId/verify",
  auth_default("ADMIN" /* admin */),
  adminController.verifyTutor
);
adminRouter.get(
  "/bookings",
  auth_default("ADMIN" /* admin */),
  adminController.getAllBookings
);
adminRouter.put(
  "/bookings/:bookingId/status",
  auth_default("ADMIN" /* admin */),
  adminController.updateBookingStatus
);

// src/modules/Auth/auth.router.ts
import express from "express";

// src/utils/sendResponse.ts
var sendResponse = (res, data) => {
  const { statusCode, success, message, data: DataReponse } = data;
  res.status(statusCode).json({
    success,
    message,
    data: DataReponse
  });
};
var sendResponse_default = sendResponse;

// src/modules/Auth/auth.controller.ts
var createUser = async (req, res, next) => {
  try {
    const result = await AuthService.createUserIntoDB(req.body);
    sendResponse_default(res, {
      statusCode: 201,
      success: true,
      message: "User created successfully",
      data: result
    });
  } catch (error) {
    next(error);
  }
};
var loginUser = async (req, res) => {
  try {
    const result = await AuthService.loginUserIntoDB(req.body);
    const isProduction = process.env.NODE_ENV === "production" || process.env.VERCEL === "1";
    res.cookie("token", result.accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "none" : "lax",
      maxAge: 24 * 60 * 60 * 1e3
      // 1 day
    });
    sendResponse_default(res, {
      statusCode: 200,
      success: true,
      message: "User logged in successfully",
      data: {
        user: result.user,
        token: result.accessToken
        // 🔥 ADD THIS
      }
    });
  } catch (error) {
    sendResponse_default(res, {
      statusCode: 401,
      success: false,
      message: error?.message || "Invalid credentials",
      data: null
    });
  }
};
var AuthController = {
  createUser,
  loginUser
};

// src/modules/Auth/auth.router.ts
var AuthRouter = express.Router();
AuthRouter.post("/register", AuthController.createUser);
AuthRouter.post("/login", AuthController.loginUser);

// src/modules/availabilitySlot/slot.router.ts
import { Router as Router2 } from "express";

// src/modules/availabilitySlot/slot.service.ts
var getAvailabilitySlots = async (tutorId) => {
  const now = /* @__PURE__ */ new Date();
  const slots = await prisma.availabilitySlot.findMany({
    where: {
      tutorId,
      endTime: { gt: now }
    },
    orderBy: { startTime: "asc" }
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
  const now = /* @__PURE__ */ new Date();
  const slots = await prisma.availabilitySlot.findMany({
    where: {
      tutorId,
      endTime: { gt: now }
    },
    orderBy: { startTime: "asc" }
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
var updateAvailabilitySlotById = async (slotId, userId, data) => {
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
      throw new Error("Not authorized to update this slot");
    }
    if (slot.isBooked) {
      throw new Error("Cannot update a booked slot");
    }
    if (data.startTime >= data.endTime) {
      throw new Error("Start time must be before end time");
    }
    const overlappingSlot = await tx.availabilitySlot.findFirst({
      where: {
        tutorId: tutorProfile.id,
        id: { not: slotId },
        OR: [
          {
            startTime: { lt: data.endTime },
            endTime: { gt: data.startTime }
          }
        ]
      }
    });
    if (overlappingSlot) {
      throw new Error("Updated slot overlaps with an existing slot");
    }
    const updatedSlot = await tx.availabilitySlot.update({
      where: { id: slotId },
      data: {
        startTime: data.startTime,
        endTime: data.endTime
      }
    });
    return updatedSlot;
  });
};
var slotService = {
  createTimeSlotService,
  getAvailabilitySlotsByTutorId,
  deleteAvailabilitySlotById,
  getAvailabilitySlots,
  updateAvailabilitySlotById
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
var updateAvailAbility = async (req, res) => {
  try {
    const userId = req.user?.id;
    const slotId = req.params.slotId;
    const data = req.body;
    const slot = await slotService.updateAvailabilitySlotById(
      slotId,
      userId,
      data
    );
    res.status(200).json(slot);
  } catch (error) {
    console.error("Update SLOT ERROR:", error.message);
    res.status(400).json({
      error: error.message || "Failed to delete availability slots"
    });
  }
};
var slotController = {
  createTimeSlot,
  getAvailabilitySlotsByTutorId: getAvailabilitySlotsByTutorId2,
  deleteAvailabilitySlot,
  getAvailabilitySlots: getAvailabilitySlots2,
  updateAvailAbility
};

// src/modules/availabilitySlot/slot.router.ts
var slotRouter = Router2();
slotRouter.get(
  "/",
  auth_default("ADMIN" /* admin */, "STUDENT" /* student */, "TUTOR" /* tutor */),
  slotController.getAvailabilitySlotsByTutorId
);
slotRouter.get(
  "/tutor/:tutorId",
  slotController.getAvailabilitySlots
);
slotRouter.post("/", auth_default("TUTOR" /* tutor */), slotController.createTimeSlot);
slotRouter.delete(
  "/:slotId",
  auth_default("TUTOR" /* tutor */, "ADMIN" /* admin */),
  slotController.deleteAvailabilitySlot
);
slotRouter.patch(
  "/:slotId",
  auth_default("TUTOR" /* tutor */, "ADMIN" /* admin */),
  slotController.updateAvailAbility
);

// src/modules/booking/booking.router.ts
import { Router as Router3 } from "express";

// src/modules/booking/booking.service.ts
import Stripe from "stripe";
var createInvoiceNumber = (bookingId) => {
  const slug = bookingId.replace(/-/g, "").slice(0, 12).toUpperCase();
  return `INV-${(/* @__PURE__ */ new Date()).getFullYear()}-${slug}`;
};
var PLATFORM_COMMISSION_PERCENT = 10;
var DEFAULT_CURRENCY = (process.env.STRIPE_CURRENCY || "usd").toLowerCase();
var stripeClient = null;
var getStripeClient = () => {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }
  if (!stripeClient) {
    stripeClient = new Stripe(secretKey);
  }
  return stripeClient;
};
var toCents = (amount) => Math.round(amount * 100);
var parseIntegerMeta = (value, fallback) => {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};
var parseFloatMeta = (value, fallback) => {
  if (!value) return fallback;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};
var calculateSlotAmounts = (startTime, endTime, pricePerHr) => {
  const durationMs = endTime.getTime() - startTime.getTime();
  if (durationMs <= 0) {
    throw new Error("Invalid slot duration");
  }
  const totalHours = Number((durationMs / (1e3 * 60 * 60)).toFixed(2));
  const totalAmountCents = toCents(totalHours * pricePerHr);
  if (totalAmountCents <= 0) {
    throw new Error("Payment amount must be greater than zero");
  }
  const commissionAmountCents = Math.round(
    totalAmountCents * PLATFORM_COMMISSION_PERCENT / 100
  );
  const tutorAmountCents = totalAmountCents - commissionAmountCents;
  return {
    totalHours,
    totalAmountCents,
    commissionAmountCents,
    tutorAmountCents
  };
};
var getDashboardData = async (userId, role) => {
  const now = /* @__PURE__ */ new Date();
  const where = {};
  if (role === Role.STUDENT) {
    where.studentId = userId;
  }
  if (role === Role.TUTOR) {
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
    (b) => new Date(b.date) >= now && b.status !== BookingStatus.CANCELLED
  );
  const pastBookings = bookings.filter(
    (b) => new Date(b.date) < now || b.status === BookingStatus.COMPLETED
  );
  const stats = {
    total: bookings.length,
    upcoming: upcomingBookings.length,
    completed: bookings.filter((b) => b.status === BookingStatus.COMPLETED).length,
    cancelled: bookings.filter((b) => b.status === BookingStatus.CANCELLED).length
  };
  return {
    stats,
    upcomingBookings,
    pastBookings
  };
};
var createBookingPaymentIntent = async (studentId, slotId) => {
  const slot = await prisma.availabilitySlot.findFirst({
    where: {
      id: slotId,
      isBooked: false
    },
    include: {
      tutor: {
        select: {
          id: true,
          userId: true,
          pricePerHr: true
        }
      }
    }
  });
  if (!slot) {
    throw new Error("Time slot not found or already booked");
  }
  if (slot.tutor.userId === studentId) {
    throw new Error("Cannot book your own tutoring session");
  }
  const existingBooking = await prisma.booking.findFirst({
    where: {
      studentId,
      status: { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] },
      slot: {
        startTime: { lt: slot.endTime },
        endTime: { gt: slot.startTime }
      }
    }
  });
  if (existingBooking) {
    throw new Error("You already have a booking during this time");
  }
  const student = await prisma.user.findUnique({
    where: { id: studentId },
    select: {
      id: true,
      email: true,
      name: true,
      stripeCustomerId: true
    }
  });
  if (!student) {
    throw new Error("Student not found");
  }
  const {
    totalHours,
    totalAmountCents,
    commissionAmountCents,
    tutorAmountCents
  } = calculateSlotAmounts(slot.startTime, slot.endTime, slot.tutor.pricePerHr);
  const stripe = getStripeClient();
  let customerId = student.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: student.email,
      name: student.name,
      metadata: {
        userId: student.id
      }
    });
    customerId = customer.id;
    await prisma.user.update({
      where: { id: studentId },
      data: { stripeCustomerId: customerId }
    });
  }
  const paymentIntent = await stripe.paymentIntents.create({
    amount: totalAmountCents,
    currency: DEFAULT_CURRENCY,
    customer: customerId,
    automatic_payment_methods: { enabled: true },
    metadata: {
      slotId: slot.id,
      studentId,
      tutorId: slot.tutor.id,
      totalHours: String(totalHours),
      totalAmountCents: String(totalAmountCents),
      commissionAmountCents: String(commissionAmountCents),
      tutorAmountCents: String(tutorAmountCents)
    }
  });
  return {
    paymentIntentId: paymentIntent.id,
    clientSecret: paymentIntent.client_secret,
    currency: paymentIntent.currency,
    totalHours,
    totalAmountCents,
    commissionAmountCents,
    tutorAmountCents
  };
};
var createBooking = async (studentId, slotId, paymentIntentId) => {
  const existing = await prisma.booking.findUnique({
    where: { stripePaymentIntentId: paymentIntentId },
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
  if (existing) {
    if (existing.studentId !== studentId) {
      throw new Error("Payment intent does not belong to this student");
    }
    return existing;
  }
  const stripe = getStripeClient();
  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, {
    expand: ["latest_charge"]
  });
  if (paymentIntent.status !== "succeeded") {
    throw new Error("Payment has not been completed");
  }
  if (paymentIntent.metadata.studentId !== studentId) {
    throw new Error("Payment intent does not belong to this student");
  }
  if (paymentIntent.metadata.slotId !== slotId) {
    throw new Error("Payment intent is for a different slot");
  }
  const result = await prisma.$transaction(async (tx) => {
    const slot = await tx.availabilitySlot.findFirst({
      where: { id: slotId, isBooked: false },
      include: {
        tutor: {
          select: { userId: true, pricePerHr: true }
        }
      }
    });
    if (!slot) {
      throw new Error("Time slot not found or already booked");
    }
    if (slot.tutor.userId === studentId) {
      throw new Error("Cannot book your own tutoring session");
    }
    const conflict = await tx.booking.findFirst({
      where: {
        studentId,
        status: { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] },
        slot: {
          startTime: { lt: slot.endTime },
          endTime: { gt: slot.startTime }
        }
      }
    });
    if (conflict) {
      throw new Error("You already have a booking during this time");
    }
    const fallbackAmounts = calculateSlotAmounts(
      slot.startTime,
      slot.endTime,
      slot.tutor.pricePerHr
    );
    const totalAmountCents = parseIntegerMeta(
      paymentIntent.metadata.totalAmountCents,
      fallbackAmounts.totalAmountCents
    );
    const commissionAmountCents = parseIntegerMeta(
      paymentIntent.metadata.commissionAmountCents,
      fallbackAmounts.commissionAmountCents
    );
    const tutorAmountCents = parseIntegerMeta(
      paymentIntent.metadata.tutorAmountCents,
      fallbackAmounts.tutorAmountCents
    );
    const totalHours = parseFloatMeta(
      paymentIntent.metadata.totalHours,
      fallbackAmounts.totalHours
    );
    if (paymentIntent.amount_received !== totalAmountCents) {
      throw new Error("Paid amount does not match booking amount");
    }
    const latestCharge = paymentIntent.latest_charge;
    const stripeChargeId = typeof latestCharge === "string" ? latestCharge : latestCharge?.id ?? null;
    const booking = await tx.booking.create({
      data: {
        studentId,
        tutorId: slot.tutorId,
        slotId: slot.id,
        date: slot.startTime,
        status: BookingStatus.PENDING,
        paymentStatus: PaymentStatus.PAID,
        totalHours,
        totalAmountCents,
        commissionAmountCents,
        tutorAmountCents,
        currency: paymentIntent.currency,
        stripePaymentIntentId: paymentIntent.id,
        stripeChargeId
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
    await tx.invoice.create({
      data: {
        invoiceNumber: createInvoiceNumber(booking.id),
        bookingId: booking.id,
        studentId: booking.studentId,
        tutorId: booking.tutorId,
        amountCents: booking.totalAmountCents,
        commissionAmountCents: booking.commissionAmountCents,
        tutorAmountCents: booking.tutorAmountCents,
        currency: booking.currency,
        status: InvoiceStatus.ISSUED
      }
    });
    return booking;
  });
  try {
    const totalAmount = result.totalAmountCents;
    await sendPaymentSuccessNotification(
      result.student.id,
      totalAmount,
      result.tutor.user.name
    );
  } catch (error) {
    console.error("Failed to send payment notification:", error);
  }
  return result;
};
var getBookings = async (userId, userRole, status, filters) => {
  const where = {};
  if (userRole === Role.STUDENT) {
    where.studentId = userId;
  } else if (userRole === Role.TUTOR) {
    const tutorProfile = await prisma.tutorProfile.findUnique({
      where: { userId },
      select: { id: true }
    });
    if (!tutorProfile) {
      throw new Error("Tutor profile not found");
    }
    where.tutorId = tutorProfile.id;
  } else if (userRole === Role.ADMIN) {
    if (filters?.studentId) where.studentId = filters.studentId;
    if (filters?.tutorId) where.tutorId = filters.tutorId;
    if (filters?.startDate || filters?.endDate) {
      where.date = {
        gte: filters.startDate,
        lte: filters.endDate
      };
    }
  } else {
    throw new Error("Invalid user role");
  }
  if (status) {
    where.status = status;
  }
  return prisma.booking.findMany({
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
  return prisma.booking.findMany({
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
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId }
  });
  if (!booking) throw new Error("Booking not found");
  if (role === Role.STUDENT) {
    if (booking.studentId !== userId) throw new Error("Not authorized");
    if (status !== BookingStatus.CANCELLED) {
      throw new Error("Students can only cancel bookings");
    }
  }
  if (role === Role.TUTOR) {
    const tutorProfile = await prisma.tutorProfile.findUnique({
      where: { userId },
      select: { id: true }
    });
    if (!tutorProfile) throw new Error("Tutor profile not found");
    if (booking.tutorId !== tutorProfile.id) throw new Error("Not authorized");
    const allowed = [
      BookingStatus.CONFIRMED,
      BookingStatus.CANCELLED,
      BookingStatus.COMPLETED
    ];
    if (!allowed.includes(status)) {
      throw new Error("Invalid status for tutor");
    }
  }
  const bookingUpdateData = {
    status
  };
  const stripe = getStripeClient();
  if (status === BookingStatus.CONFIRMED && booking.paymentStatus === PaymentStatus.PAID) {
    const tutorProfile = await prisma.tutorProfile.findUnique({
      where: { id: booking.tutorId },
      select: { stripeConnectedAccountId: true }
    });
    if (tutorProfile?.stripeConnectedAccountId && booking.stripeChargeId) {
      const transfer = await stripe.transfers.create({
        amount: booking.tutorAmountCents,
        currency: booking.currency,
        destination: tutorProfile.stripeConnectedAccountId,
        source_transaction: booking.stripeChargeId,
        metadata: {
          bookingId: booking.id
        }
      });
      bookingUpdateData.paymentStatus = PaymentStatus.TRANSFERRED;
      bookingUpdateData.stripeTransferId = transfer.id;
    } else if (!tutorProfile?.stripeConnectedAccountId) {
      console.warn(
        `Booking ${booking.id} confirmed without tutor connected Stripe account. Funds remain PAID in platform balance.`
      );
    } else {
      console.warn(
        `Booking ${booking.id} confirmed without Stripe charge ID. Transfer skipped and funds remain PAID.`
      );
    }
  }
  if (status === BookingStatus.CANCELLED && (booking.paymentStatus === PaymentStatus.PAID || booking.paymentStatus === PaymentStatus.TRANSFERRED)) {
    const paymentIntentId = booking.stripePaymentIntentId;
    if (!paymentIntentId) {
      throw new Error("Stripe payment intent ID missing for this booking");
    }
    if (booking.stripeTransferId) {
      await stripe.transfers.createReversal(booking.stripeTransferId, {
        amount: booking.tutorAmountCents,
        metadata: {
          bookingId: booking.id,
          reason: "booking_cancelled"
        }
      });
    }
    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      metadata: {
        bookingId: booking.id,
        reason: "booking_cancelled"
      }
    });
    bookingUpdateData.paymentStatus = PaymentStatus.REFUNDED;
    bookingUpdateData.stripeRefundId = refund.id;
  }
  return prisma.$transaction(async (tx) => {
    if (status === BookingStatus.CANCELLED) {
      await tx.availabilitySlot.update({
        where: { id: booking.slotId },
        data: { isBooked: false }
      });
      await tx.invoice.updateMany({
        where: { bookingId: booking.id },
        data: { status: InvoiceStatus.REFUNDED }
      });
    }
    return tx.booking.update({
      where: { id: bookingId },
      data: bookingUpdateData,
      include: {
        student: { select: { id: true, name: true, email: true } },
        tutor: {
          include: {
            user: { select: { name: true, email: true } }
          }
        },
        slot: true
      }
    });
  }).then(async (updatedBooking) => {
    try {
      if (status === BookingStatus.CONFIRMED) {
        await sendBookingConfirmationNotification(
          updatedBooking.student.id || "",
          updatedBooking.tutor.user.name,
          updatedBooking.slot.startTime
        );
      }
    } catch (error) {
      console.error(
        "Failed to send booking confirmation notification:",
        error
      );
    }
    return updatedBooking;
  });
};
var cancelBooking = async (bookingId, studentId) => {
  return updateBookingStatus(
    bookingId,
    studentId,
    Role.STUDENT,
    BookingStatus.CANCELLED
  );
};
var bookingCompletion = async (bookingId, studentId) => {
  return prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({
      where: { id: bookingId }
    });
    if (!booking) throw new Error("Booking not found");
    if (booking.studentId !== studentId) throw new Error("Not authorized");
    if (booking.status !== BookingStatus.CONFIRMED) {
      throw new Error("Only confirmed bookings can be completed");
    }
    return tx.booking.update({
      where: { id: bookingId },
      data: { status: BookingStatus.COMPLETED }
    });
  });
};
var bookingRelatedService = {
  createBookingPaymentIntent,
  createBooking,
  getBookings,
  getTutorBookings,
  updateBookingStatus,
  cancelBooking,
  bookingCompletion,
  getDashboardData
};

// src/modules/booking/booking.controller.ts
var createBookingPaymentIntent2 = async (req, res) => {
  const studentId = req.user?.id;
  const { slotId } = req.body;
  try {
    if (!studentId) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    if (!slotId) {
      return res.status(400).json({ error: "slotId is required" });
    }
    const payload = await bookingRelatedService.createBookingPaymentIntent(
      studentId,
      slotId
    );
    res.status(200).json(payload);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
var createBooking2 = async (req, res) => {
  const studentId = req.user?.id;
  const { slotId, paymentIntentId } = req.body;
  try {
    if (!studentId) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    if (!slotId || !paymentIntentId) {
      return res.status(400).json({ error: "slotId and paymentIntentId are required" });
    }
    const booking = await bookingRelatedService.createBooking(
      studentId,
      slotId,
      paymentIntentId
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
  createBookingPaymentIntent: createBookingPaymentIntent2,
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
  auth_default("STUDENT" /* student */, "TUTOR" /* tutor */, "ADMIN" /* admin */),
  bookingController.getDashboard
);
bookingRouter.get(
  "/",
  auth_default("STUDENT" /* student */, "ADMIN" /* admin */, "TUTOR" /* tutor */),
  bookingController.getBookings
);
bookingRouter.put(
  "/:bookingId",
  auth_default("STUDENT" /* student */),
  bookingController.cancelBooking
);
bookingRouter.put(
  "/complete/:bookingId",
  auth_default("STUDENT" /* student */),
  bookingController.bookingCompletion
);
bookingRouter.get(
  "/tutor/:tutorId",
  auth_default("TUTOR" /* tutor */, "ADMIN" /* admin */),
  bookingController.getTutorBookings
);
bookingRouter.patch(
  "/status/:bookingId",
  auth_default("TUTOR" /* tutor */, "STUDENT" /* student */, "ADMIN" /* admin */),
  bookingController.updateBookingStatus
);
bookingRouter.post(
  "/payment-intent",
  auth_default("STUDENT" /* student */),
  bookingController.createBookingPaymentIntent
);
bookingRouter.post(
  "/",
  auth_default("STUDENT" /* student */),
  bookingController.createBooking
);

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
var deleteCategoryByAdmin = async (id) => {
  try {
    await prisma.tutorCategory.deleteMany({
      where: { categoryId: id }
    });
    const deleted = await prisma.category.delete({
      where: { id }
    });
    return deleted;
  } catch (error) {
    console.error("Error deleting category:", error);
    throw error;
  }
};
var updateCategoryByAdmin = async (id, name) => {
  try {
    const updated = await prisma.category.update({
      where: { id },
      data: { name }
    });
    return updated;
  } catch (error) {
    console.error("Error updating category:", error);
    throw error;
  }
};
var categoryService = {
  createCategoryByAdmin,
  getAllCategories,
  addCategoriesToTutor,
  getTutorCategories,
  getTutorsByCategory,
  deleteCategoryByAdmin,
  updateCategoryByAdmin
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
var updateCategoryByAdmin2 = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized"
      });
    }
    const { id } = req.params;
    const { name } = req.body;
    const updated = await categoryService.updateCategoryByAdmin(id, name);
    res.status(200).json({
      success: true,
      data: updated,
      message: "Category updated successfully"
    });
  } catch (error) {
    console.error("Update category error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update category",
      error: process.env.NODE_ENV === "development" ? error.message : void 0
    });
  }
};
var deleteCategoryByAdmin2 = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized"
      });
    }
    const { id } = req.params;
    await categoryService.deleteCategoryByAdmin(id);
    res.status(200).json({
      success: true,
      message: "Category deleted successfully"
    });
  } catch (error) {
    console.error("Delete category error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete category",
      error: process.env.NODE_ENV === "development" ? error.message : void 0
    });
  }
};
var categoryController = {
  createCategoryByAdmin: createCategoryByAdmin2,
  getAllCategory,
  updateCategoryByAdmin: updateCategoryByAdmin2,
  deleteCategoryByAdmin: deleteCategoryByAdmin2
};

// src/modules/category/category.route.ts
var categoryRouter = Router4();
categoryRouter.get("/", categoryController.getAllCategory);
categoryRouter.post(
  "/",
  auth_default("ADMIN" /* admin */),
  categoryController.createCategoryByAdmin
);
categoryRouter.put(
  "/:id",
  auth_default("ADMIN" /* admin */),
  categoryController.updateCategoryByAdmin
);
categoryRouter.delete(
  "/:id",
  auth_default("ADMIN" /* admin */),
  categoryController.deleteCategoryByAdmin
);

// src/modules/chat/chat.router.ts
import { Router as Router5 } from "express";
import fs from "fs";
import multer from "multer";
import path from "path";

// src/modules/chat/chat.service.ts
var getTutorProfileIdByUserId = async (userId) => {
  const tutor = await prisma.tutorProfile.findUnique({
    where: { userId },
    select: { id: true }
  });
  if (!tutor) {
    throw new Error("Tutor profile not found");
  }
  return tutor.id;
};
var assertBookingAccess = async (bookingId, userId, role) => {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      tutor: {
        select: {
          id: true,
          userId: true
        }
      }
    }
  });
  if (!booking) {
    throw new Error("Booking not found");
  }
  if (role === Role.STUDENT && booking.studentId !== userId) {
    throw new Error("Not authorized to access this booking chat");
  }
  if (role === Role.TUTOR && booking.tutor.userId !== userId) {
    throw new Error("Not authorized to access this booking chat");
  }
  if (role !== Role.STUDENT && role !== Role.TUTOR && role !== Role.ADMIN) {
    throw new Error("Invalid role for chat");
  }
  return booking;
};
var assertConversationAccess = async (conversationId, userId, role) => {
  const conversation = await prisma.chatConversation.findUnique({
    where: { id: conversationId },
    include: {
      tutor: {
        select: {
          id: true,
          userId: true
        }
      }
    }
  });
  if (!conversation) {
    throw new Error("Conversation not found");
  }
  if (role === Role.STUDENT && conversation.studentId !== userId) {
    throw new Error("Not authorized to access this conversation");
  }
  if (role === Role.TUTOR && conversation.tutor.userId !== userId) {
    throw new Error("Not authorized to access this conversation");
  }
  if (role !== Role.STUDENT && role !== Role.TUTOR && role !== Role.ADMIN) {
    throw new Error("Invalid role for chat");
  }
  return conversation;
};
var listConversations = async (userId, role) => {
  let where = {};
  if (role === Role.STUDENT) {
    where.studentId = userId;
  } else if (role === Role.TUTOR) {
    const tutorId = await getTutorProfileIdByUserId(userId);
    where.tutorId = tutorId;
  } else if (role !== Role.ADMIN) {
    throw new Error("Invalid role for chat");
  }
  const conversations = await prisma.chatConversation.findMany({
    where,
    include: {
      booking: {
        select: {
          id: true,
          date: true,
          status: true,
          paymentStatus: true
        }
      },
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
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: {
          sender: {
            select: {
              id: true,
              name: true
            }
          }
        }
      }
    },
    orderBy: { updatedAt: "desc" }
  });
  const unreadCounts = await Promise.all(
    conversations.map(
      (conversation) => prisma.chatMessage.count({
        where: {
          conversationId: conversation.id,
          senderId: { not: userId },
          readAt: null
        }
      })
    )
  );
  return conversations.map((conversation, index) => ({
    id: conversation.id,
    booking: conversation.booking,
    student: conversation.student,
    tutor: {
      id: conversation.tutor.id,
      name: conversation.tutor.user.name,
      email: conversation.tutor.user.email
    },
    lastMessage: conversation.messages[0] ?? null,
    unreadCount: unreadCounts[index],
    updatedAt: conversation.updatedAt
  }));
};
var getOrCreateConversationByBooking = async (bookingId, userId, role) => {
  const booking = await assertBookingAccess(bookingId, userId, role);
  const existing = await prisma.chatConversation.findUnique({
    where: { bookingId },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
        include: {
          sender: {
            select: {
              id: true,
              name: true
            }
          }
        }
      },
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
      }
    }
  });
  if (existing) {
    return existing;
  }
  return prisma.chatConversation.create({
    data: {
      bookingId: booking.id,
      studentId: booking.studentId,
      tutorId: booking.tutorId
    },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
        include: {
          sender: {
            select: {
              id: true,
              name: true
            }
          }
        }
      },
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
      }
    }
  });
};
var getConversationMessages = async (conversationId, userId, role) => {
  await assertConversationAccess(conversationId, userId, role);
  return prisma.chatMessage.findMany({
    where: { conversationId },
    include: {
      sender: {
        select: {
          id: true,
          name: true
        }
      }
    },
    orderBy: { createdAt: "asc" }
  });
};
var createMessage = async (payload) => {
  const {
    conversationId,
    senderId,
    role,
    text,
    fileUrl,
    fileName,
    fileType,
    fileSize
  } = payload;
  await assertConversationAccess(conversationId, senderId, role);
  const normalizedText = text?.trim();
  if (!normalizedText && !fileUrl) {
    throw new Error("Message text or file is required");
  }
  const message = await prisma.$transaction(async (tx) => {
    const created = await tx.chatMessage.create({
      data: {
        conversationId,
        senderId,
        text: normalizedText || null,
        fileUrl: fileUrl ?? null,
        fileName: fileName ?? null,
        fileType: fileType ?? null,
        fileSize: fileSize ?? null
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true
          }
        },
        conversation: {
          select: {
            studentId: true,
            tutorId: true,
            tutor: {
              select: {
                userId: true
              }
            }
          }
        }
      }
    });
    await tx.chatConversation.update({
      where: { id: conversationId },
      data: { updatedAt: /* @__PURE__ */ new Date() }
    });
    return created;
  });
  try {
    const recipientId = message.conversation.studentId === senderId ? message.conversation.tutor.userId : message.conversation.studentId;
    const messagePreview = normalizedText || `\u{1F4CE} ${fileName}`;
    await sendNewMessageNotification(
      recipientId,
      message.sender.name,
      messagePreview,
      conversationId
    );
  } catch (error) {
    console.error("Failed to send message notification:", error);
  }
  return message;
};
var markConversationRead = async (conversationId, userId, role) => {
  await assertConversationAccess(conversationId, userId, role);
  const unread = await prisma.chatMessage.findMany({
    where: {
      conversationId,
      senderId: { not: userId },
      readAt: null
    },
    select: { id: true }
  });
  if (unread.length === 0) {
    return {
      conversationId,
      messageIds: [],
      readAt: (/* @__PURE__ */ new Date()).toISOString()
    };
  }
  const readAt = /* @__PURE__ */ new Date();
  await prisma.chatMessage.updateMany({
    where: {
      id: { in: unread.map((m) => m.id) }
    },
    data: { readAt }
  });
  return {
    conversationId,
    messageIds: unread.map((m) => m.id),
    readAt: readAt.toISOString()
  };
};
var chatService = {
  assertConversationAccess,
  listConversations,
  getOrCreateConversationByBooking,
  getConversationMessages,
  createMessage,
  markConversationRead
};

// src/modules/chat/chat.controller.ts
var listConversations2 = async (req, res) => {
  try {
    const userId = req.user?.id;
    const role = req.user?.role;
    if (!userId || !role) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const conversations = await chatService.listConversations(userId, role);
    return res.status(200).json(conversations);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};
var getOrCreateConversation = async (req, res) => {
  try {
    const userId = req.user?.id;
    const role = req.user?.role;
    const bookingId = req.params.bookingId;
    if (!userId || !role) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const conversation = await chatService.getOrCreateConversationByBooking(
      bookingId,
      userId,
      role
    );
    return res.status(200).json(conversation);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};
var getConversationMessages2 = async (req, res) => {
  try {
    const userId = req.user?.id;
    const role = req.user?.role;
    const conversationId = req.params.conversationId;
    if (!userId || !role) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const messages = await chatService.getConversationMessages(
      conversationId,
      userId,
      role
    );
    return res.status(200).json(messages);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};
var createMessage2 = async (req, res) => {
  try {
    const userId = req.user?.id;
    const role = req.user?.role;
    const conversationId = req.params.conversationId || req.body?.conversationId;
    if (!userId || !role) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    if (!conversationId) {
      return res.status(400).json({ error: "conversationId is required" });
    }
    const message = await chatService.createMessage({
      conversationId,
      senderId: userId,
      role,
      text: req.body?.text,
      fileUrl: req.body?.fileUrl,
      fileName: req.body?.fileName,
      fileType: req.body?.fileType,
      fileSize: req.body?.fileSize
    });
    return res.status(201).json(message);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};
var uploadChatFile = async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: "File is required" });
    }
    const fileUrl = `/uploads/chat/${file.filename}`;
    return res.status(201).json({
      fileUrl,
      fileName: file.originalname,
      fileType: file.mimetype,
      fileSize: file.size
    });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};
var markConversationRead2 = async (req, res) => {
  try {
    const userId = req.user?.id;
    const role = req.user?.role;
    const conversationId = req.params.conversationId;
    if (!userId || !role) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const result = await chatService.markConversationRead(
      conversationId,
      userId,
      role
    );
    return res.status(200).json(result);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};
var chatController = {
  listConversations: listConversations2,
  getOrCreateConversation,
  getConversationMessages: getConversationMessages2,
  createMessage: createMessage2,
  uploadChatFile,
  markConversationRead: markConversationRead2
};

// src/modules/chat/chat.router.ts
var storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const uploadDir = path.join(process.cwd(), "uploads", "chat");
    fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname || "");
    cb(null, `${unique}${ext}`);
  }
});
var upload = multer({ storage, limits: { fileSize: 15 * 1024 * 1024 } });
var chatRouter = Router5();
chatRouter.get(
  "/conversations",
  auth_default("STUDENT" /* student */, "TUTOR" /* tutor */, "ADMIN" /* admin */),
  chatController.listConversations
);
chatRouter.get(
  "/booking/:bookingId",
  auth_default("STUDENT" /* student */, "TUTOR" /* tutor */, "ADMIN" /* admin */),
  chatController.getOrCreateConversation
);
chatRouter.get(
  "/:conversationId/messages",
  auth_default("STUDENT" /* student */, "TUTOR" /* tutor */, "ADMIN" /* admin */),
  chatController.getConversationMessages
);
chatRouter.post(
  "/:conversationId/messages",
  auth_default("STUDENT" /* student */, "TUTOR" /* tutor */, "ADMIN" /* admin */),
  chatController.createMessage
);
chatRouter.post(
  "/messages",
  auth_default("STUDENT" /* student */, "TUTOR" /* tutor */, "ADMIN" /* admin */),
  chatController.createMessage
);
chatRouter.post(
  "/message",
  auth_default("STUDENT" /* student */, "TUTOR" /* tutor */, "ADMIN" /* admin */),
  chatController.createMessage
);
chatRouter.post(
  "/upload",
  auth_default("STUDENT" /* student */, "TUTOR" /* tutor */),
  upload.single("file"),
  chatController.uploadChatFile
);
chatRouter.patch(
  "/:conversationId/read",
  auth_default("STUDENT" /* student */, "TUTOR" /* tutor */, "ADMIN" /* admin */),
  chatController.markConversationRead
);

// src/modules/invoice/invoice.router.ts
import { Router as Router6 } from "express";

// src/modules/invoice/invoice.service.ts
import PDFDocument from "pdfkit";
var formatMoney = (amountCents, currency) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase()
  }).format(amountCents / 100);
};
var toPdfBuffer = (doc) => {
  return new Promise((resolve, reject) => {
    const chunks = [];
    doc.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    doc.end();
  });
};
var listMyInvoices = async (studentId) => {
  const invoices = await prisma.invoice.findMany({
    where: { studentId },
    include: {
      booking: {
        select: {
          id: true,
          date: true,
          status: true,
          paymentStatus: true,
          totalHours: true
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
      }
    },
    orderBy: { issuedAt: "desc" }
  });
  return invoices.map((invoice) => ({
    id: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    status: invoice.status,
    amountCents: invoice.amountCents,
    commissionAmountCents: invoice.commissionAmountCents,
    tutorAmountCents: invoice.tutorAmountCents,
    currency: invoice.currency,
    issuedAt: invoice.issuedAt,
    booking: invoice.booking,
    tutor: {
      id: invoice.tutor.id,
      name: invoice.tutor.user.name,
      email: invoice.tutor.user.email
    },
    downloadUrl: `/api/v1/invoices/booking/${invoice.bookingId}/pdf`
  }));
};
var generateInvoicePdfForStudent = async (studentId, bookingId) => {
  const invoice = await prisma.invoice.findFirst({
    where: {
      bookingId,
      studentId
    },
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
      },
      booking: {
        include: {
          slot: {
            select: {
              startTime: true,
              endTime: true
            }
          }
        }
      }
    }
  });
  if (!invoice) {
    throw new Error("Invoice not found");
  }
  const doc = new PDFDocument({
    size: "A4",
    margin: 50
  });
  doc.fontSize(22).fillColor("#111827").text("Mentora Invoice", { align: "left" });
  doc.moveDown(0.3);
  doc.fontSize(11).fillColor("#4b5563").text(`Invoice #: ${invoice.invoiceNumber}`);
  doc.text(`Issued: ${invoice.issuedAt.toISOString().slice(0, 10)}`);
  doc.text(`Booking ID: ${invoice.booking.id}`);
  doc.moveDown(1);
  doc.fontSize(14).fillColor("#111827").text("Billed To");
  doc.fontSize(11).fillColor("#374151").text(invoice.student.name);
  doc.text(invoice.student.email);
  doc.moveDown(0.8);
  doc.fontSize(14).fillColor("#111827").text("Tutor");
  doc.fontSize(11).fillColor("#374151").text(invoice.tutor.user.name);
  doc.text(invoice.tutor.user.email);
  doc.moveDown(1);
  doc.fontSize(14).fillColor("#111827").text("Session Summary");
  doc.fontSize(11).fillColor("#374151").text(`Session Date: ${invoice.booking.date.toISOString()}`);
  doc.text(`Start: ${invoice.booking.slot.startTime.toISOString()}`);
  doc.text(`End: ${invoice.booking.slot.endTime.toISOString()}`);
  doc.text(`Duration: ${invoice.booking.totalHours} hours`);
  doc.text(`Booking Status: ${invoice.booking.status}`);
  doc.text(`Payment Status: ${invoice.booking.paymentStatus}`);
  doc.moveDown(1);
  doc.fontSize(14).fillColor("#111827").text("Amount Breakdown");
  doc.fontSize(11).fillColor("#374151").text(`Total Paid: ${formatMoney(invoice.amountCents, invoice.currency)}`);
  doc.text(
    `Platform Commission (10%): ${formatMoney(invoice.commissionAmountCents, invoice.currency)}`
  );
  doc.text(
    `Tutor Earnings: ${formatMoney(invoice.tutorAmountCents, invoice.currency)}`
  );
  doc.moveDown(1);
  doc.fontSize(10).fillColor("#6b7280").text(
    "This is a system-generated invoice for your tutoring session on Mentora."
  );
  const buffer = await toPdfBuffer(doc);
  await prisma.invoice.update({
    where: { id: invoice.id },
    data: { pdfGeneratedAt: /* @__PURE__ */ new Date() }
  });
  return {
    fileName: `${invoice.invoiceNumber}.pdf`,
    buffer
  };
};
var invoiceService = {
  listMyInvoices,
  generateInvoicePdfForStudent
};

// src/modules/invoice/invoice.controller.ts
var listMyInvoices2 = async (req, res) => {
  try {
    const studentId = req.user?.id;
    if (!studentId) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const invoices = await invoiceService.listMyInvoices(studentId);
    return res.status(200).json(invoices);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};
var downloadInvoicePdf = async (req, res) => {
  try {
    const studentId = req.user?.id;
    const bookingId = req.params.bookingId;
    if (!studentId) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const pdf = await invoiceService.generateInvoicePdfForStudent(
      studentId,
      bookingId
    );
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${pdf.fileName}"`
    );
    return res.status(200).send(pdf.buffer);
  } catch (error) {
    return res.status(404).json({ error: error.message });
  }
};
var invoiceController = {
  listMyInvoices: listMyInvoices2,
  downloadInvoicePdf
};

// src/modules/invoice/invoice.router.ts
var invoiceRouter = Router6();
invoiceRouter.get(
  "/my",
  auth_default("STUDENT" /* student */),
  invoiceController.listMyInvoices
);
invoiceRouter.get(
  "/booking/:bookingId/pdf",
  auth_default("STUDENT" /* student */),
  invoiceController.downloadInvoicePdf
);

// src/modules/notification/notification.router.ts
import { Router as Router7 } from "express";

// src/modules/notification/notification.controller.ts
var registerDeviceToken = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { token, platform } = req.body;
    if (!token) {
      return res.status(400).json({ error: "Device token is required" });
    }
    if (!platform) {
      return res.status(400).json({ error: "Platform is required (web/ios/android)" });
    }
    const existingToken = await prisma.deviceToken.findUnique({
      where: { token }
    });
    if (existingToken && existingToken.userId === userId) {
      const updated = await prisma.deviceToken.update({
        where: { token },
        data: { expiresAt: null }
      });
      return res.status(200).json({
        message: "Device token already registered",
        data: updated
      });
    }
    if (existingToken && existingToken.userId !== userId) {
      await prisma.deviceToken.delete({
        where: { token }
      });
    }
    const deviceToken = await prisma.deviceToken.create({
      data: {
        token,
        userId,
        platform: platform || "web"
      }
    });
    res.status(201).json({
      message: "Device token registered successfully",
      data: deviceToken
    });
  } catch (error) {
    console.error("Error registering device token:", error);
    res.status(500).json({
      error: error.message || "Failed to register device token"
    });
  }
};
var unregisterDeviceToken = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ error: "Device token is required" });
    }
    const deviceToken = await prisma.deviceToken.findUnique({
      where: { token }
    });
    if (!deviceToken || deviceToken.userId !== userId) {
      return res.status(404).json({
        error: "Device token not found or does not belong to this user"
      });
    }
    await prisma.deviceToken.delete({
      where: { token }
    });
    res.status(200).json({
      message: "Device token unregistered successfully"
    });
  } catch (error) {
    console.error("Error unregistering device token:", error);
    res.status(500).json({
      error: error.message || "Failed to unregister device token"
    });
  }
};
var getUserDeviceTokens = async (req, res) => {
  try {
    const userId = req.user?.id;
    const tokens = await prisma.deviceToken.findMany({
      where: { userId },
      select: {
        id: true,
        platform: true,
        createdAt: true,
        expiresAt: true
      }
    });
    res.status(200).json({
      data: tokens,
      count: tokens.length
    });
  } catch (error) {
    console.error("Error fetching device tokens:", error);
    res.status(500).json({
      error: error.message || "Failed to fetch device tokens"
    });
  }
};
var sendTestNotification = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { title, body } = req.body;
    if (!title || !body) {
      return res.status(400).json({
        error: "Title and body are required"
      });
    }
    const { sendGenericNotification } = await import("./notification.service-MHUKL7FA.js");
    const result = await sendGenericNotification(userId, title, body);
    if (result.success) {
      res.status(200).json({
        message: "Test notification sent successfully",
        data: result
      });
    } else {
      res.status(400).json({
        error: result.message
      });
    }
  } catch (error) {
    console.error("Error sending test notification:", error);
    res.status(500).json({
      error: error.message || "Failed to send test notification"
    });
  }
};
var notificationController = {
  registerDeviceToken,
  unregisterDeviceToken,
  getUserDeviceTokens,
  sendTestNotification
};

// src/modules/notification/notification.router.ts
var notificationRouter = Router7();
notificationRouter.post(
  "/device-tokens",
  auth_default("STUDENT" /* student */, "TUTOR" /* tutor */, "ADMIN" /* admin */),
  notificationController.registerDeviceToken
);
notificationRouter.post(
  "/device-tokens/unregister",
  auth_default("STUDENT" /* student */, "TUTOR" /* tutor */, "ADMIN" /* admin */),
  notificationController.unregisterDeviceToken
);
notificationRouter.get(
  "/device-tokens",
  auth_default("STUDENT" /* student */, "TUTOR" /* tutor */, "ADMIN" /* admin */),
  notificationController.getUserDeviceTokens
);
notificationRouter.post(
  "/test",
  auth_default("STUDENT" /* student */, "TUTOR" /* tutor */, "ADMIN" /* admin */),
  notificationController.sendTestNotification
);

// src/modules/profile/profile.router.ts
import { Router as Router8 } from "express";

// src/modules/profile/profile.service.ts
var profileService = {
  /**
   * Get profile information based on user role.
   * - STUDENT: returns basic user info + bookings & reviews.
   * - TUTOR: returns full tutor profile with categories and availability.
   * - ADMIN: returns user info (admin has no separate profile).
   */
  async getProfile(userId) {
    const role = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true }
    });
    switch (role?.role) {
      case "STUDENT":
        return this.getStudentProfile(userId);
      case "TUTOR":
        return this.getTutorProfile(userId);
      case "ADMIN":
        return this.getAdminProfile(userId);
      default:
        throw new Error("Invalid user role");
    }
  },
  /**
   * Update profile based on role. Allowed fields are restricted.
   * - STUDENT: can update name, email, image, etc.
   * - TUTOR: can update bio, headline, pricePerHr, experience, categories.
   * - ADMIN: can update name, email, image, role? (maybe limited)
   */
  async updateProfile(userId, data) {
    const role = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true }
    });
    switch (role?.role) {
      case "STUDENT":
        return this.updateStudentProfile(userId, data);
      case "TUTOR":
        return this.updateTutorProfile(userId, data);
      case "ADMIN":
        return this.updateAdminProfile(userId, data);
      default:
        throw new Error("Invalid user role");
    }
  },
  /**
   * Tutor-specific: update availability slots (create, update, delete).
   * Accepts an array of slots. If slot has an id, it updates; otherwise creates.
   * Slots not in the array (but belonging to tutor) can be deleted if desired.
   */
  async updateAvailability(userId, slots) {
    const tutorId = await prisma.tutorProfile.findUnique({
      where: { userId },
      select: { id: true }
    }).then((t) => t?.id);
    if (!tutorId) {
      throw new Error("Tutor profile not found");
    }
    return await prisma.$transaction(async (tx) => {
      const existingSlots = await tx.availabilitySlot.findMany({
        where: { tutorId },
        select: { id: true }
      });
      const existingIds = existingSlots.map((s) => s.id);
      const incomingIds = slots.filter((s) => s.id).map((s) => s.id);
      const idsToDelete = existingIds.filter((id) => !incomingIds.includes(id));
      if (idsToDelete.length > 0) {
        const booked = await tx.availabilitySlot.findMany({
          where: { id: { in: idsToDelete }, isBooked: true }
        });
        if (booked.length > 0) {
          throw new Error("Cannot delete booked slots");
        }
        await tx.availabilitySlot.deleteMany({
          where: { id: { in: idsToDelete } }
        });
      }
      const results = [];
      for (const slot of slots) {
        if (slot.id) {
          const existing = await tx.availabilitySlot.findUnique({
            where: { id: slot.id }
          });
          if (!existing) throw new Error(`Slot ${slot.id} not found`);
          if (existing.isBooked) {
            throw new Error(`Cannot update booked slot ${slot.id}`);
          }
          const updated = await tx.availabilitySlot.update({
            where: { id: slot.id },
            data: {
              startTime: slot.startTime,
              endTime: slot.endTime
              // isBooked remains as is (should be false)
            }
          });
          results.push(updated);
        } else {
          const created = await tx.availabilitySlot.create({
            data: {
              tutorId,
              startTime: slot.startTime,
              endTime: slot.endTime,
              isBooked: slot.isBooked ?? false
            }
          });
          results.push(created);
        }
      }
      return results;
    });
  },
  async getStudentProfile(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        createdAt: true,
        bookings: {
          include: {
            tutor: {
              include: {
                user: { select: { name: true, email: true, image: true } }
              }
            },
            slot: true
          },
          orderBy: { date: "desc" },
          take: 10
        },
        reviews: {
          include: {
            tutor: {
              include: {
                user: { select: { name: true } }
              }
            }
          },
          orderBy: { createdAt: "desc" },
          take: 5
        }
      }
    });
    if (!user) throw new Error("User not found");
    return user;
  },
  async getTutorProfile(userId) {
    const tutorProfile = await prisma.tutorProfile.findUnique({
      where: { userId },
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
        availability: {
          where: { startTime: { gt: /* @__PURE__ */ new Date() } },
          orderBy: { startTime: "asc" }
        },
        _count: {
          select: {
            reviews: true,
            bookings: { where: { status: "COMPLETED" } }
          }
        }
      }
    });
    if (!tutorProfile) throw new Error("Tutor profile not found");
    return {
      id: tutorProfile.id,
      userId: tutorProfile.userId,
      name: tutorProfile.user.name,
      email: tutorProfile.user.email,
      image: tutorProfile.user.image,
      bio: tutorProfile.bio,
      headline: tutorProfile.headline,
      // if you have it
      pricePerHr: tutorProfile.pricePerHr,
      rating: tutorProfile.rating,
      experience: tutorProfile.experience,
      isVerified: tutorProfile.isVerified,
      categories: tutorProfile.categories.map((c) => ({
        id: c.category.id,
        name: c.category.name
      })),
      availability: tutorProfile.availability.map((a) => ({
        id: a.id,
        startTime: a.startTime,
        endTime: a.endTime,
        isBooked: a.isBooked
      })),
      totalReviews: tutorProfile._count.reviews,
      completedSessions: tutorProfile._count.bookings
    };
  },
  async getAdminProfile(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        createdAt: true
      }
    });
    if (!user) throw new Error("User not found");
    return user;
  },
  async updateStudentProfile(userId, data) {
    const allowedFields = ["name", "email", "image"];
    const updateData = {};
    for (const field of allowedFields) {
      if (data[field] !== void 0) {
        updateData[field] = data[field];
      }
    }
    return prisma.user.update({
      where: { id: userId },
      data: updateData
    });
  },
  async updateTutorProfile(userId, data) {
    const tutorProfile = await prisma.tutorProfile.findUnique({
      where: { userId },
      select: { id: true }
    });
    if (!tutorProfile) throw new Error("Tutor profile not found");
    const allowedProfileFields = [
      "bio",
      "headline",
      "pricePerHr",
      "experience"
    ];
    const profileUpdate = {};
    for (const field of allowedProfileFields) {
      if (data[field] !== void 0) {
        profileUpdate[field] = data[field];
      }
    }
    const { categoryIds } = data;
    return await prisma.$transaction(async (tx) => {
      const updatedProfile = await tx.tutorProfile.update({
        where: { id: tutorProfile.id },
        data: profileUpdate
      });
      if (categoryIds !== void 0) {
        await tx.tutorCategory.deleteMany({
          where: { tutorId: tutorProfile.id }
        });
        if (categoryIds.length > 0) {
          await tx.tutorCategory.createMany({
            data: categoryIds.map((catId) => ({
              tutorId: tutorProfile.id,
              categoryId: catId
            })),
            skipDuplicates: true
          });
        }
      }
      return tx.tutorProfile.findUnique({
        where: { id: tutorProfile.id },
        include: {
          categories: { include: { category: true } },
          user: { select: { name: true, email: true, image: true } }
        }
      });
    });
  },
  async updateAdminProfile(userId, data) {
    const allowedFields = ["name", "email", "image"];
    const updateData = {};
    for (const field of allowedFields) {
      if (data[field] !== void 0) {
        updateData[field] = data[field];
      }
    }
    return prisma.user.update({
      where: { id: userId },
      data: updateData
    });
  }
};

// src/modules/profile/profile.controller.ts
var getProfile = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const profile = await profileService.getProfile(userId);
    res.json(profile);
  } catch (error) {
    console.error("Get profile error:", error);
    if (error.message === "User not found" || error.message === "Tutor profile not found") {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: "Internal server error" });
  }
};
var updateProfile = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const updated = await profileService.updateProfile(
      userId,
      req.body
    );
    res.json(updated);
  } catch (error) {
    console.error("Update profile error:", error);
    if (error.message === "User not found" || error.message === "Tutor profile not found") {
      return res.status(404).json({ error: error.message });
    }
    res.status(400).json({ error: error.message });
  }
};
var updateAvailability = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const userRole = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true }
    }).then((u) => u?.role);
    if (!userRole) {
      return res.status(404).json({ error: "User not found" });
    }
    if (userRole !== "TUTOR") {
      return res.status(403).json({ error: "Only tutors can update availability" });
    }
    const { slots } = req.body;
    if (!slots || !Array.isArray(slots)) {
      return res.status(400).json({ error: "Slots array is required" });
    }
    const parsedSlots = slots.map((slot) => ({
      id: slot.id,
      startTime: new Date(slot.startTime),
      endTime: new Date(slot.endTime),
      isBooked: slot.isBooked ?? false
    }));
    const result = await profileService.updateAvailability(userId, parsedSlots);
    res.json(result);
  } catch (error) {
    console.error("Update availability error:", error);
    if (error.message.includes("Cannot delete booked slots") || error.message.includes("Cannot update booked slot")) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: "Internal server error" });
  }
};

// src/modules/profile/profile.router.ts
var profileRouter = Router8();
profileRouter.get(
  "/",
  auth_default("ADMIN" /* admin */, "TUTOR" /* tutor */, "STUDENT" /* student */),
  getProfile
);
profileRouter.patch(
  "/",
  auth_default("ADMIN" /* admin */, "TUTOR" /* tutor */, "STUDENT" /* student */),
  updateProfile
);
profileRouter.patch("/availability", auth_default("TUTOR" /* tutor */), updateAvailability);

// src/modules/review/review.router.ts
import { Router as Router9 } from "express";

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
var reviewRouter = Router9();
reviewRouter.post("/", auth_default("STUDENT" /* student */), reviewController.createReview);

// src/modules/smartMatch/smartMatch.router.ts
import express2 from "express";

// src/modules/smartMatch/smartMatch.service.ts
var getAllTutorsForMatching = async () => {
  const tutors = await prisma.tutorProfile.findMany({
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          banned: true,
          status: true
        }
      },
      categories: {
        include: {
          category: true
        }
      },
      reviews: {
        take: 5,
        // Get last 5 reviews for context
        orderBy: { createdAt: "desc" },
        include: {
          student: {
            select: {
              name: true
            }
          }
        }
      }
    },
    where: {
      user: {
        banned: false,
        status: "ACTIVE"
      }
    }
  });
  return tutors.filter((tutor) => tutor.categories.length > 0);
};
var callGroqAPI = async (studentGoal, tutorsData) => {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("GROQ_API_KEY environment variable not set");
  }
  const formatTutorForResponse2 = (tutor) => ({
    id: tutor.id,
    userId: tutor.userId,
    bio: tutor.bio,
    pricePerHr: tutor.pricePerHr,
    rating: tutor.rating,
    experience: tutor.experience,
    isVerified: tutor.isVerified,
    isFeatured: tutor.isFeatured,
    user: tutor.user,
    categories: tutor.categories.map((tc) => tc.category),
    reviews: tutor.reviews
  });
  const startTime = Date.now();
  const tutorInfos = tutorsData.map((tutor, index) => {
    const categories = tutor.categories.map((tc) => tc.category.name).join(", ");
    const avgRating = tutor.reviews.length > 0 ? (tutor.reviews.reduce((sum, r) => sum + r.rating, 0) / tutor.reviews.length).toFixed(1) : "No ratings";
    const reviewsSummary = tutor.reviews.length > 0 ? tutor.reviews.map(
      (r) => `\u2022 ${r.student.name}: ${r.rating}\u2605 - "${r.comment || "Great tutor"}"`
    ).join("\n") : "\u2022 No reviews yet";
    return `
\u3010 TUTOR #${index + 1} \u3011
\u{1F464} Name: ${tutor.user.name}
\u{1F4DD} Bio: "${tutor.bio}"
\u{1F393} Categories: ${categories}
\u23F1\uFE0F  Experience: ${tutor.experience} years
\u{1F4B0} Price: $${tutor.pricePerHr}/hour
\u2B50 Rating: ${avgRating}/5 (${tutor.reviews.length} reviews)
\u2713 Verified: ${tutor.isVerified ? "\u2705 YES" : "\u274C NO"}
\u2B50 Featured: ${tutor.isFeatured ? "\u{1F31F} YES" : "NO"}

Student Reviews:
${reviewsSummary}

---`;
  }).join("\n");
  const prompt = `You are an ELITE tutor recommendation engine with expertise in learning science and pedagogy.

STUDENT'S LEARNING OBJECTIVE:
"${studentGoal}"

YOUR TASK:
Analyze the following tutor profiles and identify the TOP 3 BEST MATCHES for this student. Prioritize:
1. Direct category/skill relevance to the goal
2. Teaching quality (ratings + review sentiment)
3. Experience depth relevant to the goal complexity
4. Student success indicators (verified badge, reviews)
5. Teaching approach fit

AVAILABLE TUTORS:
${tutorInfos}

CRITICAL REQUIREMENTS:
- Return ONLY valid JSON (no markdown, explanations, or extra text)
- matchScore must be 0-100 (confidence in match)
- reason must be compelling and specific (2-3 sentences max)
- keywords should be 2-3 learning concepts

RESPONSE FORMAT (EXACT JSON):
{
  "matches": [
    {
      "tutorId": "uuid-string-here",
      "matchScore": 90,
      "reason": "Specific reason why this tutor matches the goal perfectly",
      "keywords": ["concept1", "concept2", "concept3"],
      "matchRationale": "One sentence explaining the pedagogical fit"
    }
  ],
  "alternativeRecommendations": "Brief tip for the student on how to maximize learning"
}`;
  try {
    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            {
              role: "system",
              content: "You are an expert tutor matching AI. Respond ONLY with valid JSON."
            },
            {
              role: "user",
              content: prompt
            }
          ],
          temperature: 0.3,
          max_tokens: 1500,
          top_p: 0.9
        })
      }
    );
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      console.error("Groq API error:", error);
      throw new Error(`Groq API error: ${response.status}`);
    }
    const data = await response.json();
    const content = data.choices[0]?.message?.content || "";
    const responseTime = Date.now() - startTime;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Could not parse AI response as JSON");
    }
    const parsed = JSON.parse(jsonMatch[0]);
    parsed.responseTime = responseTime;
    return parsed;
  } catch (error) {
    console.error("Error calling Groq API:", error);
    throw error;
  }
};
var findSmartMatches = async (studentGoal) => {
  if (!studentGoal || studentGoal.trim().length < 5) {
    throw new Error("Student goal must be at least 5 characters long");
  }
  const tutors = await getAllTutorsForMatching();
  if (tutors.length === 0) {
    throw new Error("No tutors available for matching");
  }
  const aiRecommendations = await callGroqAPI(studentGoal, tutors);
  const enrichedMatches = aiRecommendations.matches.map((match) => {
    const tutorData = tutors.find((t) => t.id === match.tutorId);
    return {
      ...match,
      tutor: tutorData ? formatTutorForResponse(tutorData) : null
    };
  });
  return {
    studentGoal,
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    recommendations: enrichedMatches,
    alternativeRecommendations: aiRecommendations.alternativeRecommendations,
    totalTutorsAnalyzed: tutors.length,
    responseTime: aiRecommendations.responseTime,
    aiProvider: "groq"
  };
};
var findSimpleMatches = async (studentGoal) => {
  const tutors = await getAllTutorsForMatching();
  if (tutors.length === 0) {
    throw new Error("No tutors available for matching");
  }
  const goalKeywords = studentGoal.toLowerCase().split(/\s+/);
  const scoredTutors = tutors.map((tutor) => {
    let score = 0;
    const tutorCategories = tutor.categories.map((tc) => tc.category.name.toLowerCase()).join(" ");
    goalKeywords.forEach((keyword) => {
      if (tutorCategories.includes(keyword)) score += 30;
    });
    score += tutor.rating * 10;
    score += Math.min(tutor.experience * 2, 20);
    if (tutor.isVerified) score += 15;
    return {
      tutorId: tutor.id,
      score,
      tutor: {
        ...formatTutorForResponse(tutor)
      }
    };
  });
  const topMatches = scoredTutors.sort((a, b) => b.score - a.score).slice(0, 3).map(({ score, tutor }) => ({
    tutorId: tutor.id,
    matchScore: Math.min(score, 100),
    reason: `Category relevance: ${tutor.categories.join(", ")} | Rating: ${tutor.rating}/5 | Experience: ${tutor.experience}y`,
    tutor
  }));
  return {
    studentGoal,
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    recommendations: topMatches,
    alternativeRecommendations: "Using keyword-based matching. More detailed AI analysis may be available.",
    totalTutorsAnalyzed: tutors.length,
    method: "fallback"
  };
};
var smartMatchService = {
  findSmartMatches,
  findSimpleMatches,
  getAllTutorsForMatching,
  callGroqAPI
};

// src/modules/smartMatch/smartMatch.controller.ts
var serializeTutor = (tutor) => ({
  id: tutor.id,
  userId: tutor.userId,
  bio: tutor.bio,
  pricePerHr: tutor.pricePerHr,
  rating: tutor.rating,
  experience: tutor.experience,
  isVerified: tutor.isVerified,
  isFeatured: tutor.isFeatured,
  user: tutor.user,
  categories: tutor.categories.map((tc) => tc.category),
  reviews: tutor.reviews
});
var findMatches = async (req, res) => {
  try {
    const { goal } = req.body;
    if (!goal) {
      res.status(400).json({
        success: false,
        message: "Learning goal is required",
        code: "MISSING_GOAL"
      });
      return;
    }
    try {
      const matches = await smartMatchService.findSmartMatches(goal);
      res.status(200).json({
        success: true,
        data: matches,
        metadata: {
          aiProvider: "groq",
          responseTimeMs: matches.responseTime,
          cached: false
        }
      });
    } catch (aiError) {
      console.warn("Groq AI matching failed, using fallback:", aiError.message);
      const matches = await smartMatchService.findSimpleMatches(goal);
      res.status(200).json({
        success: true,
        data: matches,
        metadata: {
          aiProvider: "fallback",
          fallbackReason: aiError.message
        },
        warning: "Using keyword-based matching. AI analysis temporarily unavailable."
      });
    }
  } catch (error) {
    console.error("Error in findMatches:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to find tutor matches",
      code: "MATCHING_ERROR"
    });
  }
};
var getDetailedMatches = async (req, res) => {
  try {
    const { goal, limit = 5 } = req.body;
    if (!goal) {
      res.status(400).json({
        success: false,
        message: "Learning goal is required"
      });
      return;
    }
    const tutors = await smartMatchService.getAllTutorsForMatching();
    if (tutors.length === 0) {
      res.status(400).json({
        success: false,
        message: "No tutors available"
      });
      return;
    }
    const categorizedTutors = {};
    tutors.forEach((tutor) => {
      tutor.categories.forEach((tc) => {
        const categoryName = tc.category.name;
        if (!categorizedTutors[categoryName]) {
          categorizedTutors[categoryName] = [];
        }
        categorizedTutors[categoryName].push(tutor);
      });
    });
    const detailedRecommendations = Object.entries(categorizedTutors).map(
      ([category, categoryTutors]) => {
        const topInCategory = categoryTutors.sort((a, b) => b.rating - a.rating).slice(0, Math.min(3, limit)).map((tutor) => serializeTutor(tutor));
        return {
          category,
          topTutors: topInCategory
        };
      }
    );
    res.status(200).json({
      success: true,
      data: {
        goal,
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        byCategory: detailedRecommendations,
        totalTutors: tutors.length,
        categoriesCount: Object.keys(categorizedTutors).length
      },
      metadata: {
        responseType: "category-based",
        analysisTier: "premium"
      }
    });
  } catch (error) {
    console.error("Error in getDetailedMatches:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to get detailed matches"
    });
  }
};
var smartMatchController = {
  findMatches,
  getDetailedMatches
};

// src/modules/smartMatch/smartMatch.router.ts
var smartMatchRouter = express2.Router();
smartMatchRouter.post("/", smartMatchController.findMatches);
smartMatchRouter.post("/detailed", smartMatchController.getDetailedMatches);

// src/modules/tutorCategories/categories.route.ts
import { Router as Router10 } from "express";

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
var categoriesRoute = Router10();
categoriesRoute.post("/", categoriesController.createCategory);
categoriesRoute.post(
  "/tutor/:tutorId",
  auth_default("TUTOR" /* tutor */),
  categoriesController.addTutorCategories
);

// src/modules/tutorProfile/tutorProfile.router.ts
import { Router as Router11 } from "express";

// src/modules/tutorProfile/tutorProfile.service.ts
var createTutorProfile = async (data, userId) => {
  return await prisma.$transaction(async (tx) => {
    const tutorProfile = await tx.tutorProfile.create({
      data: {
        bio: data.bio,
        pricePerHr: data.pricePerHr,
        experience: data.experience,
        userId,
        stripeConnectedAccountId: data.stripeConnectedAccountId ?? null
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
var tutorProfileRouter = Router11();
tutorProfileRouter.post(
  "/",
  auth_default("TUTOR" /* tutor */),
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
  auth_default("TUTOR" /* tutor */),
  tutorProfileController.updateTutorProfileById
);
tutorProfileRouter.delete(
  "/:id",
  auth_default("TUTOR" /* tutor */, "ADMIN" /* admin */),
  tutorProfileController.deleteTutorProfileById
);

// src/app.ts
var allowedOrigins = [
  "https://skill-bridge-4216.vercel.app",
  "http://localhost:3000",
  "http://localhost:5000"
];
var app = express3();
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true
  })
);
app.use(express3.json());
app.use(cookieParser());
app.use("/uploads", express3.static(path2.join(process.cwd(), "uploads")));
app.get("/", (_req, res) => {
  res.send("skillBridge project started!");
});
app.use("/api/v1/", AuthRouter);
app.use("/api/v1/tutor-categories", categoriesRoute);
app.use("/api/v1/categories", categoryRouter);
app.use("/api/v1/tutor-profiles", tutorProfileRouter);
app.use("/api/v1/availability-slots", slotRouter);
app.use("/api/v1/bookings", bookingRouter);
app.use("/api/v1/chats", chatRouter);
app.use("/api/v1/invoices", invoiceRouter);
app.use("/api/v1/notifications", notificationRouter);
app.use("/api/v1/reviews", reviewRouter);
app.use("/api/v1/admin", adminRouter);
app.use("/api/v1/profile", profileRouter);
app.use("/api/v1/smart-match", smartMatchRouter);
var app_default = app;

// src/index.ts
var index_default = app_default;
export {
  index_default as default
};
