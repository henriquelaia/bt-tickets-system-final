import React from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, Ticket, LogOut, PlusCircle, Users, Settings, Menu, User as UserIcon, Activity } from 'lucide-react';
import clsx from 'clsx';
import { useTheme } from '../context/ThemeContext';
import { Sun, Moon } from 'lucide-react';
import NotificationBell from './NotificationBell';
import { API_URL } from '../config';
import { QuickSearch } from './QuickSearch';

export default function Layout() {
    const { user, logout } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const navItems = [
        { label: 'Dashboard', path: '/', icon: LayoutDashboard },
        { label: 'Os Meus Tickets', path: '/my-tickets', icon: Ticket },
        { label: 'Atribuídos a Mim', path: '/assigned-tickets', icon: Ticket },
        { label: 'Novo Ticket', path: '/new-ticket', icon: PlusCircle },
        { label: 'Perfil', path: '/profile', icon: UserIcon },
    ];

    // Admin-only menu items
    if (user?.role === 'ADMIN') {
        navItems.splice(3, 0, { label: 'Todos os Tickets', path: '/tickets', icon: Ticket });
        navItems.splice(4, 0, { label: 'Quadro Kanban', path: '/kanban', icon: LayoutDashboard });
        navItems.push({ label: 'Utilizadores', path: '/admin/users', icon: Users });
        navItems.push({ label: 'Categorias', path: '/admin/categories', icon: Settings });
        navItems.push({ label: 'Análise', path: '/analytics', icon: Activity });
    }

    const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

    return (
        <div className="flex h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
            {/* Sidebar Overlay */}
            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 z-10 md:hidden"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={clsx(
                "fixed md:static inset-y-0 left-0 z-20 w-64 bg-white dark:bg-gray-800 shadow-md flex flex-col transition-transform duration-300 ease-in-out transform transition-colors",
                isMobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
            )}>
                <div className="p-6 border-b hidden md:block bg-gradient-to-r from-blue-600 to-blue-700 text-white">
                    <div className="flex items-center space-x-3 mb-2">
                        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center overflow-hidden border-2 border-white/30">
                            {user?.avatarUrl ? (
                                <img src={user.avatarUrl?.startsWith('http') ? user.avatarUrl : `${API_URL}${user.avatarUrl}`} alt={user.name} className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-lg font-bold">{user?.name?.charAt(0)}</span>
                            )}
                        </div>
                        <div>
                            <h1 className="text-xl font-bold leading-tight">TicketSys</h1>
                            <p className="text-xs text-blue-100 opacity-90">Bem-vindo, {user?.name?.split(' ')[0]}</p>
                        </div>
                    </div>
                </div>

                {/* Mobile User Info */}
                <div className="p-6 border-b md:hidden bg-gray-50">
                    <p className="font-medium text-gray-900">{user?.name}</p>
                    <p className="text-xs text-gray-500">{user?.email}</p>
                </div>

                <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.path;
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                onClick={() => setIsMobileMenuOpen(false)}
                                className={clsx(
                                    "flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 group relative",
                                    isActive
                                        ? "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400"
                                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white"
                                )}
                            >
                                {isActive && (
                                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-blue-600 rounded-r-full" />
                                )}
                                <Icon className={clsx(
                                    "w-5 h-5 mr-3 transition-colors",
                                    isActive ? "text-blue-600" : "text-gray-400 group-hover:text-gray-600"
                                )} />
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>
                <div className="p-4 border-t bg-gray-50 md:bg-white dark:bg-gray-800 dark:border-gray-700 transition-colors">
                    <button
                        onClick={handleLogout}
                        className="flex items-center w-full px-4 py-3 text-sm font-medium text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                        <LogOut className="w-5 h-5 mr-3" />
                        Sair
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
                <header className="bg-white dark:bg-gray-800 shadow-sm z-10 transition-colors duration-200">
                    <div className="px-4 md:px-6 py-4 flex justify-between items-center">
                        <button
                            onClick={() => setIsMobileMenuOpen(true)}
                            className="md:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
                        >
                            <Menu className="h-6 w-6" />
                        </button>
                        <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
                            {navItems.find(item => item.path === location.pathname)?.label || 'Dashboard'}
                        </h2>
                        <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-2">
                                <NotificationBell />
                                <button
                                    onClick={toggleTheme}
                                    className="p-2 rounded-full text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 transition-colors"
                                    title="Toggle Theme"
                                >
                                    {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
                                </button>
                            </div>
                            <div className="flex items-center space-x-3">
                                <div className="text-right hidden sm:block">
                                    <p className="text-sm font-medium text-gray-900 dark:text-white">{user?.name}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{user?.role.toLowerCase()}</p>
                                </div>
                                <button
                                    onClick={logout}
                                    className="p-2 rounded-full text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                    title="Logout"
                                >
                                    <LogOut className="h-5 w-5" />
                                </button>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Main Content */}
                <main className="flex-1 overflow-y-auto p-6 bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
                    <Outlet />
                </main>
            </div>

            {/* Quick Search - Global */}
            <QuickSearch />
        </div>
    );
}
