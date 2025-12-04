export interface Ticket {
    id: number;
    title: string;
    description: string;
    status: string;
    priority: string;
    category: { id: number; name: string };
    createdAt: string;
    creatorId: number;
    creator: { name: string };
    assigneeId: number | null;
    assignee: { name: string } | null;
    comments?: Comment[];
    attachments?: Attachment[];
    ticketNumber?: string;
}

export interface Comment {
    id: number;
    content: string;
    createdAt: string;
    user: { id: number; name: string; avatarUrl?: string };
}

export interface Attachment {
    id: number;
    name: string;
    url: string;
}

export interface User {
    id: number;
    name: string;
    email: string;
    role: string;
    avatarUrl?: string;
}
