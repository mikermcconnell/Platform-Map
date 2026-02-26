import React, { useState, useEffect } from 'react';

const formatTime = (date: Date): string => {
    const h = date.getHours();
    const m = date.getMinutes().toString().padStart(2, '0');
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    return `${hour12}:${m} ${ampm}`;
};

const formatDate = (date: Date): string => {
    const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    return `${days[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()}`;
};

const ClockDisplay: React.FC = () => {
    const [now, setNow] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    return (
        <div className="clock-display">
            <div className="clock-time">{formatTime(now)}</div>
            <div className="clock-date">{formatDate(now)}</div>
        </div>
    );
};

export default ClockDisplay;
