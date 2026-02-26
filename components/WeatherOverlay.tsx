import React, { useMemo } from 'react';

export type WeatherType = 'none' | 'rain' | 'storm' | 'snow' | 'mist' | 'ash';

interface WeatherOverlayProps {
    type: WeatherType;
}

export const WeatherOverlay: React.FC<WeatherOverlayProps> = React.memo(({ type }) => {
    if (type === 'none') return null;

    // Base particle count
    const drops = useMemo(() => Array.from({ length: type === 'storm' ? 100 : 50 }), [type]);

    return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-20">

            {/* 
        ========================================================================
        RAIN & STORM
        ========================================================================
      */}
            {(type === 'rain' || type === 'storm') && (
                <div
                    className="absolute inset-0 mix-blend-screen"
                    style={type === 'storm' ? { animation: 'lightning 10s infinite' } : {}}
                >
                    {drops.map((_, i) => {
                        const delay = Math.random() * 2;
                        const duration = type === 'storm' ? (0.3 + Math.random() * 0.3) : (0.5 + Math.random() * 0.5);
                        const left = Math.random() * 140 - 20; // Allow starting further left due to angled wind
                        const isBright = Math.random() > 0.8;

                        return (
                            <div
                                key={`rain-${i}`}
                                className="absolute top-0 w-[2px] rounded-full"
                                style={{
                                    height: type === 'storm' ? '120px' : '60px',
                                    background: isBright
                                        ? 'linear-gradient(to bottom, transparent, rgba(255,255,255,0.9))'
                                        : 'linear-gradient(to bottom, transparent, rgba(255,255,255,0.4))',
                                    left: `${left}%`,
                                    animation: `${type === 'storm' ? 'stormfall' : 'rainfall'} ${duration}s linear ${delay}s infinite`,
                                }}
                            />
                        );
                    })}
                </div>
            )}

            {/* 
        ========================================================================
        SNOW (PARALLAX + SWAY)
        ========================================================================
      */}
            {type === 'snow' && (
                <div className="absolute inset-0 opacity-80 mix-blend-screen">
                    {drops.map((_, i) => {
                        // Determine depth layer (0 = background, 1 = midground, 2 = foreground)
                        const layer = Math.random() > 0.7 ? 2 : (Math.random() > 0.5 ? 1 : 0);

                        const delay = Math.random() * 5;
                        const fallDuration = (3 + Math.random() * 4) - (layer * 0.8); // Foreground falls faster
                        const swayDuration = 2 + Math.random() * 2;
                        const left = Math.random() * 120 - 10;
                        const size = (2 + Math.random() * 3) + (layer * 3); // Foreground is larger

                        return (
                            <div
                                key={`snow-${i}`}
                                className="absolute top-0"
                                style={{
                                    left: `${left}%`,
                                    animation: `snowfall ${fallDuration}s linear ${delay}s infinite`,
                                }}
                            >
                                <div
                                    className="bg-white rounded-full bg-blend-screen"
                                    style={{
                                        width: `${size}px`,
                                        height: `${size}px`,
                                        filter: layer === 0 ? 'blur(2px)' : layer === 1 ? 'blur(1px)' : 'none',
                                        opacity: layer === 0 ? 0.3 : layer === 1 ? 0.6 : 0.9,
                                        animation: `sway ${swayDuration}s ease-in-out ${delay}s infinite alternate`
                                    }}
                                />
                            </div>
                        );
                    })}
                </div>
            )}

            {/* 
        ========================================================================
        MIST (VOLUMETRIC CLOUDS)
        ========================================================================
      */}
            {type === 'mist' && (
                <div className="absolute inset-0 mix-blend-screen bg-blend-overlay opacity-60 flex items-center justify-center">
                    {/* Uses structural SVGs or CSS radial gradients simulating soft clouds */}
                    <div className="absolute w-[200%] h-[200%] bg-[url('https://www.transparenttextures.com/patterns/black-scales.png')] bg-repeat opacity-30"
                        style={{ animation: 'mistdrift 20s linear infinite' }} />
                    <div className="absolute w-[200%] h-[200%] bg-[url('https://www.transparenttextures.com/patterns/black-twill.png')] bg-repeat opacity-20 block mix-blend-overlay"
                        style={{ animation: 'mistdrift 35s linear infinite reverse' }} />
                    {/* Large soft rolling colored blobs simulating heavy fog volumes */}
                    <div className="absolute w-[150%] h-[150%] rounded-[100%] bg-white/10 blur-[50px] mix-blend-screen"
                        style={{ animation: 'mistdrift 25s ease-in-out infinite alternate' }} />
                    <div className="absolute w-[120%] h-[120%] rounded-[100%] bg-stone-200/5 blur-[40px] mix-blend-screen"
                        style={{ animation: 'mistdrift 30s ease-in-out infinite alternate-reverse' }} />
                </div>
            )}

            {/* 
        ========================================================================
        VOLCANIC ASH / EMBERS
        ========================================================================
      */}
            {type === 'ash' && (
                <div className="absolute inset-0 mix-blend-screen bg-red-900/10">
                    {drops.map((_, i) => {
                        const delay = Math.random() * 8;
                        const duration = 4 + Math.random() * 6;
                        const left = Math.random() * 100;
                        const size = 1 + Math.random() * 4;
                        const isEmber = Math.random() > 0.6;

                        return (
                            <div
                                key={`ash-${i}`}
                                className="absolute shadow-[0_0_10px_rgba(255,100,0,0.8)] rounded-full"
                                style={{
                                    left: `${left}%`,
                                    bottom: '0', // Start from bottom
                                    width: `${size}px`,
                                    height: `${size}px`,
                                    backgroundColor: isEmber ? '#ff8c00' : '#444',
                                    boxShadow: isEmber ? `0 0 ${size * 2}px #ff4500` : 'none',
                                    animation: `floatUp ${duration}s ease-in ${delay}s infinite`,
                                }}
                            >
                                <div style={{
                                    width: '100%', height: '100%',
                                    animation: `sway ${1 + Math.random() * 2}s ease-in-out ${delay}s infinite alternate`
                                }} />
                            </div>
                        );
                    })}
                </div>
            )}

        </div>
    );
});
