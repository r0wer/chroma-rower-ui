import { useEffect, useRef } from 'react';
import { Terminal as XTerm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';

interface TerminalProps {
    wsUrl?: string;
}

export function Terminal({ wsUrl }: TerminalProps) {
    const defaultWsUrl = `ws://${window.location.host}/ws/terminal`;
    const finalWsUrl = wsUrl || defaultWsUrl;
    const terminalRef = useRef<HTMLDivElement>(null);
    const xtermRef = useRef<XTerm | null>(null);
    const wsRef = useRef<WebSocket | null>(null);

    useEffect(() => {
        if (!terminalRef.current) return;

        // Initialize xterm
        const term = new XTerm({
            cursorBlink: true,
            theme: {
                background: '#020817', // matches tailwind background
                foreground: '#f8fafc',
                cursor: '#f8fafc',
            },
            fontFamily: 'Menlo, Monaco, "Courier New", monospace',
            fontSize: 14,
        });

        const fitAddon = new FitAddon();
        term.loadAddon(fitAddon);

        term.open(terminalRef.current);
        fitAddon.fit();

        xtermRef.current = term;

        // Connect WebSocket
        const connect = () => {
            const ws = new WebSocket(finalWsUrl);

            ws.onopen = () => {
                term.writeln('\x1b[32m[Connected to backend]\x1b[0m');
            };

            ws.onmessage = (event) => {
                term.write(event.data);
            };

            ws.onclose = () => {
                term.writeln('\x1b[31m[Disconnected. Reconnecting in 3s...]\x1b[0m');
                setTimeout(connect, 3000);
            };

            ws.onerror = (err) => {
                console.error('WebSocket error:', err);
                ws.close();
            };

            wsRef.current = ws;
        };

        connect();

        // Handle resize
        const handleResize = () => fitAddon.fit();
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            if (wsRef.current) wsRef.current.close();
            term.dispose();
        };
    }, [finalWsUrl]);

    return (
        <div className="w-full h-full min-h-[400px] bg-background rounded-lg border border-border overflow-hidden p-2">
            <div ref={terminalRef} className="w-full h-full" />
        </div>
    );
}
