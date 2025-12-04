// Global debug logger
// Must be imported before anything else

export interface LogEntry {
    type: string;
    message: string;
    timestamp: string;
}

const logs: LogEntry[] = [];
const listeners: ((logs: LogEntry[]) => void)[] = [];

const addLog = (type: string, args: any[]) => {
    const message = args.map(arg =>
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
    ).join(' ');

    const entry = {
        type,
        message,
        timestamp: new Date().toISOString().split('T')[1].slice(0, 8)
    };

    logs.unshift(entry);
    if (logs.length > 100) logs.pop();

    listeners.forEach(l => l([...logs]));
};

// Hook console immediately
const originalLog = console.log;
const originalWarn = console.warn;
const originalError = console.error;

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

export const getLogs = () => [...logs];
export const subscribeLogs = (listener: (logs: LogEntry[]) => void) => {
    listeners.push(listener);
    listener([...logs]);
    return () => {
        const index = listeners.indexOf(listener);
        if (index > -1) listeners.splice(index, 1);
    };
};
