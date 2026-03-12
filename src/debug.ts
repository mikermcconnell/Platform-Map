// Global debug logger
// Must be imported before anything else

export interface LogEntry {
    type: string;
    message: string;
    timestamp: string;
}

const MAX_LOG_ENTRIES = 100;

const logs: LogEntry[] = [];
const listeners: ((logs: LogEntry[]) => void)[] = [];

const stringifyArg = (arg: unknown) => {
    if (arg instanceof Error) {
        return `${arg.name}: ${arg.message}`;
    }

    if (typeof arg === 'object' && arg !== null) {
        try {
            return JSON.stringify(arg);
        } catch {
            const constructorName = (arg as { constructor?: { name?: string } }).constructor?.name;
            return constructorName ? `[${constructorName}]` : '[object]';
        }
    }

    return String(arg);
};

const addLog = (type: string, args: unknown[]) => {
    const message = args.map(stringifyArg).join(' ');

    const entry = {
        type,
        message,
        timestamp: new Date().toISOString().split('T')[1].slice(0, 8)
    };

    logs.unshift(entry);
    if (logs.length > MAX_LOG_ENTRIES) logs.pop();

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
