import { useEffect, useState } from 'react';
import api from '../lib/api';
import { useNavigate } from 'react-router-dom';
import { Ticket, CheckCircle, Clock } from 'lucide-react';
import { useSocket } from '../context/SocketContext';

export default function Dashboard() {
    const navigate = useNavigate();
    const { socket } = useSocket();
    const [stats, setStats] = useState<any>(null);

    const fetchStats = () => {
        api.get('/dashboard/stats')
            .then((res) => setStats(res.data))
            .catch((err) => console.error(err));
    };

    useEffect(() => {
        fetchStats();

        if (socket) {
            socket.on('ticket:created', fetchStats);
            socket.on('ticket:updated', fetchStats);

            return () => {
                socket.off('ticket:created', fetchStats);
                socket.off('ticket:updated', fetchStats);
            };
        }
    }, [socket]);

    if (!stats) return <div>A carregar estatísticas...</div>;

    return (
        <div>
            <h2 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white">Dashboard</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 mb-8">
                <div
                    onClick={() => navigate('/tickets')}
                    className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 transition-all duration-200 cursor-pointer hover:shadow-md hover:border-blue-400 dark:hover:border-blue-600 hover:scale-105"
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total de Tickets</p>
                            <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{stats.total}</p>
                        </div>
                        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-full">
                            <Ticket className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                        </div>
                    </div>
                </div>

                <div
                    onClick={() => navigate('/tickets?status=OPEN')}
                    className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 transition-all duration-200 cursor-pointer hover:shadow-md hover:border-green-400 dark:hover:border-green-600 hover:scale-105"
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Tickets Abertos</p>
                            <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{stats.open}</p>
                        </div>
                        <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-full">
                            <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                        </div>
                    </div>
                </div>

                <div
                    onClick={() => navigate('/tickets?status=IN_PROGRESS')}
                    className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 transition-all duration-200 cursor-pointer hover:shadow-md hover:border-yellow-400 dark:hover:border-yellow-600 hover:scale-105"
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Tickets Pendentes</p>
                            <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{stats.pending}</p>
                        </div>
                        <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-full">
                            <Clock className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                        </div>
                    </div>
                </div>

                <div
                    onClick={() => navigate('/assigned-tickets')}
                    className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 transition-all duration-200 cursor-pointer hover:shadow-md hover:border-purple-400 dark:hover:border-purple-600 hover:scale-105"
                >
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Atribuídos a Mim</p>
                            <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{stats.assigned?.total || 0}</p>
                        </div>
                        <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-full">
                            <Ticket className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg border border-green-200 dark:border-green-800">
                            <p className="text-xs font-medium text-green-600 dark:text-green-400 mb-1">Abertos</p>
                            <p className="text-2xl font-bold text-green-700 dark:text-green-300">{stats.assigned?.open || 0}</p>
                        </div>
                        <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg border border-yellow-200 dark:border-yellow-800">
                            <p className="text-xs font-medium text-yellow-600 dark:text-yellow-400 mb-1">Em Progresso</p>
                            <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-300">{stats.assigned?.inProgress || 0}</p>
                        </div>
                    </div>
                </div>

                <div
                    onClick={() => navigate('/my-tickets')}
                    className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 transition-all duration-200 cursor-pointer hover:shadow-md hover:border-indigo-400 dark:hover:border-indigo-600 hover:scale-105"
                >
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Criados por Mim</p>
                            <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{stats.created?.total || 0}</p>
                        </div>
                        <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-full">
                            <Ticket className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg border border-green-200 dark:border-green-800">
                            <p className="text-xs font-medium text-green-600 dark:text-green-400 mb-1">Abertos</p>
                            <p className="text-2xl font-bold text-green-700 dark:text-green-300">{stats.created?.open || 0}</p>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg border border-gray-200 dark:border-gray-600">
                            <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Fechados</p>
                            <p className="text-2xl font-bold text-gray-700 dark:text-gray-300">{stats.created?.closed || 0}</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 transition-colors duration-200">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Atividade Recente</h3>
                <div className="space-y-4">
                    {stats.recentActivity && stats.recentActivity.length > 0 ? (
                        stats.recentActivity.map((activity: any) => (
                            <div key={activity.id} className="flex items-start space-x-3 pb-4 border-b border-gray-100 dark:border-gray-700 last:border-0 last:pb-0">
                                <div className="flex-shrink-0">
                                    {activity.user.avatarUrl ? (
                                        <img src={activity.user.avatarUrl} alt={activity.user.name} className="h-8 w-8 rounded-full" />
                                    ) : (
                                        <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-300 font-bold text-xs">
                                            {activity.user.name.charAt(0)}
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                                        {activity.user.name}
                                    </p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                                        {activity.details}
                                    </p>
                                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                        {new Date(activity.createdAt).toLocaleString()}
                                    </p>
                                </div>
                            </div>
                        ))
                    ) : (
                        <p className="text-gray-500 dark:text-gray-400">Nenhuma atividade recente.</p>
                    )}
                </div>
            </div>
        </div>
    );
}
