import { Server } from 'socket.io';
import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';

let io: Server;

export const initSocket = (httpServer: HttpServer) => {
    io = new Server(httpServer, {
        cors: {
            origin: process.env.CLIENT_URL || '*',
            methods: ['GET', 'POST'],
            credentials: true
        }
    });

    // Middleware de autenticação
    io.use((socket, next) => {
        const token = socket.handshake.auth.token;

        if (!token) {
            console.warn('⚠️ Socket connection without token');
            return next(new Error('Authentication required'));
        }

        try {
            const secret = process.env.JWT_SECRET || 'supersecretkeychangeinproduction';
            const decoded = jwt.verify(token, secret) as any;
            socket.data.userId = decoded.userId;
            socket.data.userEmail = decoded.email;
            next();
        } catch (error) {
            console.error('❌ Invalid token:', error);
            return next(new Error('Invalid token'));
        }
    });

    io.on('connection', (socket) => {
        const userId = socket.data.userId;
        const userEmail = socket.data.userEmail;

        console.log(`✅ User ${userId} (${userEmail}) connected:`, socket.id);

        // JOIN ROOM DO UTILIZADOR - CRÍTICO para receber notificações!
        socket.join(`user:${userId}`);
        console.log(`✅ User ${userId} joined room: user:${userId}`);

        // Confirmar conexão ao cliente
        socket.emit('connected', {
            userId,
            message: 'Connected to notification server'
        });

        socket.on('disconnect', () => {
            console.log(`❌ User ${userId} (${userEmail}) disconnected:`, socket.id);
        });

        socket.on('error', (error) => {
            console.error(`❌ Socket error for user ${userId}:`, error);
        });
    });

    console.log('🚀 Socket.IO server initialized with authentication');
    return io;
};

export const getIO = () => {
    if (!io) {
        throw new Error('Socket.io not initialized!');
    }
    return io;
};
