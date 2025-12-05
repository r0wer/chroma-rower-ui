import { useState, useEffect } from 'react';
import { Download, File, RefreshCw } from 'lucide-react';

interface OutputFile {
    name: string;
    size: number;
    modified: number;
}

export function OutputBrowser() {
    const [files, setFiles] = useState<OutputFile[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchFiles = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/outputs');
            const data = await res.json();
            setFiles(data.files);
        } catch (error) {
            console.error('Failed to fetch outputs:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFiles();
        const interval = setInterval(fetchFiles, 10000); // Auto-refresh every 10s
        return () => clearInterval(interval);
    }, []);

    const formatSize = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const formatDate = (timestamp: number) => {
        return new Date(timestamp * 1000).toLocaleString();
    };

    const handleDownload = (filename: string) => {
        window.location.href = `/api/download/${filename}`;
    };

    return (
        <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                    <File className="w-5 h-5" /> Output Models (LoRA)
                </h2>
                <button
                    onClick={fetchFiles}
                    disabled={loading}
                    className="p-2 hover:bg-muted rounded-full transition-colors"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {files.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                        No models found yet. Start training to generate outputs.
                    </div>
                ) : (
                    files.map((file) => (
                        <div
                            key={file.name}
                            className="flex items-center justify-between p-3 bg-muted/30 hover:bg-muted/60 rounded-lg transition-colors group"
                        >
                            <div className="flex flex-col min-w-0">
                                <span className="font-medium truncate text-sm" title={file.name}>
                                    {file.name}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                    {formatSize(file.size)} • {formatDate(file.modified)}
                                </span>
                            </div>
                            <button
                                onClick={() => handleDownload(file.name)}
                                className="p-2 bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground rounded-md transition-all opacity-0 group-hover:opacity-100"
                                title="Download"
                            >
                                <Download className="w-4 h-4" />
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
