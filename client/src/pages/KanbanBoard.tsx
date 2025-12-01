import { useState, useEffect } from 'react';
import { DndContext, DragOverlay, useSensor, useSensors, PointerSensor, TouchSensor } from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import api from '../lib/api';
import type { Ticket } from '../types';
import { STATUS_LABELS, PRIORITY_LABELS } from '../utils/translations';
import clsx from 'clsx';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

const COLUMNS = [
    { id: 'OPEN', title: 'Aberto' },
    { id: 'IN_PROGRESS', title: 'Em Progresso' },
    { id: 'RESOLVED', title: 'Resolvido' }
];

function TicketCard({ ticket }: { ticket: Ticket }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: ticket.id,
        data: { ticket }
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 mb-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow"
        >
            <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-mono text-gray-500 dark:text-gray-400">#{ticket.id}</span>
                <span className={clsx(
                    "text-xs font-semibold px-2 py-0.5 rounded-full",
                    ticket.priority === 'HIGH' || ticket.priority === 'URGENT' ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
                )}>
                    {PRIORITY_LABELS[ticket.priority]}
                </span>
            </div>
            <h4 className="font-medium text-gray-900 dark:text-white mb-1 line-clamp-2">{ticket.title}</h4>
            <div className="flex justify-between items-center mt-3">
                <span className="text-xs text-gray-500 dark:text-gray-400">{ticket.category.name}</span>
                <div className="flex items-center">
                    <div className="h-6 w-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs font-medium text-gray-600 dark:text-gray-300" title={ticket.assignee?.name || 'Não atribuído'}>
                        {(ticket.assignee?.name || '?').charAt(0)}
                    </div>
                </div>
            </div>
            <Link to={`/tickets/${ticket.id}`} className="block mt-2 text-xs text-blue-600 dark:text-blue-400 hover:underline" onClick={(e) => e.stopPropagation()}>
                Ver Detalhes
            </Link>
        </div>
    );
}

function KanbanColumn({ id, title, tickets }: { id: string, title: string, tickets: Ticket[] }) {
    const { setNodeRef } = useSortable({ id });

    return (
        <div ref={setNodeRef} className="flex-1 min-w-[300px] bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-700 dark:text-gray-200 mb-4 flex items-center justify-between">
                {title}
                <span className="bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs px-2 py-1 rounded-full">
                    {tickets.length}
                </span>
            </h3>
            <SortableContext items={tickets.map(t => t.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-3 min-h-[200px]">
                    {tickets.map(ticket => (
                        <TicketCard key={ticket.id} ticket={ticket} />
                    ))}
                </div>
            </SortableContext>
        </div>
    );
}

export default function KanbanBoard() {
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [activeId, setActiveId] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(TouchSensor)
    );

    useEffect(() => {
        fetchTickets();
    }, []);

    const fetchTickets = async () => {
        try {
            const res = await api.get('/tickets?limit=100'); // Fetch more tickets for board
            // Handle pagination structure if present
            const data = Array.isArray(res.data) ? res.data : res.data.data;
            setTickets(data);
        } catch (error) {
            console.error('Error fetching tickets:', error);
            toast.error('Erro ao carregar tickets');
        } finally {
            setLoading(false);
        }
    };

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as number);
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveId(null);

        if (!over) return;

        const ticketId = active.id as number;
        const ticket = tickets.find(t => t.id === ticketId);

        // Find the column we dropped over
        // It could be a column ID or a ticket ID within a column
        let newStatus = over.id as string;

        // If we dropped over a ticket, find that ticket's status
        if (!COLUMNS.find(c => c.id === newStatus)) {
            const overTicket = tickets.find(t => t.id === over.id);
            if (overTicket) {
                newStatus = overTicket.status;
            } else {
                return; // Should not happen
            }
        }

        if (ticket && ticket.status !== newStatus) {
            // Optimistic update
            const oldStatus = ticket.status;
            setTickets(tickets.map(t =>
                t.id === ticketId ? { ...t, status: newStatus } : t
            ));

            try {
                await api.patch(`/tickets/${ticketId}`, { status: newStatus });
                toast.success(`Ticket movido para ${STATUS_LABELS[newStatus] || newStatus}`);
            } catch (error) {
                // Revert on error
                setTickets(tickets.map(t =>
                    t.id === ticketId ? { ...t, status: oldStatus } : t
                ));
                toast.error('Erro ao atualizar estado do ticket');
            }
        }
    };

    if (loading) return <div>A carregar quadro...</div>;

    return (
        <div className="h-full flex flex-col">
            <h2 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white">Quadro Kanban</h2>

            <DndContext
                sensors={sensors}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
            >
                <div className="flex gap-6 overflow-x-auto pb-4 h-full">
                    {COLUMNS.map(col => (
                        <KanbanColumn
                            key={col.id}
                            id={col.id}
                            title={col.title}
                            tickets={tickets.filter(t => t.status === col.id)}
                        />
                    ))}
                </div>

                <DragOverlay>
                    {activeId ? (
                        <div className="opacity-80 rotate-3 cursor-grabbing">
                            <TicketCard ticket={tickets.find(t => t.id === activeId)!} />
                        </div>
                    ) : null}
                </DragOverlay>
            </DndContext>
        </div>
    );
}
