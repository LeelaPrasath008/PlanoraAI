import React, { useId } from 'react';

interface EventArtworkProps {
  type: string;
  className?: string;
}

/**
 * Bespoke vector editorial illustration component for each event category.
 * Uses accessible SVG role="img" and aria-labelledby linked to <title> and <desc>.
 */
export const EventArtwork: React.FC<EventArtworkProps> = React.memo(({ type, className = '' }) => {
  const uid = useId();
  const titleId = `${uid}-art-title`;
  const descId = `${uid}-art-desc`;
  const normalized = type.toLowerCase();

  if (normalized.includes('wedding') || normalized.includes('anniversary') || normalized.includes('bridal')) {
    return (
      <svg
        viewBox="0 0 400 180"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`w-full h-full object-cover ${className}`}
        role="img"
        aria-labelledby={`${titleId} ${descId}`}
      >
        <title id={titleId}>{type} Architectural Archway Artwork</title>
        <desc id={descId}>Editorial illustration of a ceremonial archway with interlocking rings and starlight accents.</desc>
        <rect width="400" height="180" fill="#F4EFE6" />
        <circle cx="330" cy="40" r="95" fill="#EAE2D3" opacity="0.7" />
        <circle cx="70" cy="150" r="80" fill="#E5DEC9" opacity="0.6" />
        <path d="M145 180V85C145 54.6243 169.624 30 200 30C230.376 30 255 54.6243 255 85V180" stroke="#B8860B" strokeWidth="1.75" />
        <path d="M158 180V88C158 64.804 176.804 46 200 46C223.196 46 242 64.804 242 88V180" stroke="#2E5A44" strokeWidth="1.2" strokeDasharray="3 3" />
        <circle cx="191" cy="105" r="18" stroke="#B8860B" strokeWidth="1.75" />
        <circle cx="209" cy="105" r="18" stroke="#1F1C18" strokeWidth="1.5" />
        <path d="M135 140C148 128 160 120 172 118" stroke="#2E5A44" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="152" cy="126" r="4" fill="#2E5A44" opacity="0.8" />
        <circle cx="164" cy="121" r="3.5" fill="#B8860B" opacity="0.8" />
        <path d="M265 140C252 128 240 120 228 118" stroke="#2E5A44" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="248" cy="126" r="4" fill="#2E5A44" opacity="0.8" />
        <circle cx="236" cy="121" r="3.5" fill="#B8860B" opacity="0.8" />
        <path d="M200 62L202 68L208 70L202 72L200 78L198 72L192 70L198 68L200 62Z" fill="#B8860B" />
      </svg>
    );
  }

  if (normalized.includes('hackathon') || normalized.includes('conference') || normalized.includes('tech') || normalized.includes('product')) {
    return (
      <svg
        viewBox="0 0 400 180"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`w-full h-full object-cover ${className}`}
        role="img"
        aria-labelledby={`${titleId} ${descId}`}
      >
        <title id={titleId}>{type} Technical Grid Artwork</title>
        <desc id={descId}>Isometric network nodes and geometric circuit topology representing technology and innovation events.</desc>
        <rect width="400" height="180" fill="#EFECE4" />
        <g opacity="0.35" stroke="#CFC7B8" strokeWidth="0.75">
          <line x1="0" y1="36" x2="400" y2="36" />
          <line x1="0" y1="72" x2="400" y2="72" />
          <line x1="0" y1="108" x2="400" y2="108" />
          <line x1="0" y1="144" x2="400" y2="144" />
          <line x1="80" y1="0" x2="80" y2="180" />
          <line x1="160" y1="0" x2="160" y2="180" />
          <line x1="240" y1="0" x2="240" y2="180" />
          <line x1="320" y1="0" x2="320" y2="180" />
        </g>
        <polygon points="200,32 255,64 255,126 200,158 145,126 145,64" stroke="#1F1C18" strokeWidth="1.75" fill="#FAF7F2" fillOpacity="0.7" />
        <polygon points="200,52 238,74 238,116 200,138 162,116 162,74" stroke="#B8860B" strokeWidth="1.5" />
        <line x1="95" y1="95" x2="145" y2="95" stroke="#2E5A44" strokeWidth="1.75" />
        <line x1="255" y1="95" x2="305" y2="95" stroke="#2E5A44" strokeWidth="1.75" />
        <circle cx="95" cy="95" r="7" fill="#2E5A44" />
        <circle cx="305" cy="95" r="7" fill="#B8860B" />
        <circle cx="200" cy="95" r="10" fill="#1F1C18" />
        <circle cx="200" cy="95" r="4" fill="#FAF7F2" />
      </svg>
    );
  }

  if (normalized.includes('festival') || normalized.includes('cultural') || normalized.includes('charity') || normalized.includes('gala')) {
    return (
      <svg
        viewBox="0 0 400 180"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`w-full h-full object-cover ${className}`}
        role="img"
        aria-labelledby={`${titleId} ${descId}`}
      >
        <title id={titleId}>{type} Radiant Sunburst Artwork</title>
        <desc id={descId}>Warm editorial sunburst and amphitheater horizon representing cultural and gala gatherings.</desc>
        <rect width="400" height="180" fill="#F5EFE4" />
        <circle cx="200" cy="135" r="75" fill="#E8DEC8" />
        <circle cx="200" cy="135" r="52" stroke="#B8860B" strokeWidth="1.5" />
        <circle cx="200" cy="135" r="30" fill="#B8860B" fillOpacity="0.2" stroke="#B8860B" strokeWidth="1.5" />
        <line x1="200" y1="25" x2="200" y2="65" stroke="#B8860B" strokeWidth="1.5" />
        <line x1="125" y1="55" x2="152" y2="82" stroke="#1F1C18" strokeWidth="1.25" />
        <line x1="275" y1="55" x2="248" y2="82" stroke="#1F1C18" strokeWidth="1.25" />
        <line x1="90" y1="115" x2="125" y2="122" stroke="#2E5A44" strokeWidth="1.5" />
        <line x1="310" y1="115" x2="275" y2="122" stroke="#2E5A44" strokeWidth="1.5" />
        <path d="M40 155 Q200 120 360 155" stroke="#1F1C18" strokeWidth="1.75" fill="none" />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 400 180"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`w-full h-full object-cover ${className}`}
      role="img"
      aria-labelledby={`${titleId} ${descId}`}
    >
      <title id={titleId}>{type || 'Event'} Abstract Geometric Artwork</title>
      <desc id={descId}>Balanced geometric composition representing structured event planning.</desc>
      <rect width="400" height="180" fill="#F3EFE6" />
      <circle cx="115" cy="90" r="58" fill="#E5DEC9" />
      <rect x="175" y="42" width="110" height="96" rx="14" stroke="#1F1C18" strokeWidth="1.6" fill="#FAF7F2" fillOpacity="0.8" />
      <circle cx="265" cy="90" r="36" stroke="#B8860B" strokeWidth="1.75" fill="#B8860B" fillOpacity="0.12" />
      <path d="M90 125 L165 60 L225 115 L310 50" stroke="#2E5A44" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="165" cy="60" r="4.5" fill="#2E5A44" />
      <circle cx="225" cy="115" r="4.5" fill="#B8860B" />
    </svg>
  );
});
