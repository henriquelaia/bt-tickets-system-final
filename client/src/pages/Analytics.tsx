import React, { useEffect, useState } from 'react';
import api from '../lib/api';
import TrendChart from '../components/charts/TrendChart';
import DistributionChart from '../components/charts/DistributionChart';
import { BarChart3, PieChart, TrendingUp, Activity, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { PRIORITY_LABELS } from '../utils/translations';

export default function Analytics() {
    const [stats, setStats] = useState<any>(null);
    const [trends, setTrends] = useState<any[]>([]);
    const [priorityDist, setPriorityDist] = useState<any[]>([]);
    const [categoryDist, setCategoryDist] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [statsRes, trendsRes, priorityRes, categoryRes] = await Promise.all([
                api.get('/analytics/stats'),
                api.get('/analytics/trends'),
                api.get('/analytics/distribution/priority'),
                api.get('/analytics/distribution/category')
            ]);

            setStats(statsRes.data);
            setTrends(trendsRes.data);
            setPriorityDist(priorityRes.data.map((item: any) => ({
                ...item,
                name: PRIORITY_LABELS[item.name] || item.name
            })));
            setCategoryDist(categoryRes.data);
        } catch (error) {
            console.error('Error fetching analytics:', error);
            toast.error('Falha ao carregar dados de análise');
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-500 dark:text-gray-400">A carregar análises...</div>;

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
                <Activity className="mr-2 h-6 w-6" />
                Painel de Análise
            </h1>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                <StatCard title="Total de Tickets" value={stats?.total} icon={<Activity />} color="blue" />
                <StatCard title="Abertos" value={stats?.open} icon={<Activity />} color="green" />
                <StatCard title="Em Progresso" value={stats?.inProgress} icon={<Activity />} color="yellow" />
                <StatCard title="Fechados" value={stats?.closed} icon={<Activity />} color="gray" />
                <StatCard title="Tempo Médio Resolução" value={stats?.averageResolutionTime || 'N/A'} icon={<Clock />} color="purple" />
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Trend Chart */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
                        <TrendingUp className="mr-2 h-5 w-5 text-blue-500" />
                        Tendência de Tickets (Últimos 7 Dias)
                    </h3>
                    <TrendChart data={trends} />
                </div>

                {/* Priority Distribution */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
                        <PieChart className="mr-2 h-5 w-5 text-purple-500" />
                        Tickets por Prioridade
                    </h3>
                    <DistributionChart
                        data={priorityDist}
                        colors={['#EF4444', '#F97316', '#EAB308', '#22C55E']} // Urgent (Red), High (Orange), Medium (Yellow), Low (Green)
                    />
                </div>

                {/* Category Distribution */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 lg:col-span-2">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
                        <BarChart3 className="mr-2 h-5 w-5 text-indigo-500" />
                        Tickets por Categoria
                    </h3>
                    <div className="h-80">
                        <DistributionChart data={categoryDist} />
                    </div>
                </div>
            </div>
        </div>
    );
}

function StatCard({ title, value, icon, color }: { title: string, value: number | string, icon: React.ReactNode, color: string }) {
    const colorClasses = {
        blue: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
        green: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
        yellow: 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400',
        gray: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
        purple: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
    };

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 flex items-center">
            <div className={`p-3 rounded-full mr-4 ${colorClasses[color as keyof typeof colorClasses]}`}>
                {icon}
            </div>
            <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
            </div>
        </div>
    );
}
