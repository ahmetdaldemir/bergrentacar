/**
 * WebSocket Server for Real-time Chat
 * Handles Socket.io connections for both admin panel and widget clients
 */

import { Server as HttpServer } from 'http';
import { Server as SocketServer, Socket } from 'socket.io';
import { ChatRoomService } from '../services/chat-room.service';
import { ChatMessageService } from '../services/chat-message.service';
import { ChatMessageSenderType, ChatMessageType } from '../entities/chat-message.entity';
import { ChatWidgetTokenService } from '../services/chat-widget-token.service';
import { logger } from '../../../utils/logger';
import jwt from 'jsonwebtoken';
import { loadEnv } from '../../../config/env';
import { isAllowedHostHeader, isAllowedSiteOrigin, isBergrentacarDomainOnline } from '../../../security/bergrentacar-site';

interface SocketAuth {
  tenantId: string;
  userId?: string;
  visitorId?: string;
  type: 'admin' | 'visitor';
  publicKey?: string; // For widget authentication
}

interface JoinRoomPayload {
  roomId: string;
}

interface SendMessagePayload {
  roomId: string;
  content: string;
  messageType?: string;
}

export class ChatSocketServer {
  private io: SocketServer;
  private config: ReturnType<typeof loadEnv>;

  constructor(httpServer: HttpServer) {
    this.config = loadEnv();
    
    logger.info('[Socket.io] Creating Socket.io server instance', {
      path: '/socket.io/',
      transports: ['polling', 'websocket'],
    });
    
    this.io = new SocketServer(httpServer, {
      cors: {
        origin: (origin, callback) => {
          try {
            if (origin && !isAllowedSiteOrigin(origin)) {
              return callback(new Error('Origin not allowed'));
            }
            return callback(null, true);
          } catch (error) {
            logger.error('[Socket.io CORS] Error in CORS callback:', error);
            return callback(new Error('Origin not allowed'));
          }
        },
        methods: ['GET', 'POST', 'OPTIONS'],
        credentials: true,
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'Sec-WebSocket-Key', 'Sec-WebSocket-Version', 'Sec-WebSocket-Extensions'],
      },
      path: '/socket.io/',
      transports: ['polling', 'websocket'], // Prioritize polling
      allowEIO3: true,
      connectTimeout: 45000,
      pingTimeout: 20000,
      pingInterval: 25000,
      // Allow upgrade from polling to websocket
      allowUpgrades: true,
      // Cookie settings for polling
      cookie: {
        name: 'io',
        httpOnly: false,
        sameSite: 'lax',
      },
    });

    this.io.use((socket, next) => {
      const forwarded = socket.handshake.headers['x-forwarded-host'];
      const originHeader = socket.handshake.headers.origin;
      const origin = Array.isArray(originHeader) ? originHeader[0] : originHeader;
      const hostOk = isBergrentacarDomainOnline() && isAllowedHostHeader(socket.handshake.headers.host);
      const forwardedOk = !forwarded || isAllowedHostHeader(forwarded);
      const originOk = !origin || isAllowedSiteOrigin(origin);
      if (!hostOk || !forwardedOk || !originOk) {
        next(new Error('This application only runs on bergrentacar.com'));
        return;
      }
      next();
    });

    // Add error handler for connection errors
    this.io.engine.on('connection_error', (err: any) => {
      logger.error('[Socket.io] Connection error:', {
        message: err.message,
        description: err.description,
        context: err.context,
        type: err.type,
        req: err.req ? {
          method: err.req.method,
          url: err.req.url,
          headers: {
            origin: err.req.headers.origin,
            authorization: err.req.headers.authorization ? 'Bearer ***' : undefined,
            'sec-websocket-key': err.req.headers['sec-websocket-key'],
            'sec-websocket-version': err.req.headers['sec-websocket-version'],
          },
        } : null,
      });
    });

    // Log handshake attempts (before middleware)
    this.io.engine.on('initial_headers', (headers, req) => {
      logger.info('[Socket.io] Initial handshake headers', {
        method: req.method,
        url: req.url,
        headers: {
          origin: req.headers.origin,
          authorization: req.headers.authorization ? 'Bearer ***' : undefined,
          'sec-websocket-key': req.headers['sec-websocket-key'],
          'sec-websocket-version': req.headers['sec-websocket-version'],
        },
      });
    });

