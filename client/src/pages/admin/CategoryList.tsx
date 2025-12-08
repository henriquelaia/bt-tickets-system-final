import React, { useEffect, useState } from 'react';
import api from '../../lib/api';
import { Trash2, Plus } from 'lucide-react';
import toast from 'react-hot-toast';

interface Category {
    id: number;
    name: string;
}

export default function CategoryList() {
    const [categories, setCategories] = useState<Category[]>([]);
    const [newCategory, setNewCategory] = useState('');
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        fetchCategories();
    }, []);

    const fetchCategories = () => {
        api.get('/categories')
            .then(res => setCategories(res.data))
            .catch(() => toast.error('Erro ao carregar categorias'))
            .finally(() => setLoading(false));
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCategory.trim() || isSubmitting) return;

        setIsSubmitting(true);
        try {
            await api.post('/categories', { name: newCategory });
            setNewCategory('');
            fetchCategories();
            toast.success('Categoria criada');
        } catch (error: any) {
            if (error.response?.status === 409) {
                toast.error('Uma categoria com este nome já existe.');
            } else {
                toast.error('Erro ao criar categoria');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm('Tem a certeza? Isto pode afetar tickets existentes.')) return;

        try {
            await api.delete(`/categories/${id}`);
            fetchCategories();
            toast.success('Categoria apagada');
        } catch (error: any) {
            if (error.response?.status === 409) {
                toast.error(error.response.data.message || 'Não é possível apagar: existem tickets associados.');
            } else {
                toast.error('Erro ao apagar categoria');
            }
        }
    };

    if (loading) return <div className="text-gray-900 dark:text-white">A carregar...</div>;

    return (
        <div className="max-w-4xl mx-auto px-2 sm:px-0">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Gestão de Categorias</h1>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 sm:p-6 mb-6">
                <form onSubmit={handleCreate} className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                    <input
                        type="text"
                        value={newCategory}
                        onChange={(e) => setNewCategory(e.target.value)}
                        placeholder="Nome da Nova Categoria"
                        disabled={isSubmitting}
                        className="flex-1 p-2.5 sm:p-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-base"
                    />
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full sm:w-auto px-4 py-2.5 sm:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center disabled:bg-blue-400 disabled:cursor-not-allowed whitespace-nowrap"
                    >
                        {isSubmitting ? (
                            <span className="flex items-center">
                                <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                A criar...
                            </span>
                        ) : (
                            <>
                                <Plus className="w-5 h-5 mr-2" />
                                Adicionar
                            </>
                        )}
                    </button>
                </form>
            </div>

            {/* Mobile Cards View */}
            <div className="sm:hidden space-y-3">
                {categories.map((category) => (
                    <div key={category.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 p-4 flex items-center justify-between">
                        <div>
                            <span className="text-xs text-gray-500 dark:text-gray-400">#{category.id}</span>
                            <p className="font-medium text-gray-900 dark:text-white">{category.name}</p>
                        </div>
                        <button
                            onClick={() => handleDelete(category.id)}
                            className="p-2 text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        >
                            <Trash2 className="w-5 h-5" />
                        </button>
                    </div>
                ))}
                {categories.length === 0 && (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                        Nenhuma categoria encontrada.
                    </div>
                )}
            </div>

            {/* Desktop Table View */}
            <div className="hidden sm:block bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-900">
                            <tr>
                                <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">ID</th>
                                <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Nome</th>
                                <th className="px-4 md:px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {categories.map((category) => (
                                <tr key={category.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                    <td className="px-4 md:px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">#{category.id}</td>
                                    <td className="px-4 md:px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{category.name}</td>
                                    <td className="px-4 md:px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button
                                            onClick={() => handleDelete(category.id)}
                                            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 transition-colors p-1"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {categories.length === 0 && (
                                <tr>
                                    <td colSpan={3} className="px-4 md:px-6 py-4 text-center text-gray-500 dark:text-gray-400">Nenhuma categoria encontrada.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
