/**
 * Public Chat Widget Controller
 * Handles requests from widget visitors (public endpoints)
 */

import { Request, Response } from 'express';
import { ChatRoomService } from '../services/chat-room.service';
import { ChatMessageService } from '../services/chat-message.service';
import { ChatWidgetTokenService } from '../services/chat-widget-token.service';
import { asyncHandler, ValidationError, UnauthorizedError } from '../../../utils/errors';
import { logger } from '../../../utils/logger';

interface WidgetRequest extends Request {
  tenantId?: string;
}

export class ChatWidgetController {
  /**
   * POST /api/chat/widget/rooms
   * Create room for visitor (public endpoint, validated via publicKey)
   */
  static createRoom = asyncHandler(async (req: WidgetRequest, res: Response) => {
    const { tenantId, publicKey, visitorId, visitorName, visitorEmail, visitorPhone } = req.body;

    if (!tenantId || !publicKey) {
      throw new ValidationError('tenantId and publicKey are required');
    }

    // Validate widget token
    const token = await ChatWidgetTokenService.validateToken(tenantId, publicKey);
    if (!token) {
      throw new UnauthorizedError('Invalid widget token');
    }

    // Create or get existing room for visitor
    const room = await ChatRoomService.createOrGetVisitorRoom({
      tenantId,
      visitorId: visitorId || `visitor_${Date.now()}`,
      visitorName,
      visitorEmail,
      visitorPhone,
    });

    logger.info(`Widget room created/retrieved for visitor`, {
      roomId: room.id,
      tenantId,
      visitorId,
    });

    res.json({
      success: true,
      data: {
        roomId: room.id,
        visitorId: room.visitorId,
      },
    });
  });

  /**
   * GET /api/chat/widget/rooms/:id/messages
   * Get messages for a room (public endpoint, validated via publicKey)
   */
  static getMessages = asyncHandler(async (req: WidgetRequest, res: Response) => {
    const { id: roomId } = req.params;
    const { tenantId, publicKey } = req.query as { tenantId?: string; publicKey?: string };

    if (!tenantId || !publicKey) {
      throw new ValidationError('tenantId and publicKey query parameters are required');
    }

    // Validate widget token
    const token = await ChatWidgetTokenService.validateToken(tenantId, publicKey);
    if (!token) {
      throw new UnauthorizedError('Invalid widget token');
    }

    // Get messages
    const messages = await ChatMessageService.getByRoomId(roomId, tenantId);

    res.json({
      success: true,
      data: messages,
    });
  });
}

