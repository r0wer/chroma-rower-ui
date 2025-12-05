import { useState, useEffect, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Image as ImageIcon, RefreshCw, Loader2, Trash2 } from 'lucide-react';

interface DatasetItem {
    name: string;
    caption: string;
    has_caption: boolean;
}

export function DatasetManager() {
    const [items, setItems] = useState<DatasetItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);

    const fetchDataset = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/dataset');
            if (res.ok) {
                setItems(await res.json());
            }
        } catch (error) {
            console.error('Failed to fetch dataset:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDataset();
    }, []);

    const onDrop = useCallback(async (acceptedFiles: File[]) => {
        if (acceptedFiles.length === 0) return;
        setUploading(true);

        const formData = new FormData();
        acceptedFiles.forEach(file => {
            formData.append('files', file);
        });

        try {
            const res = await fetch('/api/upload-dataset', {
                method: 'POST',
                body: formData,
            });

            if (res.ok) {
                await fetchDataset();
            }
        } catch (error) {
            console.error('Upload failed:', error);
        } finally {
            setUploading(false);
        }
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

    const handleCaptionChange = (index: number, newCaption: string) => {
        const newItems = [...items];
        newItems[index].caption = newCaption;
        setItems(newItems);
    };

    const saveCaption = async (filename: string, caption: string) => {
        try {
            await fetch('/api/dataset/caption', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filename, caption }),
            });
        } catch (error) {
            console.error('Failed to save caption:', error);
        }
    };

    const deleteImage = async (filename: string) => {
        if (!confirm(`Are you sure you want to delete ${filename}?`)) return;
        try {
            const res = await fetch(`/api/dataset/image/${filename}`, {
                method: 'DELETE',
            });
            if (res.ok) {
                setItems(items.filter(i => i.name !== filename));
            }
        } catch (error) {
            console.error('Failed to delete image:', error);
        }
    };

    const deleteAll = async () => {
        if (!confirm('Are you sure you want to delete ALL images and captions? This cannot be undone.')) return;
        try {
            const res = await fetch('/api/dataset', {
                method: 'DELETE',
            });
            if (res.ok) {
                setItems([]);
            }
        } catch (error) {
            console.error('Failed to delete all:', error);
        }
    };

    return (
        <div className="space-y-6 h-full flex flex-col">
            {/* Header & Upload Area */}
            <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <h2 className="text-lg font-semibold flex items-center gap-2">
                            <ImageIcon className="w-5 h-5" /> Dataset Images
                        </h2>
                        <div className="flex gap-2 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500"></span> {items.length} images</span>
                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500"></span> {items.filter(i => i.caption).length} captioned</span>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        {items.length > 0 && (
                            <button
                                onClick={deleteAll}
                                className="p-2 text-destructive hover:bg-destructive/10 rounded-full transition-colors"
                                title="Delete All"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        )}
                        <button
                            onClick={fetchDataset}
                            disabled={loading}
                            className="p-2 hover:bg-muted rounded-full transition-colors"
                        >
                            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </div>

                <div
                    {...getRootProps()}
                    className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors
            ${isDragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/50'}`}
                >
                    <input {...getInputProps()} />
                    <div className="flex flex-col items-center gap-2">
                        {uploading ? (
                            <Loader2 className="w-8 h-8 text-primary animate-spin" />
                        ) : (
                            <Upload className={`w-8 h-8 ${isDragActive ? 'text-primary' : 'text-muted-foreground'}`} />
                        )}
                        <p className="text-sm font-medium">
                            {uploading ? "Uploading..." : (isDragActive ? "Drop files here..." : "Drag & drop images or captions (.txt) here")}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            Supports JPG, PNG, WEBP and TXT files
                        </p>
                    </div>
                </div>
            </div>

            {/* Grid */}
            <div className="flex-1 overflow-y-auto min-h-0 pr-2 custom-scrollbar">
                {items.length === 0 ? (
                    <div className="h-40 flex items-center justify-center text-muted-foreground">
                        No images found. Upload some to get started.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pb-4">
                        {items.map((item, index) => (
                            <div key={item.name} className="bg-card border border-border rounded-lg overflow-hidden flex flex-col shadow-sm group relative">
                                <div className="relative aspect-square bg-black/20">
                                    <img
                                        src={`/api/dataset/image/${item.name}`}
                                        alt={item.name}
                                        className="w-full h-full object-cover"
                                        loading="lazy"
                                    />
                                    <div className="absolute top-2 left-2">
                                        <div className={`w-2 h-2 rounded-full ${item.caption ? 'bg-green-500' : 'bg-red-500'} shadow-sm ring-1 ring-black/20`}></div>
                                    </div>
                                    <button
                                        onClick={() => deleteImage(item.name)}
                                        className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive"
                                        title="Delete"
                                    >
                                        <Trash2 className="w-3 h-3" />
                                    </button>
                                </div>

                                <div className="p-3 flex-1 flex flex-col gap-2 bg-card">
                                    <div className="text-xs font-mono text-muted-foreground truncate" title={item.name}>
                                        {item.name}
                                    </div>
                                    <textarea
                                        value={item.caption}
                                        onChange={(e) => handleCaptionChange(index, e.target.value)}
                                        onBlur={() => saveCaption(item.name, item.caption)}
                                        placeholder="Enter caption..."
                                        className="w-full h-24 text-xs p-2 rounded bg-muted/30 border border-border/50 focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none resize-none transition-colors"
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
