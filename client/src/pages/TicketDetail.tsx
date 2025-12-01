import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
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
    const [showCloseModal, setShowCloseModal] = useState(false);
    const [closeComment, setCloseComment] = useState('');
    const [closeFile, setCloseFile] = useState<File | null>(null);
    const [targetStatus, setTargetStatus] = useState('');

    useEffect(() => {
        fetchTicket();

        if (socket) {
            socket.on('comment:added', (data: { ticketId: number, comment: Comment }) => {
                if (data.ticketId === Number(id)) {
                    setTicket(prev => {
                        if (!prev) return null;
                        // Avoid duplicates if the user just added it themselves
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
        } catch (err) {
            console.error(err);
            toast.error('Erro ao carregar ticket');
            navigate('/');
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

    if (loading) return <div>A carregar...</div>;
    if (!ticket) return <div>Ticket não encontrado</div>;

    return (
        <div className="max-w-4xl mx-auto relative">
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

            <div className="mb-6">
                <Link to="/tickets" className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 flex items-center transition-colors">
                    <ArrowLeft className="h-4 w-4 mr-1" />
                    Voltar aos Tickets
                </Link>
            </div>

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
                                Criado por <span className="font-medium text-gray-900 dark:text-white">{ticket.creator.name}</span> em {new Date(ticket.createdAt).toLocaleString()}
                            </p>
                        </div>
                        {user?.role === 'ADMIN' && (
                            <div className="flex space-x-2">
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
                            </div>
                        )}
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
                                Comentários ({ticket.comments.length})
                            </h3>

                            <div className="space-y-4 mb-6">
                                {ticket.comments.map((comment) => (
                                    <div key={comment.id} className="flex space-x-3">
                                        <div className="flex-shrink-0">
                                            <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-sm font-medium text-gray-600 dark:text-gray-300">
                                                {comment.user.name.charAt(0)}
                                            </div>
                                        </div>
                                        <div className="flex-grow">
                                            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 border border-gray-200 dark:border-gray-600 transition-colors duration-200">
                                                <div className="flex justify-between items-center mb-1">
                                                    <span className="text-sm font-medium text-gray-900 dark:text-white">{comment.user.name}</span>
                                                    <span className="text-xs text-gray-500 dark:text-gray-400">{new Date(comment.createdAt).toLocaleString()}</span>
                                                </div>
                                                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{comment.content}</p>
                                                {/* Display attachments linked to this comment if any - logic needs backend support to return them nested or we filter from main list if they have commentId */}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {ticket.comments.length === 0 && (
                                    <p className="text-gray-500 dark:text-gray-400 text-sm italic">Ainda sem comentários.</p>
                                )}
                            </div>

                            <form onSubmit={handleAddComment} className="flex flex-col space-y-3">
                                <div className="flex items-start space-x-3">
                                    <div className="flex-shrink-0">
                                        <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-sm font-medium text-gray-600 dark:text-gray-300">
                                            {user?.name.charAt(0)}
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
                                    <dd className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{ticket.category.name}</dd>
                                </div>
                                <div>
                                    <dt className="text-xs text-gray-500 dark:text-gray-400">Atribuído a</dt>
                                    <dd className="mt-1 text-sm font-medium text-gray-900 dark:text-white flex items-center">
                                        {ticket.assignee ? (
                                            <>
                                                <div className="h-5 w-5 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center text-xs text-gray-600 dark:text-gray-300 mr-2">
                                                    {ticket.assignee.name.charAt(0)}
                                                </div>
                                                {ticket.assignee.name}
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
        </div>
    );
}
