import jwt, { JwtPayload } from "jsonwebtoken";
import { Server } from "socket.io";
import { Role } from "../../../generated/prisma/enums";
import { prisma } from "../../../lib/prisma";
import { secret } from "../Auth/auth.service";
import { chatService } from "./chat.service";

type SocketUser = {
  id: string;
  role: Role;
};

const parseCookieToken = (cookieHeader?: string) => {
  if (!cookieHeader) return null;

  const parts = cookieHeader.split(";").map((item) => item.trim());
  const tokenPair = parts.find((item) => item.startsWith("token="));
  if (!tokenPair) return null;

  return decodeURIComponent(tokenPair.slice("token=".length));
};

const getSocketToken = (socket: any) => {
  const authToken = socket.handshake.auth?.token as string | undefined;
  if (authToken) return authToken;

  const headerAuth = socket.handshake.headers?.authorization as
    | string
    | undefined;

  if (headerAuth?.startsWith("Bearer ")) {
    return headerAuth.split(" ")[1];
  }

  const cookieHeader = socket.handshake.headers?.cookie as string | undefined;
  return parseCookieToken(cookieHeader);
};

export const registerChatSocket = (io: Server) => {
  io.use(async (socket: any, next: (err?: Error) => void) => {
    try {
      const token = getSocketToken(socket);
      if (!token) {
        return next(new Error("Unauthorized"));
      }

      const decoded = jwt.verify(token, secret) as JwtPayload;
      const userData = await prisma.user.findUnique({
        where: { email: decoded.email },
      });

      if (!userData) {
        return next(new Error("Unauthorized"));
      }

      socket.data.user = {
        id: userData.id,
        role: userData.role,
      } as SocketUser;

      return next();
    } catch (error) {
      return next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket: any) => {
    socket.on("chat:join", async (payload: { conversationId: string }) => {
      try {
        const user = socket.data.user as SocketUser;
        await chatService.assertConversationAccess(
          payload.conversationId,
          user.id,
          user.role,
        );

        socket.join(payload.conversationId);
        socket.emit("chat:joined", { conversationId: payload.conversationId });
      } catch (error: any) {
        socket.emit("chat:error", { message: error.message });
      }
    });

    socket.on(
      "chat:typing:start",
      async (payload: { conversationId: string }) => {
        try {
          const user = socket.data.user as SocketUser;
          await chatService.assertConversationAccess(
            payload.conversationId,
            user.id,
            user.role,
          );

          socket.to(payload.conversationId).emit("chat:typing", {
            conversationId: payload.conversationId,
            userId: user.id,
            isTyping: true,
          });
        } catch (error: any) {
          socket.emit("chat:error", { message: error.message });
        }
      },
    );

    socket.on(
      "chat:typing:stop",
      async (payload: { conversationId: string }) => {
        try {
          const user = socket.data.user as SocketUser;
          await chatService.assertConversationAccess(
            payload.conversationId,
            user.id,
            user.role,
          );

          socket.to(payload.conversationId).emit("chat:typing", {
            conversationId: payload.conversationId,
            userId: user.id,
            isTyping: false,
          });
        } catch (error: any) {
          socket.emit("chat:error", { message: error.message });
        }
      },
    );

    socket.on(
      "chat:message:send",
      async (payload: {
        conversationId: string;
        text?: string;
        fileUrl?: string;
        fileName?: string;
        fileType?: string;
        fileSize?: number;
      }) => {
        try {
          const user = socket.data.user as SocketUser;

          const messageInput: {
            conversationId: string;
            senderId: string;
            role: Role;
            text?: string;
            fileUrl?: string;
            fileName?: string;
            fileType?: string;
            fileSize?: number;
          } = {
            conversationId: payload.conversationId,
            senderId: user.id,
            role: user.role,
          };

          if (typeof payload.text === "string")
            messageInput.text = payload.text;
          if (typeof payload.fileUrl === "string")
            messageInput.fileUrl = payload.fileUrl;
          if (typeof payload.fileName === "string")
            messageInput.fileName = payload.fileName;
          if (typeof payload.fileType === "string")
            messageInput.fileType = payload.fileType;
          if (typeof payload.fileSize === "number")
            messageInput.fileSize = payload.fileSize;

          const message = await chatService.createMessage(messageInput);

          io.to(payload.conversationId).emit("chat:message:new", message);
        } catch (error: any) {
          socket.emit("chat:error", { message: error.message });
        }
      },
    );

    socket.on(
      "chat:message:read",
      async (payload: { conversationId: string }) => {
        try {
          const user = socket.data.user as SocketUser;

          const result = await chatService.markConversationRead(
            payload.conversationId,
            user.id,
            user.role,
          );

          io.to(payload.conversationId).emit("chat:receipt:read", {
            ...result,
            readerId: user.id,
          });
        } catch (error: any) {
          socket.emit("chat:error", { message: error.message });
        }
      },
    );
  });
};
