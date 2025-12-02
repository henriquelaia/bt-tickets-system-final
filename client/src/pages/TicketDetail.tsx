import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { ArrowLeft, MessageSquare, Send } from 'lucide-react';
import { STATUS_LABELS, PRIORITY_LABELS } from '../utils/translations';

interface Ticket {
    id: number;
    title: string;
    description: string;
    status: string;
    priority: string;
    category: { id: number; name: string };
    createdAt: string;
    creator: { id: number; name: string };
    assignee: { id: number; name: string } | null;
    comments: Comment[];
    attachments: Attachment[];
}

interface Comment {
    id: number;
    content: string;
    createdAt: string;
    user: { id: number; name: string };
}

interface Attachment {
    id: number;
    url: string;
    name: string;
}

interface Category {
    id: number;
    name: string;
}

export default function TicketDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { socket } = useSocket();
    const [ticket, setTicket] = useState<Ticket | null>(null);
    const [newComment, setNewComment] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [targetStatus, setTargetStatus] = useState('');
    const [error, setError] = useState(false);

    // Edit State
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState({
        title: '',
        description: '',
        priority: 'MEDIUM',
        status: 'OPEN',
        categoryId: ''
    });
    const [categories, setCategories] = useState<Category[]>([]);
    const [showCloseModal, setShowCloseModal] = useState(false);
    const [closeComment, setCloseComment] = useState('');
    const [closeFile, setCloseFile] = useState<File | null>(null);

    useEffect(() => {
        if (ticket) {
            setEditForm({
                title: ticket.title || '',
                description: ticket.description || '',
                priority: ticket.priority || 'MEDIUM',
                status: ticket.status || 'OPEN',
                categoryId: ticket.category?.id?.toString() || ''
            });
        }
    }, [ticket]);

    useEffect(() => {
        if (isEditing) {
            api.get('/categories').then(res => setCategories(res.data)).catch(err => console.error(err));
        }
    }, [isEditing]);

    useEffect(() => {
        fetchTicket();

        if (socket) {
            socket.on('comment:added', (data: { ticketId: number, comment: Comment }) => {
                if (data.ticketId === Number(id)) {
                    setTicket(prev => {
                        if (!prev) return null;
                        if (prev.comments.some(c => c.id === data.comment.id)) return prev;
                        return { ...prev, comments: [...prev.comments, data.comment] };
                    });
                }
            });

            socket.on('ticket:updated', (updatedTicket: Ticket) => {
                if (updatedTicket.id === Number(id)) {
                    setTicket(prev => prev ? { ...prev, status: updatedTicket.status, priority: updatedTicket.priority, assignee: updatedTicket.assignee } : null);
                }
            });

            return () => {
                socket.off('comment:added');
                socket.off('ticket:updated');
            };
        }
    }, [id, socket]);

    const fetchTicket = async () => {
        try {
            const res = await api.get(`/tickets/${id}`);
            setTicket(res.data);
            setError(false);
        } catch (err) {
            console.error(err);
            setError(true);
            toast.error('Erro ao carregar ticket');
        } finally {
            setLoading(false);
        }
    };

    const handleAddComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newComment.trim() && !file) return;

        setSubmitting(true);
        try {
            let commentId: number | null = null;

            if (newComment.trim()) {
                const res = await api.post(`/tickets/${id}/comments`, { content: newComment });
                commentId = res.data.id;
            }

            if (file) {
                const formData = new FormData();
                formData.append('file', file);
                if (commentId) formData.append('commentId', commentId.toString());

                await api.post(`/tickets/${id}/attachments`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
            }

            setNewComment('');
            setFile(null);
            fetchTicket();
            toast.success('Comentário adicionado');
        } catch (error) {
            toast.error('Erro ao adicionar comentário ou anexo');
        } finally {
            setSubmitting(false);
        }
    };

    const handleStatusChange = async (newStatus: string) => {
        if (newStatus === 'CLOSED' || newStatus === 'RESOLVED') {
            setTargetStatus(newStatus);
            setShowCloseModal(true);
            return;
        }
        await updateStatus(newStatus);
    };

    const updateStatus = async (status: string) => {
        try {
            await api.patch(`/tickets/${id}`, { status });
            await fetchTicket();
            toast.success(`Estado atualizado para ${status}`);
        } catch (error) {
            toast.error('Erro ao atualizar estado');
        }
    };

    const handleUpdateTicket = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await api.put(`/tickets/${id}`, {
                ...editForm,
                categoryId: editForm.categoryId ? parseInt(editForm.categoryId) : undefined
            });
            setTicket(res.data);
            setIsEditing(false);
            toast.success('Ticket atualizado com sucesso');
        } catch (error) {
            toast.error('Erro ao atualizar ticket');
        }
    };

    const handleCloseSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            let commentId: number | null = null;
            if (closeComment.trim()) {
                const res = await api.post(`/tickets/${id}/comments`, { content: closeComment });
                commentId = res.data.id;
            }

            if (closeFile) {
                const formData = new FormData();
                formData.append('file', closeFile);
                if (commentId) formData.append('commentId', commentId.toString());

                await api.post(`/tickets/${id}/attachments`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
            }

            await updateStatus(targetStatus);
            setShowCloseModal(false);
            setCloseComment('');
            setCloseFile(null);
        } catch (error) {
            toast.error('Erro ao fechar ticket');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="flex justify-center items-center h-full"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;

    if (error) return (
        <div className="max-w-4xl mx-auto p-6 text-center">
            <div className="mb-6 text-red-600">
                <h2 className="text-2xl font-bold mb-2">Erro ao carregar ticket</h2>
                <p>Não foi possível carregar os detalhes deste ticket. Ele pode estar corrompido ou ter sido apagado.</p>
            </div>
            <div className="flex justify-center space-x-4">
                <button
                    onClick={() => navigate('/tickets')}
                    className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600"
                >
                    Voltar para a lista
                </button>
                {(user?.role === 'ADMIN' || (ticket && user?.id === ticket.creator?.id)) && (
                    <button
                        onClick={async () => {
                            if (!window.confirm('Tem a certeza que deseja apagar este ticket? Esta ação é irreversível.')) return;
                            try {
                                await api.delete(`/tickets/${id}`);
                                toast.success('Ticket apagado com sucesso');
                                navigate('/tickets');
                            } catch (error) {
                                toast.error('Erro ao apagar ticket');
                            }
                        }}
                        className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                    >
                        Apagar Ticket Corrompido
                    </button>
                )}
            </div>
        </div>
    );

    if (!ticket) return <div className="text-center text-gray-500 mt-10">Ticket não encontrado</div>;

    return (
        <div className="max-w-4xl mx-auto relative">
            <button onClick={() => navigate(-1)} className="mb-4 flex items-center text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200 transition-colors">
                <ArrowLeft className="h-4 w-4 mr-1" />
                Voltar
            </button>

            {/* Close Modal */}
            {showCloseModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6 shadow-xl">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                            Resolver/Fechar Ticket
                        </h3>
                        <form onSubmit={handleCloseSubmit}>
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Comentário Final / Solução
                                </label>
                                <textarea
                                    value={closeComment}
                                    onChange={e => setCloseComment(e.target.value)}
                                    className="w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    rows={4}
                                    required
                                />
                            </div>
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Anexo (Opcional)
                                </label>
                                <input
                                    type="file"
                                    onChange={e => setCloseFile(e.target.files ? e.target.files[0] : null)}
                                    className="block w-full text-sm text-gray-500 dark:text-gray-400
                                        file:mr-4 file:py-2 file:px-4
                                        file:rounded-md file:border-0
                                        file:text-sm file:font-semibold
                                        file:bg-blue-50 file:text-blue-700
                                        hover:file:bg-blue-100
                                        dark:file:bg-blue-900/20 dark:file:text-blue-400"
                                />
                            </div>
                            <div className="flex justify-end space-x-3">
                                <button
                                    type="button"
                                    onClick={() => setShowCloseModal(false)}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50"
                                >
                                    Confirmar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {isEditing ? (
                <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-8">
                    <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Editar Ticket</h2>
                    <form onSubmit={handleUpdateTicket} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Título</label>
                            <input
                                type="text"
                                value={editForm.title}
                                onChange={e => setEditForm({ ...editForm, title: e.target.value })}
                                className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Descrição</label>
                            <textarea
                                rows={4}
                                value={editForm.description}
                                onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                                className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                required
                            />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Prioridade</label>
                                <select
                                    value={editForm.priority}
                                    onChange={e => setEditForm({ ...editForm, priority: e.target.value })}
                                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                >
                                    <option value="LOW">Baixa</option>
                                    <option value="MEDIUM">Média</option>
                                    <option value="HIGH">Alta</option>
                                    <option value="URGENT">Urgente</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Estado</label>
                                <select
                                    value={editForm.status}
                                    onChange={e => setEditForm({ ...editForm, status: e.target.value })}
                                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                >
                                    <option value="OPEN">Aberto</option>
                                    <option value="IN_PROGRESS">Em Progresso</option>
                                    <option value="RESOLVED">Resolvido</option>
                                    <option value="CLOSED">Fechado</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Categoria</label>
                                <select
                                    value={editForm.categoryId}
                                    onChange={e => setEditForm({ ...editForm, categoryId: e.target.value })}
                                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    required
                                >
                                    <option value="">Selecione uma categoria</option>
                                    {categories.map(cat => (
                                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="flex justify-end space-x-3 pt-4">
                            <button
                                type="button"
                                onClick={() => setIsEditing(false)}
                                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            >
                                Guardar Alterações
                            </button>
                        </div>
                    </form>
                </div>
            ) : (
                <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden mb-8 transition-colors duration-200">
                    <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                        <div className="flex justify-between items-start">
                            <div>
                                <div className="flex items-center space-x-3 mb-2">
                                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">#{ticket.id} - {ticket.title}</h1>
                                    <span className={clsx(
                                        "px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full border",
                                        ticket.status === 'OPEN' ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800" :
                                            ticket.status === 'IN_PROGRESS' ? "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800" :
                                                ticket.status === 'CLOSED' ? "bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600" :
                                                    "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
                                    )}>
                                        {STATUS_LABELS[ticket.status] || ticket.status}
                                    </span>
                                </div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    Criado por <span className="font-medium text-gray-900 dark:text-white">{ticket.creator?.name || 'Desconhecido'}</span> em {ticket.createdAt ? new Date(ticket.createdAt).toLocaleString() : '-'}
                                </p>
                            </div>
                            <div className="flex space-x-2">
                                {user?.role === 'ADMIN' && (
                                    <select
                                        value={ticket.status}
                                        onChange={(e) => handleStatusChange(e.target.value)}
                                        className="block w-32 pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors duration-200"
                                    >
                                        <option value="OPEN">Aberto</option>
                                        <option value="IN_PROGRESS">Em Progresso</option>
                                        <option value="RESOLVED">Resolvido</option>
                                        <option value="CLOSED">Fechado</option>
                                    </select>
                                )}
                                {(user?.id === ticket.creator?.id || user?.role === 'ADMIN') && (
                                    <>
                                        <button
                                            onClick={() => setIsEditing(true)}
                                            className="px-3 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50 rounded-md transition-colors text-sm font-medium flex items-center"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                            </svg>
                                            Editar
                                        </button>
                                        <button
                                            onClick={async () => {
                                                if (!window.confirm('Tem a certeza que deseja apagar este ticket? Esta ação é irreversível.')) return;
                                                try {
                                                    await api.delete(`/tickets/${id}`);
                                                    toast.success('Ticket apagado com sucesso');
                                                    navigate('/tickets');
                                                } catch (error) {
                                                    toast.error('Erro ao apagar ticket');
                                                }
                                            }}
                                            className="px-3 py-2 bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50 rounded-md transition-colors text-sm font-medium flex items-center"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                            Apagar
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="md:col-span-2 space-y-6">
                            <div>
                                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Descrição</h3>
                                <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-md text-gray-700 dark:text-gray-300 whitespace-pre-wrap border border-gray-200 dark:border-gray-700 transition-colors duration-200">
                                    {ticket.description}
                                </div>
                            </div>

                            <div>
                                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
                                    <MessageSquare className="h-5 w-5 mr-2" />
                                    Comentários ({ticket.comments?.length || 0})
                                </h3>

                                <div className="space-y-4 mb-6">
                                    {ticket.comments?.map((comment) => (
                                        <div key={comment.id} className="flex space-x-3">
                                            <div className="flex-shrink-0">
                                                <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-sm font-medium text-gray-600 dark:text-gray-300">
                                                    {comment.user?.name?.charAt(0) || '?'}
                                                </div>
                                            </div>
                                            <div className="flex-grow">
                                                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 border border-gray-200 dark:border-gray-600 transition-colors duration-200">
                                                    <div className="flex justify-between items-center mb-1">
                                                        <span className="text-sm font-medium text-gray-900 dark:text-white">{comment.user?.name || 'Utilizador Desconhecido'}</span>
                                                        <span className="text-xs text-gray-500 dark:text-gray-400">{comment.createdAt ? new Date(comment.createdAt).toLocaleString() : '-'}</span>
                                                    </div>
                                                    <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{comment.content}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {(!ticket.comments || ticket.comments.length === 0) && (
                                        <p className="text-gray-500 dark:text-gray-400 text-sm italic">Ainda sem comentários.</p>
                                    )}
                                </div>

                                <form onSubmit={handleAddComment} className="flex flex-col space-y-3">
                                    <div className="flex items-start space-x-3">
                                        <div className="flex-shrink-0">
                                            <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-sm font-medium text-gray-600 dark:text-gray-300">
                                                {user?.name?.charAt(0) || '?'}
                                            </div>
                                        </div>
                                        <div className="flex-grow">
                                            <textarea
                                                rows={3}
                                                className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-colors duration-200"
                                                placeholder="Adicionar um comentário..."
                                                value={newComment}
                                                onChange={(e) => setNewComment(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center pl-12">
                                        <input
                                            type="file"
                                            onChange={e => setFile(e.target.files ? e.target.files[0] : null)}
                                            className="text-xs text-gray-500 dark:text-gray-400
                                            file:mr-2 file:py-1 file:px-2
                                            file:rounded-md file:border-0
                                            file:text-xs file:font-semibold
                                            file:bg-blue-50 file:text-blue-700
                                            hover:file:bg-blue-100
                                            dark:file:bg-blue-900/20 dark:file:text-blue-400"
                                        />
                                        <button
                                            type="submit"
                                            disabled={submitting || (!newComment.trim() && !file)}
                                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors duration-200"
                                        >
                                            <Send className="h-4 w-4 mr-2" />
                                            Publicar
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg border border-gray-200 dark:border-gray-700 transition-colors duration-200">
                                <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Detalhes</h4>
                                <dl className="space-y-3">
                                    <div>
                                        <dt className="text-xs text-gray-500 dark:text-gray-400">Prioridade</dt>
                                        <dd className="mt-1 text-sm font-medium text-gray-900 dark:text-white flex items-center">
                                            <span className={clsx(
                                                "h-2.5 w-2.5 rounded-full mr-2",
                                                ticket.priority === 'URGENT' ? 'bg-red-500' :
                                                    ticket.priority === 'HIGH' ? 'bg-orange-500' :
                                                        ticket.priority === 'MEDIUM' ? 'bg-yellow-500' : 'bg-green-500'
                                            )} />
                                            {PRIORITY_LABELS[ticket.priority] || ticket.priority}
                                        </dd>
                                    </div>
                                    <div>
                                        <dt className="text-xs text-gray-500 dark:text-gray-400">Categoria</dt>
                                        <dd className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{ticket.category?.name || 'Sem Categoria'}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-xs text-gray-500 dark:text-gray-400">Atribuído a</dt>
                                        <dd className="mt-1 text-sm font-medium text-gray-900 dark:text-white flex items-center">
                                            {ticket.assignee ? (
                                                <>
                                                    <div className="h-5 w-5 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center text-xs text-gray-600 dark:text-gray-300 mr-2">
                                                        {ticket.assignee.name?.charAt(0) || '?'}
                                                    </div>
                                                    {ticket.assignee.name || 'Desconhecido'}
                                                </>
                                            ) : (
                                                <span className="text-gray-400 italic">Não atribuído</span>
                                            )}
                                        </dd>
                                    </div>
                                </dl>
                            </div>

                            <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg border border-gray-200 dark:border-gray-700 transition-colors duration-200">
                                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Anexos</h3>
                                {ticket.attachments && ticket.attachments.length > 0 ? (
                                    <ul className="space-y-2">
                                        {ticket.attachments.map(att => (
                                            <li key={att.id}>
                                                <a
                                                    href={`http://localhost:3000${att.url}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-sm text-blue-600 hover:underline flex items-center dark:text-blue-400 dark:hover:text-blue-300"
                                                >
                                                    📄 {att.name}
                                                </a>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Sem anexos.</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
