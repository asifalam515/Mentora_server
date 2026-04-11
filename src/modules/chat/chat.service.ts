import { Role } from "../../../generated/prisma/enums";
import { prisma } from "../../../lib/prisma";

type CreateMessageInput = {
  conversationId: string;
  senderId: string;
  role: Role;
  text?: string;
  fileUrl?: string;
  fileName?: string;
  fileType?: string;
  fileSize?: number;
};

const getTutorProfileIdByUserId = async (userId: string) => {
  const tutor = await prisma.tutorProfile.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (!tutor) {
    throw new Error("Tutor profile not found");
  }

  return tutor.id;
};

const assertBookingAccess = async (
  bookingId: string,
  userId: string,
  role: Role,
) => {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      tutor: {
        select: {
          id: true,
          userId: true,
        },
      },
    },
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

const assertConversationAccess = async (
  conversationId: string,
  userId: string,
  role: Role,
) => {
  const conversation = await prisma.chatConversation.findUnique({
    where: { id: conversationId },
    include: {
      tutor: {
        select: {
          id: true,
          userId: true,
        },
      },
    },
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

const listConversations = async (userId: string, role: Role) => {
  let where: Record<string, unknown> = {};

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
          paymentStatus: true,
        },
      },
      student: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      tutor: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: {
          sender: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  const unreadCounts = await Promise.all(
    conversations.map((conversation) =>
      prisma.chatMessage.count({
        where: {
          conversationId: conversation.id,
          senderId: { not: userId },
          readAt: null,
        },
      }),
    ),
  );

  return conversations.map((conversation, index) => ({
    id: conversation.id,
    booking: conversation.booking,
    student: conversation.student,
    tutor: {
      id: conversation.tutor.id,
      name: conversation.tutor.user.name,
      email: conversation.tutor.user.email,
    },
    lastMessage: conversation.messages[0] ?? null,
    unreadCount: unreadCounts[index],
    updatedAt: conversation.updatedAt,
  }));
};

const getOrCreateConversationByBooking = async (
  bookingId: string,
  userId: string,
  role: Role,
) => {
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
              name: true,
            },
          },
        },
      },
      student: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      tutor: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
    },
  });

  if (existing) {
    return existing;
  }

  return prisma.chatConversation.create({
    data: {
      bookingId: booking.id,
      studentId: booking.studentId,
      tutorId: booking.tutorId,
    },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      student: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      tutor: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
    },
  });
};

const getConversationMessages = async (
  conversationId: string,
  userId: string,
  role: Role,
) => {
  await assertConversationAccess(conversationId, userId, role);

  return prisma.chatMessage.findMany({
    where: { conversationId },
    include: {
      sender: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });
};

const createMessage = async (payload: CreateMessageInput) => {
  const {
    conversationId,
    senderId,
    role,
    text,
    fileUrl,
    fileName,
    fileType,
    fileSize,
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
        fileSize: fileSize ?? null,
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    await tx.chatConversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    return created;
  });

  return message;
};

const markConversationRead = async (
  conversationId: string,
  userId: string,
  role: Role,
) => {
  await assertConversationAccess(conversationId, userId, role);

  const unread = await prisma.chatMessage.findMany({
    where: {
      conversationId,
      senderId: { not: userId },
      readAt: null,
    },
    select: { id: true },
  });

  if (unread.length === 0) {
    return {
      conversationId,
      messageIds: [] as string[],
      readAt: new Date().toISOString(),
    };
  }

  const readAt = new Date();

  await prisma.chatMessage.updateMany({
    where: {
      id: { in: unread.map((m) => m.id) },
    },
    data: { readAt },
  });

  return {
    conversationId,
    messageIds: unread.map((m) => m.id),
    readAt: readAt.toISOString(),
  };
};

export const chatService = {
  assertConversationAccess,
  listConversations,
  getOrCreateConversationByBooking,
  getConversationMessages,
  createMessage,
  markConversationRead,
};
