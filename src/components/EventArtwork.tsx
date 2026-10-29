import React from 'react';
import { EventType } from '../types/event';

interface EventArtworkProps {
  category: EventType;
  title: string;
  location: string;
  className?: string;
}

export const EventArtwork: React.FC<EventArtworkProps> = ({
  category,
  title,
  location,
  className = '',
}) => {
  const isWarmCourt =
    category === 'Wedding' ||
    category === 'Anniversary' ||
    category === 'Festival';
  const isCivic = category === 'Community' || category === 'College Event';

  return (
    <div
      className={`relative overflow-hidden bg-[#060913] select-none ${className}`}
      role="img"
      aria-label={`${category} celestial architectural illustration for ${title}`}
    >
      {isWarmCourt && (
        <svg
          viewBox="0 0 800 450"
          className="w-full h-full object-cover"
          preserveAspectRatio="xMidYMid slice"
        >
          <defs>
            <linearGradient id="pl-wed-sky" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#050814" />
              <stop offset="50%" stopColor="#0F172A" />
              <stop offset="100%" stopColor="#1E1B4B" />
            </linearGradient>
            <radialGradient id="pl-wed-glow" cx="0.65" cy="0.28" r="0.58">
              <stop offset="0%" stopColor="#22D3EE" stopOpacity="0.38" />
              <stop offset="45%" stopColor="#818CF8" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#050814" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="pl-starlight" cx="0.3" cy="0.25" r="0.45">
              <stop offset="0%" stopColor="#FDE68A" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#050814" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect width="800" height="450" fill="url(#pl-wed-sky)" />
          <rect width="800" height="450" fill="url(#pl-wed-glow)" />
          <rect width="800" height="450" fill="url(#pl-starlight)" />

          {/* Deep Space Orbital Rings & Constellation Arc */}
          <g stroke="#38BDF8" strokeOpacity="0.28" strokeWidth="1" fill="none">
            <ellipse cx="405" cy="155" rx="280" ry="72" strokeDasharray="5 5" />
            <ellipse cx="405" cy="155" rx="190" ry="46" />
          </g>

          {/* Starfield Nodes */}
          {[
            [110, 62],
            [215, 44],
            [340, 78],
            [495, 52],
            [625, 84],
            [715, 48],
            [155, 118],
            [660, 128],
          ].map(([sx, sy], idx) => (
            <circle
              key={idx}
              cx={sx}
              cy={sy}
              r={idx % 2 === 0 ? 2.2 : 1.5}
              fill={idx % 3 === 0 ? '#22D3EE' : '#FDE68A'}
              opacity="0.85"
            />
          ))}

          {/* Celestial Courtyard Arches */}
          <g stroke="#38BDF8" strokeOpacity="0.42" strokeWidth="1.5" fill="none">
            <path d="M90 450 L90 170 A90 90 0 0 1 270 170 L270 450" />
            <path d="M310 450 L310 150 A95 95 0 0 1 500 150 L500 450" />
            <path d="M540 450 L540 170 A90 90 0 0 1 720 170 L720 450" />
          </g>

          {/* Starlight Garland Swags */}
          {[180, 405, 630].map((cx, i) => (
            <g key={i}>
              <path
                d={`M${cx - 75} 180 Q${cx} 235 ${cx + 75} 180`}
                stroke="#22D3EE"
                strokeWidth="2"
                fill="none"
              />
              <circle cx={cx} cy="212" r="5" fill="#FDE68A" />
            </g>
          ))}

          {/* Orbital Horizon Perspective Grid */}
          <polygon
            points="160,450 285,325 535,325 660,450"
            fill="#0EA5E9"
            fillOpacity="0.12"
            stroke="#22D3EE"
            strokeOpacity="0.45"
            strokeWidth="1.2"
          />
        </svg>
      )}

      {!isWarmCourt && !isCivic && (
        <svg
          viewBox="0 0 800 450"
          className="w-full h-full object-cover"
          preserveAspectRatio="xMidYMid slice"
        >
          <defs>
            <linearGradient id="pl-bday-bg" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#040711" />
              <stop offset="55%" stopColor="#0B132B" />
              <stop offset="100%" stopColor="#0F2942" />
            </linearGradient>
          </defs>
          <rect width="800" height="450" fill="url(#pl-bday-bg)" />

          {/* Orbital Trajectory Curve */}
          <path
            d="M60 110 Q400 185 740 95"
            stroke="#22D3EE"
            strokeOpacity="0.5"
            strokeWidth="1.5"
            fill="none"
          />
          {[140, 230, 320, 410, 500, 590, 670].map((x, idx) => (
            <g key={idx}>
              <circle
                cx={x}
                cy={125 + Math.sin(idx) * 18}
                r="4"
                fill="#38BDF8"
              />
              <circle
                cx={x}
                cy={125 + Math.sin(idx) * 18}
                r="13"
                fill="#22D3EE"
                fillOpacity="0.22"
              />
            </g>
          ))}
          <polygon
            points="120,450 250,310 560,310 690,450"
            fill="#06B6D4"
            fillOpacity="0.14"
            stroke="#38BDF8"
            strokeOpacity="0.4"
            strokeWidth="1.4"
          />
        </svg>
      )}

      {isCivic && (
        <svg
          viewBox="0 0 800 450"
          className="w-full h-full object-cover"
          preserveAspectRatio="xMidYMid slice"
        >
          <defs>
            <linearGradient id="pl-civic-bg" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#040814" />
              <stop offset="55%" stopColor="#0D1B2A" />
              <stop offset="100%" stopColor="#1E1B4B" />
            </linearGradient>
          </defs>
          <rect width="800" height="450" fill="url(#pl-civic-bg)" />
          <g stroke="#34D399" strokeOpacity="0.4" strokeWidth="1.5" fill="none">
            <polygon points="80,195 400,70 720,195" />
            <line x1="160" y1="195" x2="160" y2="420" />
            <line x1="320" y1="195" x2="320" y2="420" />
            <line x1="480" y1="195" x2="480" y2="420" />
            <line x1="640" y1="195" x2="640" y2="420" />
          </g>
          {[200, 260, 360, 420, 520, 580].map((x, idx) => (
            <circle
              key={idx}
              cx={x}
              cy={220 + (idx % 2) * 6}
              r="4"
              fill="#22D3EE"
            />
          ))}
        </svg>
      )}

      {/* Measured contrast scrim */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#050814]/95 via-[#050814]/50 to-transparent" />

      <div className="absolute inset-x-0 bottom-0 p-5 flex items-end justify-between gap-4">
        <div className="min-w-0">
          <div className="text-xs text-cyan-300/90 mb-1 flex items-center gap-2 font-mono tabular-nums">
            <span>{category}</span>
            <span aria-hidden="true">·</span>
            <span className="truncate">{location}</span>
          </div>
          <p className="text-base font-semibold text-white font-display tracking-wide truncate">
            {title}
          </p>
        </div>
      </div>
    </div>
  );
};
