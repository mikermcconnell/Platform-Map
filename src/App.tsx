// import React from 'react';
import MapDisplay from './components/MapDisplay';
import DebugConsole from './components/DebugConsole';
import ErrorBoundary from './components/ErrorBoundary';

function App() {
    console.log("App: Render Cycle Started");
    return (
        <ErrorBoundary>
            <div className="w-full h-screen bg-black relative">
                <MapDisplay />
                <DebugConsole />
            </div>
        </ErrorBoundary>
    );
}

export default App;
