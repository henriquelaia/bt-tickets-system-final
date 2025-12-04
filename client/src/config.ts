// API Configuration
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Derive Base URL (remove /api if present) for WebSocket and Static Assets
export const BASE_URL = API_URL.replace(/\/api\/?$/, '');
export const WS_URL = BASE_URL; // WebSocket connects to root, not /api

// File upload constraints
export const FILE_UPLOAD = {
    MAX_SIZE: 5 * 1024 * 1024, // 5MB
    ALLOWED_TYPES: [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/gif',
        'image/webp',
        'application/pdf',
        'text/plain',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ],
    ALLOWED_EXTENSIONS: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf', 'txt', 'doc', 'docx', 'xls', 'xlsx']
};

// Helper function to validate file
export function validateFile(file: File): { valid: boolean; error?: string } {
    if (!file) {
        return { valid: false, error: 'Nenhum ficheiro selecionado' };
    }

    // Check file size
    if (file.size > FILE_UPLOAD.MAX_SIZE) {
        const sizeMB = (FILE_UPLOAD.MAX_SIZE / (1024 * 1024)).toFixed(0);
        return { valid: false, error: `Ficheiro muito grande. Máximo ${sizeMB}MB` };
    }

    // Check file type
    if (!FILE_UPLOAD.ALLOWED_TYPES.includes(file.type)) {
        return { valid: false, error: 'Tipo de ficheiro não permitido' };
    }

    // Check file extension
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (!extension || !FILE_UPLOAD.ALLOWED_EXTENSIONS.includes(extension)) {
        return { valid: false, error: 'Extensão de ficheiro não permitida' };
    }

    return { valid: true };
}

// Helper to format file size
export function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}
