import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { WS_URL } from '../config';
import { useAuth } from './AuthContext';

interface SocketContextType {
    socket: Socket | null;
    isConnected: boolean;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export function SocketProvider({ children }: { children: ReactNode }) {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);

    const { user } = useAuth(); // Import useAuth to track login state

    useEffect(() => {
        // Obter token do localStorage para autenticação
        const token = localStorage.getItem('token');

        if (!token || !user) {
            if (socket) {
                socket.disconnect();
                setSocket(null);
                setIsConnected(false);
            }
            return;
        }

        // Se já existe socket conectado com o mesmo token, não reconectar (opcional, mas bom para evitar reconexões desnecessárias)
        // Mas como o socket object muda, o cleanup trata disso.

        console.log('🔌 Connecting to WebSocket at:', WS_URL);

        const newSocket = io(WS_URL, {
            auth: { token }, // Passa token para autenticação
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            reconnectionAttempts: 5,
            timeout: 10000
        });

        setSocket(newSocket);

        newSocket.on('connect', () => {
            console.log('✅ WebSocket connected');
            setIsConnected(true);
        });

        // Confirmação de conexão do servidor
        newSocket.on('connected', (data) => {
            console.log('✅ Server confirmed connection:', data);
        });

        newSocket.on('disconnect', (reason) => {
            console.log('❌ WebSocket disconnected:', reason);
            setIsConnected(false);

            if (reason === 'io server disconnect') {
                // Token pode ter expirado ou inválido
                newSocket.connect();
            }
        });

        // ... (outros event listeners mantidos)

        newSocket.on('reconnect', (attemptNumber) => {
            console.log('🔄 Reconnected after', attemptNumber, 'attempts');
        });

        newSocket.on('reconnect_attempt', (attemptNumber) => {
            console.log('🔄 Reconnection attempt', attemptNumber);
        });

        newSocket.on('reconnect_error', (error) => {
            console.error('❌ Reconnection error:', error);
        });

        newSocket.on('reconnect_failed', () => {
            console.error('❌ Failed to reconnect after all attempts');
        });

        newSocket.on('error', (error) => {
            console.error('❌ Socket error:', error);
        });

        newSocket.on('connect_error', (error) => {
            console.error('❌ Connection error:', error);
            setIsConnected(false);
        });

        return () => {
            newSocket.disconnect();
            newSocket.off('connect');
            newSocket.off('disconnect');
            newSocket.off('reconnect');
            newSocket.off('reconnect_attempt');
            newSocket.off('reconnect_error');
            newSocket.off('reconnect_failed');
            newSocket.off('error');
            newSocket.off('connect_error');
        };
    }, [user]); // Re-run when user changes (login/logout)

    return (
        <SocketContext.Provider value={{ socket, isConnected }}>
            {children}
        </SocketContext.Provider>
    );
}

export const useSocket = () => {
    const context = useContext(SocketContext);
    if (!context) {
        throw new Error('useSocket must be used within a SocketProvider');
    }
    return context;
};
