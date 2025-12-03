import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { WS_URL } from '../config';
import toast from 'react-hot-toast';

interface SocketContextType {
    socket: Socket | null;
    isConnected: boolean;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export function SocketProvider({ children }: { children: ReactNode }) {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        console.log('Connecting to WebSocket at:', WS_URL);

        const newSocket = io(WS_URL, {
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
            // Não mostrar toast no primeiro connect para evitar confusão
        });

        newSocket.on('disconnect', (reason) => {
            console.log('❌ WebSocket disconnected:', reason);
            setIsConnected(false);

            if (reason === 'io server disconnect') {
                newSocket.connect();
            }

            toast.error('Conexão perdida. A tentar reconectar...', { duration: 3000 });
        });

        newSocket.on('reconnect', (attemptNumber) => {
            console.log('🔄 Reconnected after', attemptNumber, 'attempts');
            toast.success('Reconectado com sucesso!', { duration: 2000 });
        });

        newSocket.on('reconnect_attempt', (attemptNumber) => {
            console.log('🔄 Reconnection attempt', attemptNumber);
        });

        newSocket.on('reconnect_error', (error) => {
            console.error('❌ Reconnection error:', error);
        });

        newSocket.on('reconnect_failed', () => {
            console.error('❌ Failed to reconnect after all attempts');
            toast.error('Não foi possível reconectar. Por favor, recarregue a página.', { duration: 8000 });
        });

        newSocket.on('error', (error) => {
            console.error('❌ Socket error:', error);
            toast.error('Erro de conexão', { duration: 3000 });
        });

        newSocket.on('connect_error', (error) => {
            console.error('❌ Connection error:', error);
            setIsConnected(false);
            // Não mostrar toast imediatamente - pode ser só loading inicial
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
    }, []);

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
