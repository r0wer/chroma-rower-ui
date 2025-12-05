import { useState, useEffect } from 'react';
import { Save, RefreshCw, Settings2 } from 'lucide-react';

interface TrainingConfig {
    output_name: string;
    network_dim: number;
    network_alpha: number;
    max_train_steps: number;
    save_every_n_steps: number;
    learning_rate: number;
    resolution: number;
    num_repeats: number;
}

export function TrainingSettings() {
    const [config, setConfig] = useState<TrainingConfig | null>(null);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const fetchConfig = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/training-config');
            if (res.ok) {
                setConfig(await res.json());
            }
        } catch (error) {
            console.error('Failed to fetch config:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchConfig();
    }, []);

    const handleSave = async () => {
        if (!config) return;
        setSaving(true);
        setMessage(null);
        try {
            const res = await fetch('/api/training-config', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(config),
            });
            const data = await res.json();
            if (data.status === 'success') {
                setMessage({ type: 'success', text: 'Settings saved successfully!' });
            } else {
                setMessage({ type: 'error', text: data.message || 'Failed to save settings' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Network error occurred' });
        } finally {
            setSaving(false);
            // Clear message after 3 seconds
            setTimeout(() => setMessage(null), 3000);
        }
    };

    const handleChange = (key: keyof TrainingConfig, value: string | number) => {
        if (!config) return;
        setConfig({ ...config, [key]: value });
    };

    if (loading && !config) {
        return <div className="p-8 text-center text-muted-foreground">Loading settings...</div>;
    }

    if (!config) return null;

    return (
        <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                    <Settings2 className="w-5 h-5" /> Training Configuration
                </h2>
                <button
                    onClick={fetchConfig}
                    disabled={loading || saving}
                    className="p-2 hover:bg-muted rounded-full transition-colors"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">LoRA Name (Output Name)</label>
                    <input
                        type="text"
                        value={config.output_name}
                        onChange={(e) => handleChange('output_name', e.target.value)}
                        className="w-full p-2 rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <p className="text-xs text-muted-foreground">The filename for your trained model.</p>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Resolution</label>
                    <input
                        type="number"
                        value={config.resolution}
                        onChange={(e) => handleChange('resolution', parseInt(e.target.value) || 0)}
                        className="w-full p-2 rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <p className="text-xs text-muted-foreground">Training resolution (e.g. 512, 768, 1024). Square aspect ratio.</p>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Num Repeats</label>
                    <input
                        type="number"
                        value={config.num_repeats}
                        onChange={(e) => handleChange('num_repeats', parseInt(e.target.value) || 0)}
                        className="w-full p-2 rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <p className="text-xs text-muted-foreground">Repeats per image. 10-20 for small datasets, 1-5 for large.</p>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Network Rank (Dim)</label>
                    <input
                        type="number"
                        value={config.network_dim}
                        onChange={(e) => handleChange('network_dim', parseInt(e.target.value) || 0)}
                        className="w-full p-2 rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <p className="text-xs text-muted-foreground">Higher rank = more capacity but larger file size (e.g. 16, 32, 64).</p>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Network Alpha</label>
                    <input
                        type="number"
                        value={config.network_alpha}
                        onChange={(e) => handleChange('network_alpha', parseFloat(e.target.value) || 0)}
                        className="w-full p-2 rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <p className="text-xs text-muted-foreground">Usually set to 1 or equal to Rank. Controls learning strength.</p>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Max Train Steps</label>
                    <input
                        type="number"
                        value={config.max_train_steps}
                        onChange={(e) => handleChange('max_train_steps', parseInt(e.target.value) || 0)}
                        className="w-full p-2 rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <p className="text-xs text-muted-foreground">Total number of training steps.</p>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Save Every N Steps</label>
                    <input
                        type="number"
                        value={config.save_every_n_steps}
                        onChange={(e) => handleChange('save_every_n_steps', parseInt(e.target.value) || 0)}
                        className="w-full p-2 rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <p className="text-xs text-muted-foreground">How often to save a checkpoint.</p>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Learning Rate</label>
                    <input
                        type="number"
                        step="0.0001"
                        value={config.learning_rate}
                        onChange={(e) => handleChange('learning_rate', parseFloat(e.target.value) || 0)}
                        className="w-full p-2 rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <p className="text-xs text-muted-foreground">Global learning rate (e.g. 1.0 for Prodigy).</p>
                </div>
            </div>

            <div className="mt-8 flex items-center justify-between">
                <div className="text-sm">
                    {message && (
                        <span className={message.type === 'success' ? 'text-green-500' : 'text-red-500'}>
                            {message.text}
                        </span>
                    )}
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-6 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2 transition-all"
                >
                    {saving ? (
                        <>Saving...</>
                    ) : (
                        <>
                            <Save className="w-4 h-4" /> Save Settings
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
