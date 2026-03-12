import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
        errorInfo: null
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error, errorInfo: null };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
        this.setState({ errorInfo });
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 9999,
                    overflow: 'auto',
                    padding: '32px',
                    backgroundColor: '#7f1d1d',
                    color: '#ffffff',
                    fontFamily: 'Arial, sans-serif',
                }}>
                    <h1 style={{ fontSize: '32px', fontWeight: 700, marginBottom: '16px' }}>
                        Something went wrong.
                    </h1>
                    <h2 style={{ fontSize: '22px', fontWeight: 600 }}>
                        {this.state.error?.toString()}
                    </h2>
                    <pre style={{
                        marginTop: '16px',
                        padding: '16px',
                        backgroundColor: '#000000',
                        borderRadius: '8px',
                        fontSize: '14px',
                        overflowX: 'auto',
                        whiteSpace: 'pre-wrap',
                    }}>
                        {this.state.errorInfo?.componentStack}
                    </pre>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
