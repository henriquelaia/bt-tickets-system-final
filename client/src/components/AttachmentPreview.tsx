import { useState } from 'react';
import { X } from 'lucide-react';

interface ImagePreviewProps {
    src: string;
    alt: string;
    className?: string;
}

export function ImagePreview({ src, alt, className = '' }: ImagePreviewProps) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            <img
                src={src}
                alt={alt}
                className={`cursor-pointer hover:opacity-90 transition-opacity ${className}`}
                onClick={() => setIsOpen(true)}
            />

            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
                    onClick={() => setIsOpen(false)}
                >
                    <button
                        onClick={() => setIsOpen(false)}
                        className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
                    >
                        <X className="h-6 w-6" />
                    </button>
                    <img
                        src={src}
                        alt={alt}
                        className="max-w-full max-h-full object-contain"
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            )}
        </>
    );
}

interface AttachmentPreviewProps {
    url: string;
    name: string;
    className?: string;
}

export function AttachmentPreview({ url, name, className = '' }: AttachmentPreviewProps) {
    const isImage = name.match(/\.(jpg|jpeg|png|gif|webp)$/i);
    const isPdf = name.match(/\.pdf$/i);

    if (isImage) {
        return (
            <div className={`mt-2 ${className}`}>
                <ImagePreview
                    src={url}
                    alt={name}
                    className="max-w-sm rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{name}</p>
            </div>
        );
    }

    return (
        <a
            href={url}
            download={name}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-center text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:underline py-1 ${className}`}
        >
            {isPdf ? (
                <svg className="h-3 w-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
            ) : (
                <svg className="h-3 w-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
            )}
            {name}
        </a>
    );
}
