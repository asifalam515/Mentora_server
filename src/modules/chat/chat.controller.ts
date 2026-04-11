import { Request, Response } from "express";
import { Role } from "../../../generated/prisma/enums";
import { chatService } from "./chat.service";

const listConversations = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const role = req.user?.role as Role;

    if (!userId || !role) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const conversations = await chatService.listConversations(userId, role);
    return res.status(200).json(conversations);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
};

const getOrCreateConversation = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const role = req.user?.role as Role;
    const bookingId = req.params.bookingId as string;

    if (!userId || !role) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const conversation = await chatService.getOrCreateConversationByBooking(
      bookingId,
      userId,
      role,
    );

    return res.status(200).json(conversation);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
};

const getConversationMessages = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const role = req.user?.role as Role;
    const conversationId = req.params.conversationId as string;

    if (!userId || !role) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const messages = await chatService.getConversationMessages(
      conversationId,
      userId,
      role,
    );

    return res.status(200).json(messages);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
};

const uploadChatFile = async (req: Request, res: Response) => {
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
      fileSize: file.size,
    });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
};

const markConversationRead = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const role = req.user?.role as Role;
    const conversationId = req.params.conversationId as string;

    if (!userId || !role) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const result = await chatService.markConversationRead(
      conversationId,
      userId,
      role,
    );

    return res.status(200).json(result);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
};

export const chatController = {
  listConversations,
  getOrCreateConversation,
  getConversationMessages,
  uploadChatFile,
  markConversationRead,
};
