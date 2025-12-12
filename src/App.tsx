// import React from 'react';
import MapDisplay from './components/MapDisplay';
import ErrorBoundary from './components/ErrorBoundary';

function App() {
    return (
        <ErrorBoundary>
            <div className="map-container">
                <MapDisplay />
            </div>
        </ErrorBoundary>
    );
}

export default App;
