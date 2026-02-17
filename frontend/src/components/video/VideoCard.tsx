import { Video } from '@/types';
import { formatDuration, formatRelativeTime } from '@/lib/utils';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface VideoCardProps {
    video: Video;
    onDelete?: (id: string) => void;
}

export default function VideoCard({ video, onDelete }: VideoCardProps) {
    return (
        <div className="group relative bg-[#161A21] border border-[#1D222B] rounded-xl overflow-hidden hover:border-accent/50 transition-all duration-300">
            {/* Thumbnail */}
            <Link href={`/video/${video.id}`}>
                <div className="relative aspect-video bg-gradient-to-br from-gray-800 to-gray-900 cursor-pointer">
                    {video.thumbnail_url ? (
                        <img
                            src={video.thumbnail_url}
                            alt="Video thumbnail"
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center">
                            <svg className="w-16 h-16 text-gray-700" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                            </svg>
                        </div>
                    )}

                    {/* Duration badge */}
                    {video.duration && (
                        <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/80 rounded text-xs font-medium text-white">
                            {formatDuration(video.duration)}
                        </div>
                    )}

                    {/* Play overlay */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                        <div className="w-16 h-16 bg-accent/0 group-hover:bg-accent/90 rounded-full flex items-center justify-center transition-all duration-300 scale-0 group-hover:scale-100">
                            <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                            </svg>
                        </div>
                    </div>
                </div>
            </Link>

            {/* Info */}
            <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                        <p className="text-sm text-gray-400">
                            {formatRelativeTime(new Date(video.created_at))}
                        </p>
                        {video.file_size && (
                            <p className="text-xs text-gray-500 mt-1">
                                {(video.file_size / (1024 * 1024)).toFixed(1)} MB • {video.resolution || '1080p'}
                            </p>
                        )}
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-2 mt-3">
                    <a
                        href={video.video_url}
                        download
                        className="flex-1 px-3 py-2 bg-[#1D222B] hover:bg-accent hover:text-white text-sm font-medium rounded-lg transition-colors text-center"
                    >
                        Download
                    </a>
                    {onDelete && (
                        <button
                            onClick={() => onDelete(video.id)}
                            className="px-3 py-2 bg-[#1D222B] hover:bg-red-600 text-sm font-medium rounded-lg transition-colors"
                        >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
