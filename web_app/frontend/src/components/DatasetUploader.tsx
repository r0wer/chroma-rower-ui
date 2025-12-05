import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, CheckCircle, XCircle, Loader2 } from 'lucide-react';

export function DatasetUploader() {
    const [uploading, setUploading] = useState(false);
    const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');

    const onDrop = useCallback(async (acceptedFiles: File[]) => {
        if (acceptedFiles.length === 0) return;

        setUploading(true);
        setUploadStatus('idle');
        setMessage('');

        const formData = new FormData();
        acceptedFiles.forEach(file => {
            formData.append('files', file);
        });

        try {
            const response = await fetch('/api/upload-dataset', {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();

            if (data.status === 'success') {
                setUploadStatus('success');
                setMessage(`Successfully uploaded ${acceptedFiles.length} files.`);
            } else {
                setUploadStatus('error');
                setMessage(data.message || 'Upload failed');
            }
        } catch (error) {
            setUploadStatus('error');
            setMessage('Network error occurred');
            console.error(error);
        } finally {
            setUploading(false);
        }
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

    return (
        <div className="h-full flex flex-col gap-4">
            <div
                {...getRootProps()}
                className={`
          flex-1 border-2 border-dashed rounded-xl flex flex-col items-center justify-center p-8 transition-colors cursor-pointer
          ${isDragActive ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50 hover:bg-muted/50'}
        `}
            >
                <input {...getInputProps()} />

                {uploading ? (
                    <div className="text-center space-y-3">
                        <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
                        <p className="text-lg font-medium">Uploading files...</p>
                    </div>
                ) : uploadStatus === 'success' ? (
                    <div className="text-center space-y-3">
                        <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
                        <p className="text-lg font-medium text-green-500">Upload Complete!</p>
                        <p className="text-muted-foreground">{message}</p>
                        <p className="text-sm text-muted-foreground mt-4">Drop more files to upload again</p>
                    </div>
                ) : uploadStatus === 'error' ? (
                    <div className="text-center space-y-3">
                        <XCircle className="w-12 h-12 text-destructive mx-auto" />
                        <p className="text-lg font-medium text-destructive">Upload Failed</p>
                        <p className="text-muted-foreground">{message}</p>
                        <p className="text-sm text-muted-foreground mt-4">Try again</p>
                    </div>
                ) : (
                    <div className="text-center space-y-3">
                        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                            <Upload className="w-8 h-8 text-muted-foreground" />
                        </div>
                        <p className="text-xl font-semibold">Drop dataset files here</p>
                        <p className="text-muted-foreground">or click to select files</p>
                        <div className="flex gap-2 justify-center mt-4">
                            <span className="px-2 py-1 bg-muted rounded text-xs text-muted-foreground">.jpg</span>
                            <span className="px-2 py-1 bg-muted rounded text-xs text-muted-foreground">.png</span>
                            <span className="px-2 py-1 bg-muted rounded text-xs text-muted-foreground">.txt</span>
                            <span className="px-2 py-1 bg-muted rounded text-xs text-muted-foreground">.zip</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
