import React, { useState, useEffect } from 'react';
import { subscribeLogs, LogEntry } from '../debug';

const DebugConsole: React.FC = () => {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        console.log("User Agent:", navigator.userAgent);
        console.log("Promise support:", typeof Promise);
        return subscribeLogs(setLogs);
    }, []);

    if (!isVisible) return <button onClick={() => setIsVisible(true)} className="show-debug-btn">Show Debug</button>;

    return (
        <div className="debug-console">
            <div className="debug-header">
                <span className="debug-title">Debug Console</span>
                <div className="debug-controls">
                    <button onClick={() => console.log('Test Log Works')} className="debug-btn btn-blue">Test Log</button>
                    <button onClick={() => setIsVisible(false)} className="debug-btn btn-gray">Hide</button>
                </div>
            </div>
            <div style={{ marginTop: '8px' }}>
                {logs.map((log, i) => (
                    <div key={i} className="log-entry">
                        <span className="text-gray">[{log.timestamp}]</span> <span className={`font-bold ${log.type === 'ERROR' ? 'text-red' : log.type === 'WARN' ? 'text-yellow' : 'text-green'}`}>{log.type}</span>: {log.message}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default DebugConsole;
