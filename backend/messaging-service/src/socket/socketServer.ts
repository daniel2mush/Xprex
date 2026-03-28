import { Server as HttpServer } from "http";
import { Server as SocketIOServer, Socket } from "socket.io";
import { env } from "../env";
import logger from "../utils/logger";
import {
  appendMessage,
  getConversationMessages,
  markUserConnected,
  markConversationRead,
  markUserDisconnected,
} from "../store/messageStore";

export const createSocketServer = (httpServer: HttpServer) => {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: env.CORS_ORIGINS.split(",").map((origin) => origin.trim()),
      credentials: true,
    },
  });

  const messagingNamespace = io.of("/messages");

  messagingNamespace.use((socket, next) => {
    const userId = socket.handshake.auth.userId as string | undefined;

    if (!userId) {
      next(new Error("Unauthorized"));
      return;
    }

    socket.data.userId = userId;
    next();
  });

  messagingNamespace.on("connection", (socket: Socket) => {
    const userId = socket.data.userId as string;
    markUserConnected(userId);

    logger.info("Socket connected", { socketId: socket.id, userId });

    socket.on("message:join", async (conversationId: string) => {
      const conversation = await getConversationMessages(userId, conversationId);
      if (!conversation) return;

      await markConversationRead(userId, conversationId);
      socket.join(conversationId);
      logger.info("Socket joined conversation", {
        socketId: socket.id,
        userId,
        conversationId,
      });
    });

    socket.on(
      "message:send",
      async (
        payload: { conversationId: string; content: string },
        ack?: (response: {
          success: boolean;
          message?: string;
          data?: unknown;
        }) => void,
      ) => {
        const content = payload.content.trim();
        if (!content) {
          ack?.({ success: false, message: "Message content is required" });
          return;
        }

        const saved = await appendMessage({
          conversationId: payload.conversationId,
          senderId: userId,
          content,
        });

        if (!saved) {
          ack?.({ success: false, message: "Conversation not found" });
          return;
        }

        messagingNamespace.to(payload.conversationId).emit("message:new", {
          conversationId: payload.conversationId,
          message: saved.message,
        });

        ack?.({
          success: true,
          data: {
            conversationId: payload.conversationId,
            message: saved.message,
          },
        });
      },
    );

    socket.on("disconnect", (reason) => {
      markUserDisconnected(userId);
      logger.info("Socket disconnected", { socketId: socket.id, reason });
    });
  });

  return io;
};
