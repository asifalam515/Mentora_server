import { Router } from "express";
import fs from "fs";
import multer from "multer";
import path from "path";
import auth, { UserRole } from "../../middleware/auth";
import { chatController } from "./chat.controller";

const storage = multer.diskStorage({
  destination: (_req: any, _file: any, cb: any) => {
    const uploadDir = path.join(process.cwd(), "uploads", "chat");
    fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (_req: any, file: any, cb: any) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname || "");
    cb(null, `${unique}${ext}`);
  },
});

const upload = multer({ storage, limits: { fileSize: 15 * 1024 * 1024 } });

export const chatRouter = Router();

chatRouter.get(
  "/conversations",
  auth(UserRole.student, UserRole.tutor, UserRole.admin),
  chatController.listConversations,
);
chatRouter.get(
  "/booking/:bookingId",
  auth(UserRole.student, UserRole.tutor, UserRole.admin),
  chatController.getOrCreateConversation,
);
chatRouter.get(
  "/:conversationId/messages",
  auth(UserRole.student, UserRole.tutor, UserRole.admin),
  chatController.getConversationMessages,
);
chatRouter.post(
  "/upload",
  auth(UserRole.student, UserRole.tutor),
  upload.single("file"),
  chatController.uploadChatFile,
);
chatRouter.patch(
  "/:conversationId/read",
  auth(UserRole.student, UserRole.tutor, UserRole.admin),
  chatController.markConversationRead,
);
