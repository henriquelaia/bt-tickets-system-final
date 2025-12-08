import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import api from '../lib/api';

interface Ticket {
    id: number;
    title: string;
    status: string;
    priority: string;
    category: { name: string };
}

export function QuickSearch() {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<Ticket[]>([]);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    // Atalho Cmd/Ctrl + K
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setIsOpen(true);
            }
            if (e.key === 'Escape') {
                setIsOpen(false);
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Pesquisar
    useEffect(() => {
        if (query.length < 2) {
            setResults([]);
            return;
        }

        const timeoutId = setTimeout(async () => {
            setLoading(true);
            try {
                const res = await api.get(`/tickets?search=${query}&limit=10`);
                setResults(res.data.data || []);
            } catch (error) {
                console.error('Search error:', error);
                setResults([]);
            } finally {
                setLoading(false);
            }
        }, 300); // Debounce 300ms

        return () => clearTimeout(timeoutId);
    }, [query]);

    const handleSelectTicket = (ticketId: number) => {
        setIsOpen(false);
        setQuery('');
        setResults([]);
        navigate(`/tickets/${ticketId}`);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center pt-32 px-4">
            <div className="bg-white dark:bg-gray-800 w-full max-w-2xl rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700">
                {/* Search Input */}
                <div className="flex items-center border-b border-gray-200 dark:border-gray-700 p-4">
                    <Search className="h-5 w-5 text-gray-400 mr-3" />
                    <input
                        type="text"
                        placeholder="Pesquisar tickets..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        className="flex-1 bg-transparent border-none focus:outline-none text-gray-900 dark:text-white placeholder-gray-400"
                        autoFocus
                    />
                    <button
                        onClick={() => setIsOpen(false)}
                        className="ml-2 p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                    >
                        <X className="h-5 w-5 text-gray-400" />
                    </button>
                </div>

                {/* Results */}
                <div className="max-h-96 overflow-y-auto">
                    {loading && (
                        <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
                            <p className="mt-2 text-sm">A pesquisar...</p>
                        </div>
                    )}

                    {!loading && query.length >= 2 && results.length === 0 && (
                        <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                            <p>Nenhum ticket encontrado</p>
                        </div>
                    )}

                    {!loading && results.length > 0 && (
                        <div>
                            {results.map((ticket) => (
                                <button
                                    key={ticket.id}
                                    onClick={() => handleSelectTicket(ticket.id)}
                                    className="w-full p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <p className="font-medium text-gray-900 dark:text-white">
                                                #{ticket.id} - {ticket.title}
                                            </p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">
                                                    {ticket.category.name}
                                                </span>
                                                <span className={`text-xs px-2 py-0.5 rounded ${ticket.priority === 'URGENT' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' :
                                                        ticket.priority === 'HIGH' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' :
                                                            ticket.priority === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' :
                                                                'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                                                    }`}>
                                                    {ticket.priority}
                                                </span>
                                                <span className={`text-xs px-2 py-0.5 rounded ${ticket.status === 'OPEN' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
                                                        ticket.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' :
                                                            'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                                                    }`}>
                                                    {ticket.status}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}

                    {query.length < 2 && (
                        <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                            <Search className="h-12 w-12 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">Digite pelo menos 2 caracteres para pesquisar</p>
                            <p className="text-xs mt-2">
                                Use <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs">Cmd/Ctrl + K</kbd> para abrir
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
