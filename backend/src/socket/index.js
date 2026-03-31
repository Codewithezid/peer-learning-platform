const { Server } = require('socket.io');
const { supabase } = require('../config/supabase');

let io;
const onlineUsers = new Map();

const getAllowedOrigins = () => {
  const rawOrigins = [
    process.env.FRONTEND_URL,
    process.env.FRONTEND_URLS,
  ]
    .filter(Boolean)
    .flatMap((value) => String(value).split(','))
    .map((origin) => origin.trim())
    .filter(Boolean);

  const defaults = ['http://localhost:3000', 'http://127.0.0.1:3000'];
  return Array.from(new Set([...rawOrigins, ...defaults]));
};

function initSocket(httpServer) {
  const allowedOrigins = getAllowedOrigins();
  const isProduction = process.env.NODE_ENV === 'production';

  io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
          return;
        }
        if (!isProduction) {
          callback(null, true);
          return;
        }
        callback(new Error(`Socket CORS blocked for origin: ${origin}`));
      },
      credentials: true,
    },
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('Authentication required'));

      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (error || !user) return next(new Error('Invalid token'));

      socket.userId = user.id;
      next();
    } catch (err) {
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.userId;
    onlineUsers.set(userId, socket.id);
    io.emit('user_online', { userId });

    socket.on('join_conversation', ({ conversationId }) => {
      socket.join(`chat:${conversationId}`);
    });

    socket.on('leave_conversation', ({ conversationId }) => {
      socket.leave(`chat:${conversationId}`);
    });

    socket.on('send_message', async ({ conversationId, content }) => {
      try {
        const { data: message, error } = await supabase
          .from('messages')
          .insert({
            conversation_id: conversationId,
            sender_id: userId,
            content,
          })
          .select()
          .single();

        if (error) throw error;

        await supabase
          .from('conversations')
          .update({ last_message_at: new Date().toISOString() })
          .eq('id', conversationId);

        io.to(`chat:${conversationId}`).emit('new_message', message);
      } catch (err) {
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    socket.on('typing_start', ({ conversationId }) => {
      socket.to(`chat:${conversationId}`).emit('user_typing', { userId, conversationId });
    });

    socket.on('typing_stop', ({ conversationId }) => {
      socket.to(`chat:${conversationId}`).emit('user_stop_typing', { userId, conversationId });
    });

    socket.on('disconnect', () => {
      onlineUsers.delete(userId);
      io.emit('user_offline', { userId });
    });
  });

  return io;
}

function getIO() {
  return io;
}

function getOnlineUsers() {
  return Array.from(onlineUsers.keys());
}

module.exports = { initSocket, getIO, getOnlineUsers };
