import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function NewTicket() {
    const navigate = useNavigate();
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [priority, setPriority] = useState('MEDIUM');
    const [assigneeId, setAssigneeId] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [users, setUsers] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);

    useEffect(() => {
        api.get('/users').then(res => setUsers(res.data)).catch(console.error);
        api.get('/categories').then(res => {
            setCategories(res.data);
            if (res.data.length > 0) setCategoryId(res.data[0].id);
        }).catch(console.error);
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await api.post('/tickets', {
                title,
                description,
                categoryId,
                priority,
                assigneeId: assigneeId ? parseInt(assigneeId) : null
            });

            if (file) {
                const formData = new FormData();
                formData.append('file', file);
                await api.post(`/tickets/${res.data.id}/attachments`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
            }

            toast.success('Ticket criado com sucesso');
            navigate('/my-tickets');
        } catch (error) {
            toast.error('Erro ao criar ticket');
        }
    };

    return (
        <div className="max-w-2xl mx-auto bg-white dark:bg-gray-800 p-8 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 transition-colors duration-200">
            <h2 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white">Criar Novo Ticket</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Título</label>
                    <input
                        type="text"
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors"
                        required
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Descrição</label>
                    <textarea
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        rows={4}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors"
                        required
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Categoria</label>
                        <select
                            value={categoryId}
                            onChange={e => setCategoryId(e.target.value)}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors"
                        >
                            {categories.map(cat => (
                                <option key={cat.id} value={cat.id}>{cat.name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Prioridade</label>
                        <select
                            value={priority}
                            onChange={e => setPriority(e.target.value)}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors"
                        >
                            <option value="LOW">Baixa</option>
                            <option value="MEDIUM">Média</option>
                            <option value="HIGH">Alta</option>
                            <option value="URGENT">Urgente</option>
                        </select>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Atribuir a (Opcional)</label>
                    <select
                        value={assigneeId}
                        onChange={e => setAssigneeId(e.target.value)}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors"
                    >
                        <option value="">-- Selecionar Utilizador --</option>
                        {users.map(user => (
                            <option key={user.id} value={user.id}>{user.name} ({user.role})</option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Anexo (Opcional)</label>
                    <input
                        type="file"
                        onChange={e => setFile(e.target.files ? e.target.files[0] : null)}
                        className="mt-1 block w-full text-sm text-gray-500 dark:text-gray-400
                            file:mr-4 file:py-2 file:px-4
                            file:rounded-md file:border-0
                            file:text-sm file:font-semibold
                            file:bg-blue-50 file:text-blue-700
                            hover:file:bg-blue-100
                            dark:file:bg-blue-900/20 dark:file:text-blue-400"
                    />
                </div>

                <div className="flex justify-end">
                    <button
                        type="submit"
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                    >
                        Criar Ticket
                    </button>
                </div>
            </form>
        </div>
    );
}
