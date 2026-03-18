import { useState } from 'react';
import { useToastStore } from '@/store/toastStore';

export function useDropShare() {
    const addToast = useToastStore((s) => s.addToast);
    const [isDownloading, setIsDownloading] = useState(false);

    const downloadMedia = async (url: string, filename: string) => {
        try {
            setIsDownloading(true);
            const response = await fetch(url);
            if (!response.ok) throw new Error('Network response was not ok');
            const blob = await response.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(blobUrl);
            addToast({ type: 'success', title: 'Downloaded successfully', message: 'File has been saved to your device.' });
        } catch (error) {
            console.error('Download failed:', error);
            addToast({ type: 'error', title: 'Download failed', message: 'Could not download the file.' });
            // Fallback for CORS or direct link
            window.open(url, '_blank');
        } finally {
            setIsDownloading(false);
        }
    };

    const shareMedia = async (url: string, title: string = 'Check this out!') => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title,
                    url
                });
            } catch (error) {
                console.error('Error sharing:', error);
            }
        } else {
            try {
                await navigator.clipboard.writeText(url);
                addToast({ type: 'success', title: 'Link copied to clipboard!', message: 'You can now paste it anywhere.' });
            } catch (e) {
                addToast({ type: 'error', title: 'Failed to copy link.', message: 'Could not write to clipboard.' });
            }
        }
    };

    return { downloadMedia, shareMedia, isDownloading };
}
