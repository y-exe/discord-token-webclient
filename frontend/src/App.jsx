import React, { useState, useEffect, useRef } from 'react';
import { Routes, Route, useNavigate, Navigate, useLocation } from 'react-router-dom';
import { io } from 'socket.io-client';
import { ThemeProvider } from 'next-themes'; 

import Login from './components/auth/Login';
import Terms from './components/legal/Terms';
import Privacy from './components/legal/Privacy';
import DiscordClient from './components/DiscordClient';
import { API_URL } from './utils/helpers';

// Cookie操作用ヘルパー
const setCookie = (name, value, days) => {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = name + '=' + encodeURIComponent(JSON.stringify(value)) + '; expires=' + expires + '; path=/';
};

const getCookie = (name) => {
  const value = document.cookie.split('; ').reduce((r, v) => {
    const parts = v.split('=');
    return parts[0] === name ? decodeURIComponent(parts[1]) : r;
  }, '');
  try { return JSON.parse(value || '[]'); } catch (e) { return []; }
};

let globalSocket = null;

const RequireAuth = ({ children }) => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        const sessionStr = sessionStorage.getItem('current-session');
        let session = sessionStr ? JSON.parse(sessionStr) : null;

        if (!session) {
            const history = getCookie('discord-client-history');
            if (history && history.length > 0) {
                session = { token: history[0].token, isBot: history[0].isBot };
            }
        }

        if (!session || !session.token) {
            navigate('/login', { replace: true });
            return;
        }

        // Socketがなければ作成 あればそのまま
        if (!globalSocket) {
            globalSocket = io(API_URL, { 
                transports: ['websocket'],
                reconnection: true 
            });

            globalSocket.on('connect', () => { 
                globalSocket.emit('login', { token: session.token, isBot: session.isBot }); 
            });

            globalSocket.on('login-success', ({ user: userData }) => { 
                setUser(userData);
                setIsReady(true);
                const currentHistory = getCookie('discord-client-history');
                const newHistory = [{ token: session.token, isBot: session.isBot, ...userData }, ...currentHistory.filter(h => h.token !== session.token)].slice(0, 5);
                setCookie('discord-client-history', newHistory, 365);
            });

            globalSocket.on('login-error', (err) => {
                sessionStorage.removeItem('current-session');
                globalSocket.disconnect();
                globalSocket = null;
                navigate('/login', { replace: true });
            });
        } else {
            // すでにSocketがあり、かつ準備中なら状態を同期
            if (globalSocket.connected) {
                globalSocket.emit('login', { token: session.token, isBot: session.isBot });
            }
        }

        return () => {
        };
    }, [navigate]);

    if (!isReady || !globalSocket) {
        return (
            <div className="h-screen w-screen bg-[#050505] text-white flex flex-col items-center justify-center gap-4 font-google font-bold">
                <div className="animate-spin h-10 w-10 border-4 border-[#5865F2] rounded-full border-t-transparent"></div>
                <p className="text-lg animate-pulse">Connecting to Discord...</p>
            </div>
        );
    }

    return React.cloneElement(children, { socket: globalSocket, user });
};

export default function App() {
  const location = useLocation();

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy" element={<Privacy />} />
        
        <Route path="/:guildId/:channelId" element={<RequireAuth><DiscordClient /></RequireAuth>} />
        <Route path="/:guildId" element={<RequireAuth><DiscordClient /></RequireAuth>} />
        
        <Route path="/" element={ (location.pathname === '/' && location.hash === '') ? <Navigate to="/login" replace /> : <Navigate to="/@me" replace /> } />
      </Routes>
    </ThemeProvider>
  );
}