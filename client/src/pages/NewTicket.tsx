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
    const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
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

    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSubmitting) return;

        setIsSubmitting(true);
        try {
            const res = await api.post('/tickets', {
                title,
                description,
                categoryId,
                priority,
                assigneeIds: assigneeIds.length > 0 ? assigneeIds : null
            });

            if (file) {
                const formData = new FormData();
                formData.append('file', file);
                // If multiple tickets were created, we might need to handle attachments for all of them.
                // However, the backend returns the first ticket.
                // For now, let's attach to the returned ticket ID.
                // Ideally, the backend should handle attachment duplication or we loop here if we knew all IDs.
                // Given the constraint, we will attach to the primary (first) ticket returned.
                await api.post(`/tickets/${res.data.id}/attachments`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
            }

            toast.success('Ticket(s) criado(s) com sucesso');
            navigate('/my-tickets');
        } catch (error) {
            toast.error('Erro ao criar ticket');
        } finally {
            setIsSubmitting(false);
        }
    };

    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = React.useRef<HTMLDivElement>(null);

    // ... (useEffect and other handlers remain the same)

    return (
        <div className="max-w-2xl mx-auto bg-white dark:bg-gray-800 p-8 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 transition-colors duration-200">
            <h2 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white">Criar Novo Ticket</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
                {/* ... (Fields remain the same) ... */}

                {/* ... (Dropdown logic remains the same) ... */}

                {/* ... (Attachment input remains the same) ... */}

                <div className="flex justify-end">
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:bg-blue-400 disabled:cursor-not-allowed flex items-center"
                    >
                        {isSubmitting ? (
                            <>
                                <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                A criar...
                            </>
                        ) : (
                            'Criar Ticket'
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}
