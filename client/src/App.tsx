import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Layout from './components/Layout';
import TicketList from './pages/TicketList';
import NewTicket from './pages/NewTicket';
import TicketDetail from './pages/TicketDetail';
import UserList from './pages/admin/UserList';
import CategoryList from './pages/admin/CategoryList';
import Profile from './pages/Profile';
import Analytics from './pages/Analytics';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/login" />;

  return <>{children}</>;
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route path="/" element={
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      }>
        <Route index element={<Dashboard />} />
        <Route path="my-tickets" element={<TicketList filter="created" />} />
        <Route path="assigned-tickets" element={<TicketList filter="assigned" />} />
        <Route path="new-ticket" element={<NewTicket />} />
        <Route path="tickets/:id" element={<TicketDetail />} />
        <Route path="admin/users" element={<UserList />} />
        {/* Original admin/categories route replaced by the new one */}
        <Route path="admin/categories" element={<CategoryList />} />
        <Route path="profile" element={<Profile />} />
        <Route path="analytics" element={<Analytics />} />
      </Route>
    </Routes>
  );
}

import { SocketProvider } from './context/SocketContext';

// ...

import { ThemeProvider } from './context/ThemeContext';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SocketProvider>
          <ThemeProvider>
            <Toaster position="top-right" />
            <AppRoutes />
          </ThemeProvider>
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
