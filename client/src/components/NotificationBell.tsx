import { useState, useRef, useEffect } from 'react';
import { Bell, Check } from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';
import { Link } from 'react-router-dom';
import clsx from 'clsx';

export default function NotificationBell() {
    const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleNotificationClick = (id: number, read: boolean) => {
        if (!read) markAsRead(id);
        setIsOpen(false);
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 focus:outline-none"
            >
                <span className="sr-only">Ver notificações</span>
                <Bell className="h-6 w-6" />
                {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 block h-4 w-4 rounded-full ring-2 ring-white dark:ring-gray-800 bg-red-500 text-xs text-white font-bold flex items-center justify-center">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="origin-top-right absolute right-0 mt-2 w-80 rounded-md shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
                    <div className="py-1">
                        <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                            <h3 className="text-sm font-medium text-gray-900 dark:text-white">Notificações</h3>
                            {unreadCount > 0 && (
                                <button
                                    onClick={markAllAsRead}
                                    className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                                >
                                    Marcar todas como lidas
                                </button>
                            )}
                        </div>
                        <div className="max-h-96 overflow-y-auto">
                            {notifications.length === 0 ? (
                                <div className="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                                    Sem notificações
                                </div>
                            ) : (
                                notifications.map((notification) => (
                                    <div
                                        key={notification.id}
                                        className={clsx(
                                            "px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-150 border-b border-gray-100 dark:border-gray-700 last:border-0",
                                            !notification.read && "bg-blue-50/50 dark:bg-blue-900/10"
                                        )}
                                    >
                                        <div className="flex justify-between items-start">
                                            <div className="flex-1 min-w-0" onClick={() => handleNotificationClick(notification.id, notification.read)}>
                                                {notification.link ? (
                                                    <Link to={notification.link} className="block focus:outline-none">
                                                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                                            {notification.title}
                                                        </p>
                                                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
                                                            {notification.message}
                                                        </p>
                                                    </Link>
                                                ) : (
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                                            {notification.title}
                                                        </p>
                                                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
                                                            {notification.message}
                                                        </p>
                                                    </div>
                                                )}
                                                <p className="text-xs text-gray-400 mt-1">
                                                    {new Date(notification.createdAt).toLocaleString()}
                                                </p>
                                            </div>
                                            {!notification.read && (
                                                <button
                                                    onClick={() => markAsRead(notification.id)}
                                                    className="ml-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                                                    title="Marcar como lida"
                                                >
                                                    <Check className="h-4 w-4" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
