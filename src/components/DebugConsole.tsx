import React, { useState, useEffect } from 'react';

const DebugConsole: React.FC = () => {
    const [logs, setLogs] = useState<string[]>([]);
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        const originalLog = console.log;
        const originalWarn = console.warn;
        const originalError = console.error;

        const addLog = (type: string, args: any[]) => {
            const message = args.map(arg =>
                typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
            ).join(' ');
            setLogs(prev => [`[${type}] ${message}`, ...prev].slice(0, 50));
        };

        console.log = (...args) => {
            originalLog(...args);
            addLog('LOG', args);
        };

        console.warn = (...args) => {
            originalWarn(...args);
            addLog('WARN', args);
        };

        console.error = (...args) => {
            originalError(...args);
            addLog('ERROR', args);
        };

        window.onerror = (message, source, lineno, colno, error) => {
            addLog('WINDOW_ERROR', [`${message} at ${source}:${lineno}:${colno}`, error]);
            return false;
        };

        return () => {
            console.log = originalLog;
            console.warn = originalWarn;
            console.error = originalError;
        };
    }, []);

    if (!isVisible) return <button onClick={() => setIsVisible(true)} className="fixed bottom-0 right-0 bg-red-500 text-white p-2 z-50">Show Debug</button>;

    return (
        <div className="fixed bottom-0 left-0 w-full h-1/3 bg-black bg-opacity-80 text-green-400 font-mono text-xs overflow-y-auto z-50 p-2 border-t border-green-500 pointer-events-none">
            <div className="flex justify-between items-center sticky top-0 bg-black bg-opacity-90 p-1 border-b border-green-700 pointer-events-auto">
                <span>Debug Console</span>
                <div className="space-x-2">
                    <button onClick={() => setLogs([])} className="bg-gray-700 px-2 py-1 rounded">Clear</button>
                    <button onClick={() => setIsVisible(false)} className="bg-gray-700 px-2 py-1 rounded">Hide</button>
                </div>
            </div>
            <div className="mt-2">
                {logs.map((log, i) => (
                    <div key={i} className="border-b border-gray-800 py-0.5 break-words">
                        {log}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default DebugConsole;
