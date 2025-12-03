import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { User, Lock, Camera } from 'lucide-react';
import { API_URL } from '../config';

export default function Profile() {
    const { user, updateUser } = useAuth();
    const [name, setName] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (user) {
            setName(user.name);
        }
    }, [user]);

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password && password !== confirmPassword) {
            toast.error('As palavras-passe não coincidem');
            return;
        }

        setLoading(true);
        try {
            const data: any = { name };
            if (password) data.password = password;

            const res = await api.patch('/users/profile', data);
            updateUser(res.data);
            toast.success('Perfil atualizado com sucesso');
            setPassword('');
            setConfirmPassword('');
        } catch (error) {
            toast.error('Erro ao atualizar perfil');
        } finally {
            setLoading(false);
        }
    };

    const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || !e.target.files[0]) return;

        const file = e.target.files[0];
        const formData = new FormData();
        formData.append('avatar', file);

        const toastId = toast.loading('A carregar avatar...');
        try {
            const res = await api.post('/users/profile/avatar', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            updateUser(res.data);
            toast.success('Avatar atualizado', { id: toastId });
        } catch (error) {
            toast.error('Erro ao carregar avatar', { id: toastId });
        }
    };

    if (!user) return <div>A carregar...</div>;

    return (
        <div className="max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white">Definições de Perfil</h2>

            <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg border border-gray-200 dark:border-gray-700 p-6 transition-colors duration-200">
                <div className="flex items-center mb-8">
                    <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                        {user?.avatarUrl ? (
                            <img
                                src={`${API_URL}${user.avatarUrl}`}
                                alt={user.name}
                                className="h-20 w-20 rounded-full object-cover border-4 border-white dark:border-gray-700 shadow-sm"
                            />
                        ) : (
                            <div className="h-20 w-20 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-2xl font-bold text-gray-600 dark:text-gray-300 border-4 border-white dark:border-gray-700 shadow-sm">
                                {user?.name.charAt(0)}
                            </div>
                        )}
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 rounded-full flex items-center justify-center transition-all duration-200">
                            <Camera className="text-white opacity-0 group-hover:opacity-100 h-6 w-6" />
                        </div>
                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept="image/*"
                            onChange={handleAvatarChange}
                        />
                    </div>
                    <div className="ml-6">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white">{user?.name}</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{user?.email}</p>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 mt-2">
                            {user?.role}
                        </span>
                    </div>
                </div>

                <form onSubmit={handleUpdateProfile} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nome Completo</label>
                        <div className="mt-1 relative rounded-md shadow-sm">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <User className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                                type="text"
                                className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors duration-200"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-4">Alterar Palavra-passe</h4>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nova Palavra-passe</label>
                                <div className="mt-1 relative rounded-md shadow-sm">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Lock className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <input
                                        type="password"
                                        className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors duration-200"
                                        placeholder="Deixar em branco para manter a atual"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Confirmar Nova Palavra-passe</label>
                                <div className="mt-1 relative rounded-md shadow-sm">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Lock className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <input
                                        type="password"
                                        className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors duration-200"
                                        placeholder="Confirmar nova palavra-passe"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end pt-4">
                        <button
                            type="submit"
                            disabled={loading}
                            className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors duration-200"
                        >
                            {loading ? 'A guardar...' : 'Guardar Alterações'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
