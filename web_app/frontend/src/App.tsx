import { useState, useEffect } from 'react';
import { Terminal } from './components/Terminal';
import { DatasetManager } from './components/DatasetManager';
import { OutputBrowser } from './components/OutputBrowser';
import { SystemMonitor } from './components/SystemMonitor';
import { TrainingSettings } from './components/TrainingSettings';
import { Play, Settings, HardDrive, Activity, Database, LayoutDashboard, CheckCircle2, Square, Settings2 } from 'lucide-react';

function App() {
    const [status, setStatus] = useState<'idle' | 'running' | 'completed'>('idle');
    const [isInstalled, setIsInstalled] = useState(false);
    const [activeTab, setActiveTab] = useState<'dashboard' | 'dataset' | 'settings'>('dashboard');

    useEffect(() => {
        const checkStatus = async () => {
            try {
                const res = await fetch('/api/status');
                const data = await res.json();
                setIsInstalled(data.installed);
                if (data.running) {
                    setStatus('running');
                } else if (status === 'running') {
                    setStatus('idle'); // Process finished
                }
            } catch (e) {
                console.error("Failed to check status", e);
            }
        };

        const interval = setInterval(checkStatus, 2000);
        checkStatus(); // Initial check
        return () => clearInterval(interval);
    }, [status]);

    const startSetup = async () => {
        try {
            setStatus('running');
            await fetch('/api/start-setup', { method: 'POST' });
        } catch (err) {
            console.error('Failed to start setup:', err);
            setStatus('idle');
        }
    };

    const startTraining = async () => {
        try {
            setStatus('running');
            await fetch('/api/start-training', { method: 'POST' });
        } catch (err) {
            console.error('Failed to start training:', err);
            setStatus('idle');
        }
    };

    const stopTraining = async () => {
        try {
            await fetch('/api/stop-training', { method: 'POST' });
            // Status will be updated by polling
        } catch (err) {
            console.error('Failed to stop training:', err);
        }
    };

    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col">
            {/* Header */}
            <header className="border-b border-border p-4 flex items-center justify-between bg-card">
                <div className="flex items-center gap-2">
                    <Activity className="w-6 h-6 text-primary" />
                    <h1 className="text-xl font-bold">Chroma Trainer HD</h1>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setActiveTab('dashboard')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === 'dashboard' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
                    >
                        <LayoutDashboard className="w-4 h-4" /> Dashboard
                    </button>
                    <button
                        onClick={() => setActiveTab('dataset')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === 'dataset' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
                    >
                        <Database className="w-4 h-4" /> Dataset
                    </button>
                    <button
                        onClick={() => setActiveTab('settings')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === 'settings' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
                    >
                        <Settings2 className="w-4 h-4" /> Settings
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 p-6">

                {/* System Monitor (Always visible on dashboard) */}
                {activeTab === 'dashboard' && <SystemMonitor />}

                {activeTab === 'dashboard' ? (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Left Panel: Controls */}
                        <div className="lg:col-span-1 space-y-6 flex flex-col">

                            {/* Status Card */}
                            <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
                                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                    <Settings className="w-5 h-5" /> System Status
                                </h2>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                                        <span className="text-sm text-muted-foreground">Environment</span>
                                        <span className={`text-sm font-medium ${isInstalled ? 'text-green-400' : 'text-yellow-400'}`}>
                                            {isInstalled ? 'Ready' : 'Not Installed'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                                        <span className="text-sm text-muted-foreground">GPU</span>
                                        <span className="text-sm font-medium">RTX 4090</span>
                                    </div>
                                </div>
                            </div>

                            {/* Actions Card */}
                            <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
                                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                    <HardDrive className="w-5 h-5" /> Actions
                                </h2>
                                <div className="space-y-3">
                                    <button
                                        onClick={startSetup}
                                        disabled={status === 'running' || isInstalled}
                                        className={`w-full py-3 px-4 rounded-lg font-medium flex items-center justify-center gap-2 transition-all
                      ${isInstalled
                                                ? 'bg-green-500/10 text-green-500 cursor-default'
                                                : 'bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed'
                                            }`}
                                    >
                                        {isInstalled ? (
                                            <>
                                                <CheckCircle2 className="w-4 h-4" /> Installed
                                            </>
                                        ) : (
                                            <>
                                                <Play className="w-4 h-4" />
                                                {status === 'running' ? 'Installing...' : 'Install Models & Dependencies'}
                                            </>
                                        )}
                                    </button>

                                    {status === 'running' ? (
                                        <button
                                            onClick={stopTraining}
                                            className="w-full py-3 px-4 bg-destructive text-destructive-foreground rounded-lg font-medium hover:bg-destructive/90 flex items-center justify-center gap-2 animate-pulse"
                                        >
                                            <Square className="w-4 h-4 fill-current" /> Stop Process
                                        </button>
                                    ) : (
                                        <button
                                            onClick={startTraining}
                                            disabled={!isInstalled}
                                            className="w-full py-3 px-4 bg-secondary text-secondary-foreground rounded-lg font-medium hover:bg-secondary/80 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                        >
                                            Start Training
                                        </button>
                                    )}
                                </div>
                                {!isInstalled && (
                                    <p className="text-xs text-muted-foreground mt-4 text-center">
                                        Run installation first to unlock training controls.
                                    </p>
                                )}
                            </div>

                            {/* Output Browser (Visible only when installed) */}
                            {isInstalled && <OutputBrowser />}

                        </div>

                        {/* Right Panel: Terminal */}
                        <div className="lg:col-span-2 flex flex-col gap-4">
                            <div className="bg-card rounded-xl border border-border p-1 flex-1 shadow-sm min-h-[500px] flex flex-col">
                                <div className="px-4 py-2 border-b border-border/50 flex items-center justify-between">
                                    <span className="text-xs font-mono text-muted-foreground">terminal@vast-ai:~</span>
                                    <div className="flex gap-1.5">
                                        <div className="w-2.5 h-2.5 rounded-full bg-red-500/20"></div>
                                        <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/20"></div>
                                        <div className="w-2.5 h-2.5 rounded-full bg-green-500/20"></div>
                                    </div>
                                </div>
                                <div className="flex-1 p-1 relative">
                                    <Terminal />
                                </div>
                            </div>
                        </div>
                    </div>
                ) : activeTab === 'dataset' ? (
                    <div className="max-w-7xl mx-auto h-full">
                        {/* Use full height for dataset manager */}
                        <div className="bg-card rounded-xl border border-border p-6 shadow-sm h-[calc(100vh-8rem)] flex flex-col">
                            <DatasetManager />
                        </div>
                    </div>
                ) : (
                    <div className="max-w-4xl mx-auto h-full">
                        <TrainingSettings />
                    </div>
                )}

            </main>
        </div>
    );
}

export default App;
