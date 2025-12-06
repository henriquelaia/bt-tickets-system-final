import React, { useEffect, useState } from 'react';
import api from '../../lib/api';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { ROLE_LABELS } from '../../utils/translations';

interface User {
    id: number;
    name: string;
    email: string;
    role: string;
}

export default function UserList() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        role: 'COLLABORATOR'
    });

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = () => {
        api.get('/users')
            .then(res => setUsers(res.data))
            .catch(console.error)
            .finally(() => setLoading(false));
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm('Tem a certeza que pretende apagar este utilizador?')) return;
        try {
            await api.delete(`/users/${id}`);
            setUsers(users.filter(u => u.id !== id));
            toast.success('Utilizador apagado');
        } catch (error) {
            toast.error('Erro ao apagar utilizador');
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/users', formData);
            setIsCreating(false);
            setFormData({ name: '', email: '', password: '', role: 'COLLABORATOR' });
            fetchUsers();
            toast.success('Utilizador criado');
        } catch (error) {
            toast.error('Erro ao criar utilizador');
        }
    };

    if (loading) return <div className="text-gray-900 dark:text-white">A carregar utilizadores...</div>;

    return (
        <div className="px-2 sm:px-0">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-white">Gestão de Utilizadores</h2>
                <button
                    onClick={() => setIsCreating(true)}
                    className="w-full sm:w-auto bg-blue-600 text-white px-4 py-2.5 sm:py-2 rounded-lg hover:bg-blue-700 text-center"
                >
                    Criar Utilizador
                </button>
            </div>

            {isCreating && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
                        <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Novo Utilizador</h3>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nome</label>
                                <input
                                    type="text"
                                    required
                                    className="mt-1 w-full p-2.5 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-base"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
                                <input
                                    type="email"
                                    required
                                    className="mt-1 w-full p-2.5 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-base"
                                    value={formData.email}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Palavra-passe</label>
                                <input
                                    type="password"
                                    required
                                    className="mt-1 w-full p-2.5 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-base"
                                    value={formData.password}
                                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Função</label>
                                <select
                                    className="mt-1 w-full p-2.5 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-base"
                                    value={formData.role}
                                    onChange={e => setFormData({ ...formData, role: e.target.value })}
                                >
                                    <option value="COLLABORATOR">Colaborador</option>
                                    <option value="SUPPORT">Suporte</option>
                                    <option value="ADMIN">Administrador</option>
                                </select>
                            </div>
                            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:space-x-2 mt-6 pt-4 border-t dark:border-gray-700">
                                <button
                                    type="button"
                                    onClick={() => setIsCreating(false)}
                                    className="w-full sm:w-auto px-4 py-2.5 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="w-full sm:w-auto px-4 py-2.5 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                                >
                                    Criar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Mobile Cards View */}
            <div className="sm:hidden space-y-3">
                {users.map((user) => (
                    <div key={user.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
                        <div className="flex justify-between items-start mb-2">
                            <div className="flex-1 min-w-0">
                                <p className="font-medium text-gray-900 dark:text-white truncate">{user.name}</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
                            </div>
                            <span className={clsx(
                                "ml-2 px-2 py-1 text-xs font-semibold rounded-full flex-shrink-0",
                                user.role === 'ADMIN' ? "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400" :
                                    user.role === 'SUPPORT' ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" :
                                        "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
                            )}>
                                {ROLE_LABELS[user.role] || user.role}
                            </span>
                        </div>
                        <div className="flex justify-end pt-2 border-t dark:border-gray-700">
                            <button
                                onClick={() => handleDelete(user.id)}
                                className="px-3 py-1.5 text-sm text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            >
                                Apagar
                            </button>
                        </div>
                    </div>
                ))}
                {users.length === 0 && (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                        Nenhum utilizador encontrado.
                    </div>
                )}
            </div>

            {/* Desktop Table View */}
            <div className="hidden sm:block bg-white dark:bg-gray-800 shadow-sm rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-900">
                            <tr>
                                <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Nome</th>
                                <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Email</th>
                                <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Função</th>
                                <th className="px-4 md:px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {users.map((user) => (
                                <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                    <td className="px-4 md:px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{user.name}</td>
                                    <td className="px-4 md:px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{user.email}</td>
                                    <td className="px-4 md:px-6 py-4 whitespace-nowrap text-sm">
                                        <span className={clsx(
                                            "px-2 inline-flex text-xs leading-5 font-semibold rounded-full",
                                            user.role === 'ADMIN' ? "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400" :
                                                user.role === 'SUPPORT' ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" :
                                                    "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
                                        )}>
                                            {ROLE_LABELS[user.role] || user.role}
                                        </span>
                                    </td>
                                    <td className="px-4 md:px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button
                                            onClick={() => handleDelete(user.id)}
                                            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                                        >
                                            Apagar
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
