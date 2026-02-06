import React, { useState, useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';

export const MasterClock = () => {
    const [time, setTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // Formateo de Hora (12h)
    const timeParts = time.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    }).split(' ');

    // Formateo de Fecha (Español)
    const dayName = time.toLocaleDateString('es-VE', { weekday: 'long' });
    const fullDate = time.toLocaleDateString('es-VE', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });

    // Lógica Dia/Noche
    const hour = time.getHours();
    const isDay = hour >= 6 && hour < 18;

    return (
        <div className="master-clock-container shrink-0">
            <style>
                {`
                .master-clock-card {
                  width: 280px;
                  height: 116px;
                  background: linear-gradient(to right, rgb(15, 23, 42), rgb(30, 41, 59));
                  border-radius: 1.5rem;
                  box-shadow: rgba(0,0,0,0.5) 5px 10px 40px;
                  display: flex;
                  color: white;
                  justify-content: center;
                  position: relative;
                  flex-direction: column;
                  cursor: pointer;
                  transition: all 0.3s ease-in-out;
                  overflow: hidden;
                  padding-left: 24px;
                  border: 1px solid rgba(255,255,255,0.05);
                }

                .master-clock-card:hover {
                  box-shadow: rgba(0,0,0,0.8) 5px 10px 50px;
                  border-color: rgba(16, 185, 129, 0.2);
                  transform: translateY(-2px);
                }

                .time-text {
                  font-size: 38px;
                  margin-top: 0px;
                  font-weight: 800;
                  font-family: 'Inter', sans-serif;
                  line-height: 1;
                }

                .time-sub-text {
                  font-size: 14px;
                  margin-left: 6px;
                  color: #10b981; /* Emerald 500 */
                  font-weight: 900;
                  text-transform: uppercase;
                }

                .day-text {
                  font-size: 11px;
                  margin-top: 8px;
                  font-weight: 600;
                  text-transform: capitalize;
                  color: #64748b; /* Slate 400 */
                  letter-spacing: 1px;
                  font-family: 'JetBrains Mono', monospace;
                }

                .status-icon-wrapper {
                  position: absolute;
                  right: 20px;
                  top: 20px;
                  width: 48px;
                  height: 48px;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                  opacity: 0.3;
                }

                .master-clock-card:hover .status-icon-wrapper {
                  opacity: 0.9;
                  transform: scale(1.1) rotate(5deg);
                }

                .custom-stars {
                  position: absolute;
                  top: -4px;
                  right: -4px;
                }

                .star-shape {
                  position: absolute;
                  background: white;
                  clip-path: polygon(50% 0%, 61% 35%, 100% 50%, 61% 65%, 50% 100%, 39% 65%, 0% 50%, 39% 35%);
                }
                `}
            </style>

            <div className="master-clock-card">
                <p className="time-text">
                    {timeParts[0]}
                    <span className="time-sub-text">{timeParts[1]}</span>
                </p>
                <p className="day-text">
                    {dayName}, {fullDate}
                </p>

                <div className="status-icon-wrapper">
                    {isDay ? (
                        <Sun size={32} className="text-amber-400 fill-amber-400/20 stroke-[2.5]" />
                    ) : (
                        <div className="relative">
                            <Moon size={32} className="text-white fill-white stroke-[2]" />
                            <div className="custom-stars">
                                {/* Estrella Grande */}
                                <div className="star-shape animate-pulse"
                                    style={{ width: '10px', height: '10px', top: '2px', right: '0px' }} />
                                {/* Estrella Pequeña */}
                                <div className="star-shape animate-pulse"
                                    style={{ width: '7px', height: '7px', top: '14px', right: '-8px', animationDelay: '0.6s' }} />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