    // Log all connection attempts (before middleware)
    this.io.engine.on('connection', (socket: any) => {
      logger.info('[Socket.io] Raw connection attempt', {
        id: socket.id,
        transport: socket.transport?.name,
        handshake: {
          headers: socket.handshake?.headers,
          auth: socket.handshake?.auth,
          query: socket.handshake?.query,
        },
      });
    });

    // Socket.io attaches its own request handler to the HTTP server
    // Express app also attaches a request handler
    // Socket.io's handler should run first for /socket.io/ paths
    // We don't need to intercept here - Socket.io handles it automatically
    // The Express middleware skip in app.ts should be sufficient

    this.setupMiddleware();
    this.setupEventHandlers();

    // Log when Socket.io is ready
    this.io.on('connection', (socket: Socket) => {
      logger.info('[Socket.io] ✅ New connection established (after middleware)', {
        socketId: socket.id,
        transport: socket.conn.transport.name,
        handshake: {
          headers: socket.handshake.headers,
          auth: socket.handshake.auth,
        },
      });
    });

    // Verify Socket.io is properly attached
    logger.info('✅ Chat WebSocket server initialized and ready', {
      path: '/socket.io/',
      transports: ['polling', 'websocket'],
      httpServerListeners: httpServer.listenerCount('request'),
    });
  }

  /**
   * Socket.io authentication middleware
   */
  private setupMiddleware(): void {
    this.io.use(async (socket: Socket, next) => {
      try {
        const auth = socket.handshake.auth as any;
        const authHeader = socket.handshake.headers.authorization;

        logger.info('[Socket.io Auth] Handshake received', {
          hasAuthObject: !!auth,
          hasAuthToken: !!auth?.token,
          hasAuthHeader: !!authHeader,
          authKeys: auth ? Object.keys(auth) : [],
          headers: Object.keys(socket.handshake.headers),
        });

        let socketAuth: SocketAuth | null = null;

        // Admin authentication (JWT token)
        // Check both Authorization header and auth.token (for compatibility)
        const token = authHeader?.startsWith('Bearer ') 
          ? authHeader.substring(7) 
          : auth?.token;

        logger.info('[Socket.io Auth] Token extraction', {
          hasToken: !!token,
          tokenLength: token?.length,
          fromHeader: !!authHeader?.startsWith('Bearer '),
          fromAuth: !!auth?.token,
        });

        if (token) {
          try {
            const decoded = jwt.verify(token, this.config.auth.jwtSecret) as any;
            socketAuth = {
              tenantId: decoded.tenantId,
              userId: decoded.userId || decoded.sub,
              type: 'admin',
            };
            logger.info('[Socket.io Auth] Admin authenticated via JWT', { 
              tenantId: socketAuth.tenantId, 
              userId: socketAuth.userId 
            });
          } catch (error) {
            logger.warn('[Socket.io Auth] Invalid JWT token', { 
              error: error instanceof Error ? error.message : String(error),
              tokenPreview: token?.substring(0, 20) + '...',
            });
            // Don't return error yet, try widget authentication
          }
        }

        // Widget authentication (public key) - only if admin auth failed
        if (!socketAuth && auth?.tenantId && auth?.publicKey) {
          const token = await ChatWidgetTokenService.validateToken(auth.tenantId, auth.publicKey);
          if (!token) {
            logger.warn('Invalid widget token in WebSocket connection', {
              tenantId: auth.tenantId,
              publicKey: auth.publicKey,
            });
            return next(new Error('Widget authentication failed'));
          }
          socketAuth = {
            tenantId: auth.tenantId,
            visitorId: auth.visitorId,
            type: 'visitor',
            publicKey: auth.publicKey,
          };
          logger.info('Widget visitor authenticated', { 
            tenantId: socketAuth.tenantId, 
            visitorId: socketAuth.visitorId 
          });
        }

        if (!socketAuth) {
          logger.warn('WebSocket connection rejected: No valid authentication', {
            hasAuthHeader: !!authHeader,
            hasAuthToken: !!auth?.token,
            hasWidgetAuth: !!(auth?.tenantId && auth?.publicKey),
          });
          return next(new Error('Authentication required'));
        }

        socket.data.auth = socketAuth;
        next();
      } catch (error) {
        logger.error('WebSocket authentication error', error);
        next(new Error('Authentication failed'));
      }
    });
  }

  /**
   * Setup socket event handlers
   */
  private setupEventHandlers(): void {
    this.io.on('connection', (socket: Socket) => {
      const auth = socket.data.auth as SocketAuth;
      logger.info(`Chat WebSocket client connected`, {
        type: auth.type,
        tenantId: auth.tenantId,
        socketId: socket.id,
      });

      // Join tenant room for admin (receives all tenant notifications)
      if (auth.type === 'admin') {
        socket.join(`tenant:${auth.tenantId}`);
      }

      // Join room
      socket.on('join_room', async (payload: JoinRoomPayload) => {
        try {
          const { roomId } = payload;
          
          // Verify room belongs to tenant
          const room = await ChatRoomService.getById(roomId, auth.tenantId);
          if (!room) {
            socket.emit('error', { message: 'Room not found' });
            return;
          }

          socket.join(`room:${roomId}`);

          // Add admin participant if admin
          if (auth.type === 'admin' && auth.userId) {
            await ChatRoomService.addAdminParticipant(roomId, auth.userId);
            socket.emit('joined_room', { roomId });
            logger.info(`Admin joined room ${roomId}`, { userId: auth.userId });
          }

          // Load messages and send to client
          const messages = await ChatMessageService.getByRoomId(roomId, auth.tenantId, { limit: 100 });
          socket.emit('room_messages', { roomId, messages });
        } catch (error) {
          logger.error('Error joining room', error);
          socket.emit('error', { message: 'Failed to join room' });
        }
      });

      // Send message
      socket.on('send_message', async (payload: SendMessagePayload) => {
        try {
          const { roomId, content, messageType } = payload;

          // Verify room belongs to tenant
          const room = await ChatRoomService.getById(roomId, auth.tenantId);
          if (!room) {
            socket.emit('error', { message: 'Room not found' });
            return;
          }

          const senderType = auth.type === 'admin' ? ChatMessageSenderType.ADMIN : ChatMessageSenderType.VISITOR;

          const message = await ChatMessageService.create({
            roomId,
            senderType,
            adminUserId: auth.userId,
            content,
            messageType: messageType ? (messageType as ChatMessageType) : undefined,
          });

          // Broadcast message to all clients in the room
          this.io.to(`room:${roomId}`).emit('new_message', {
            roomId,
            message,
          });

          // Notify tenant admins if message is from visitor
          if (auth.type === 'visitor') {
            this.io.to(`tenant:${auth.tenantId}`).emit('room_new_message', {
              roomId,
              message,
            });
          }

          logger.info(`Message sent in room ${roomId}`, {
            senderType: auth.type,
            messageId: message.id,
          });
        } catch (error) {
          logger.error('Error sending message', error);
          socket.emit('error', { message: 'Failed to send message' });
        }
      });

      // Mark as read
      socket.on('mark_read', async (payload: { roomId: string }) => {
        try {
          if (auth.type === 'admin') {
            await ChatMessageService.markAllAsRead(payload.roomId, auth.tenantId);
            socket.emit('marked_read', { roomId: payload.roomId });
          }
        } catch (error) {
          logger.error('Error marking as read', error);
        }
      });

      // Typing indicator
      socket.on('typing', (payload: { roomId: string; isTyping: boolean }) => {
        socket.to(`room:${payload.roomId}`).emit('user_typing', {
          roomId: payload.roomId,
          userId: auth.userId || auth.visitorId,
          type: auth.type,
          isTyping: payload.isTyping,
        });
      });

      // Disconnect
      socket.on('disconnect', () => {
        logger.info(`Chat WebSocket client disconnected`, {
          type: auth.type,
          tenantId: auth.tenantId,
          socketId: socket.id,
        });
      });
    });
  }

  /**
   * Get Socket.io instance (for external use)
   */
  getIO(): SocketServer {
    return this.io;
  }
}

