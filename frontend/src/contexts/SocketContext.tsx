'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { Socket } from 'socket.io-client';
import { getSocket, disconnectSocket } from '@/lib/socket';
import { useAuth } from './AuthContext';
import { isGuestUser } from '@/lib/guestSession';

interface SocketContextType {
  socket: Socket | null;
  onlineUsers: string[];
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  onlineUsers: [],
  isConnected: false,
});

export function SocketProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  const connect = useCallback(async () => {
    if (!user || isGuestUser(user)) return;
    try {
      const s = await getSocket();
      setSocket(s);
      setIsConnected(true);

      s.on('user_online', ({ userId }: { userId: string }) => {
        setOnlineUsers((prev) => [...new Set([...prev, userId])]);
      });

      s.on('user_offline', ({ userId }: { userId: string }) => {
        setOnlineUsers((prev) => prev.filter((id) => id !== userId));
      });

      s.on('disconnect', () => setIsConnected(false));
      s.on('connect', () => setIsConnected(true));
    } catch {
      console.log('Socket connection failed');
    }
  }, [user]);

  useEffect(() => {
    connect();
    return () => {
      disconnectSocket();
      setSocket(null);
      setIsConnected(false);
    };
  }, [connect]);

  return (
    <SocketContext.Provider value={{ socket, onlineUsers, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}
