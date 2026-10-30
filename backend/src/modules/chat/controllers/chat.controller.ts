import { Response } from 'express';
import { AuthenticatedRequest } from '../../auth/middleware/auth.middleware';
import { ChatRoomService } from '../services/chat-room.service';
import { ChatMessageService } from '../services/chat-message.service';
import { ChatWidgetTokenService } from '../services/chat-widget-token.service';
import { ChatMessageSenderType, ChatMessageType } from '../entities/chat-message.entity';
import { asyncHandler } from '../../../utils/errors';
import { logger } from '../../../utils/logger';

export class ChatController {
  /**
   * GET /api/chat/rooms
   * List chat rooms for tenant
   */
  static listRooms = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.auth?.tenantId;
    if (!tenantId) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Tenant ID required' } });
    }

    const { status, search, limit, offset } = req.query;
    const result = await ChatRoomService.list(tenantId, {
      status: status as any,
      search: search as string,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
    });

    logger.info(`Listed chat rooms for tenant ${tenantId}`, { count: result.rooms.length });
    res.json({ success: true, data: result });
  });

  /**
   * GET /api/chat/rooms/:id
   * Get chat room with messages
   */
  static getRoom = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.auth?.tenantId;
    const { id } = req.params;

    if (!tenantId) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Tenant ID required' } });
    }

    const room = await ChatRoomService.getById(id, tenantId);
    if (!room) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Chat room not found' } });
    }

    // Get messages
    const messages = await ChatMessageService.getByRoomId(id, tenantId, { limit: 100 });

    logger.info(`Retrieved chat room ${id}`);
    res.json({ success: true, data: { ...room, messages } });
  });

  /**
   * POST /api/chat/rooms
   * Create a new chat room (usually called from widget)
   */
  static createRoom = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { tenantId, title, visitorId, visitorName, visitorEmail, visitorPhone, metadata } = req.body;

    if (!tenantId || !title) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'tenantId and title are required' },
      });
    }

    const room = await ChatRoomService.create({
      tenantId,
      title,
      visitorId,
      visitorName,
      visitorEmail,
      visitorPhone,
      metadata,
    });

    logger.info(`Created chat room ${room.id} for tenant ${tenantId}`);
    res.status(201).json({ success: true, data: room });
  });

  /**
   * POST /api/chat/rooms/:id/messages
   * Send a message
   */
  static sendMessage = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.auth?.tenantId;
    const { id: roomId } = req.params;
    const { content, messageType, fileUrl, fileName, fileSize } = req.body;

    if (!tenantId) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Tenant ID required' } });
    }

    // Verify room belongs to tenant
    const room = await ChatRoomService.getById(roomId, tenantId);
    if (!room) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Chat room not found' } });
    }

    const message = await ChatMessageService.create({
      roomId,
      senderType: ChatMessageSenderType.ADMIN,
      adminUserId: req.auth?.sub,
      messageType: messageType as ChatMessageType,
      content,
      fileUrl,
      fileName,
      fileSize,
    });

    logger.info(`Sent message in room ${roomId}`);
    res.json({ success: true, data: message });
  });

  /**
   * POST /api/chat/rooms/:id/read
   * Mark room as read
   */
  static markAsRead = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.auth?.tenantId;
    const { id: roomId } = req.params;

    if (!tenantId) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Tenant ID required' } });
    }

    await ChatMessageService.markAllAsRead(roomId, tenantId);
    logger.info(`Marked room ${roomId} as read`);
    res.json({ success: true });
  });

  /**
   * GET /api/chat/widget-token
   * Get or create widget token for tenant
   */
  static getWidgetToken = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.auth?.tenantId;

    if (!tenantId) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Tenant ID required' } });
    }

    const token = await ChatWidgetTokenService.getOrCreateForTenant(tenantId);
    logger.info(`Retrieved widget token for tenant ${tenantId}`);
    res.json({ success: true, data: { publicKey: token.publicKey, tenantId: token.tenantId } });
  });

  /**
   * POST /api/chat/widget-token/regenerate
   * Regenerate widget token
   */
  static regenerateWidgetToken = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.auth?.tenantId;

    if (!tenantId) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Tenant ID required' } });
    }

    const token = await ChatWidgetTokenService.regenerateToken(tenantId);
    logger.info(`Regenerated widget token for tenant ${tenantId}`);
    res.json({ success: true, data: { publicKey: token.publicKey, tenantId: token.tenantId } });
  });
}

