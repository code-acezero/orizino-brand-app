"use client";
import React from "react";

/**
 * Official brand marks on transparent backgrounds.
 * Use for provider cards (Facebook Pixel, Google Ads, Search Console, etc.).
 * Colors are the vendor's brand hex — do not theme.
 */
type Props = { className?: string };

export const FacebookGlyph: React.FC<Props> = ({ className = "w-7 h-7" }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden focusable="false">
    <path
      fill="#1877F2"
      d="M24 12.073C24 5.404 18.627 0 12 0S0 5.404 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.412c0-3.017 1.792-4.686 4.533-4.686 1.312 0 2.686.235 2.686.235v2.97h-1.514c-1.49 0-1.955.93-1.955 1.886v2.264h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073"
    />
    <path
      fill="#FFFFFF"
      d="m16.671 15.563.532-3.49h-3.328V9.81c0-.955.465-1.886 1.955-1.886h1.514v-2.97s-1.374-.235-2.686-.235c-2.741 0-4.533 1.669-4.533 4.686v2.661H7.078v3.49h3.047V24a12.09 12.09 0 0 0 3.75 0v-8.437z"
    />
  </svg>
);

export const GoogleGlyph: React.FC<Props> = ({ className = "w-7 h-7" }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden focusable="false">
    <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47a5.54 5.54 0 0 1-2.4 3.63v3.02h3.87c2.27-2.09 3.55-5.17 3.55-8.89"/>
    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.94-2.92l-3.87-3.02c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.28v3.11A11.997 11.997 0 0 0 12 24"/>
    <path fill="#FBBC05" d="M5.27 14.26A7.18 7.18 0 0 1 4.89 12c0-.79.14-1.55.38-2.26V6.63H1.28A11.995 11.995 0 0 0 0 12c0 1.94.47 3.77 1.28 5.37z"/>
    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.32 0 3.28 2.69 1.28 6.63l3.99 3.11C6.22 6.87 8.87 4.75 12 4.75"/>
  </svg>
);

export const GoogleSearchConsoleGlyph: React.FC<Props> = ({ className = "w-7 h-7" }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden focusable="false">
    <circle cx="10" cy="10" r="6" fill="none" stroke="#4285F4" strokeWidth="2.4"/>
    <line x1="14.5" y1="14.5" x2="20" y2="20" stroke="#EA4335" strokeWidth="2.4" strokeLinecap="round"/>
    <path d="M7 10 l2 2 l4-4" fill="none" stroke="#34A853" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const GoogleAnalyticsGlyph: React.FC<Props> = ({ className = "w-7 h-7" }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden focusable="false">
    <rect x="16" y="3" width="5" height="18" rx="2.5" fill="#F9AB00"/>
    <rect x="9.5" y="9" width="5" height="12" rx="2.5" fill="#E37400"/>
    <circle cx="5.5" cy="18.5" r="2.5" fill="#E37400"/>
  </svg>
);

export const MetaGlyph: React.FC<Props> = ({ className = "w-7 h-7" }) => (
  <svg viewBox="0 0 40 24" className={className} aria-hidden focusable="false">
    <defs>
      <linearGradient id="metaGrad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#0064E1"/>
        <stop offset="50%" stopColor="#0082FB"/>
        <stop offset="100%" stopColor="#7A3EE5"/>
      </linearGradient>
    </defs>
    <path fill="url(#metaGrad)" d="M6.5 4C3 4 1 7.5 1 12s2 8 5.5 8c2.6 0 4.4-1.7 6.6-4.7 2.4-3.3 3.3-4.6 4.6-4.6 1.4 0 2.2 1.3 2.2 3.6 0 2.4-.9 3.7-2.2 3.7-.9 0-1.6-.4-2.5-1.4l-1.6 2.5c1.3 1.4 2.7 2 4.4 2 3.5 0 5.5-3 5.5-7.6 0-4.7-2.1-7.5-5.5-7.5-2.7 0-4.5 1.7-6.7 4.8-2.3 3.2-3.2 4.5-4.5 4.5-1.3 0-2.1-1.3-2.1-3.6 0-2.3.8-3.6 2.1-3.6.8 0 1.5.4 2.3 1.3l1.6-2.5C10.4 4.7 8.9 4 6.5 4Z"/>
  </svg>
);

export const TikTokGlyph: React.FC<Props> = ({ className = "w-7 h-7" }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden focusable="false">
    <path fill="#25F4EE" d="M19.6 6.9c-1.5-.3-2.8-1.2-3.6-2.5v9.2a5.7 5.7 0 1 1-5.7-5.7c.3 0 .6 0 .9.1v3a2.7 2.7 0 1 0 1.9 2.6V2h2.9c.4 2.2 2.2 3.9 4.6 4v.9Z" transform="translate(-1 0)"/>
    <path fill="#FE2C55" d="M20.6 7.9c-1.5-.3-2.8-1.2-3.6-2.5v9.2a5.7 5.7 0 1 1-5.7-5.7c.3 0 .6 0 .9.1v3a2.7 2.7 0 1 0 1.9 2.6V3h2.9c.4 2.2 2.2 3.9 4.6 4v.9Z"/>
    <path fill="#000000" d="M20.1 7.4c-1.5-.3-2.8-1.2-3.6-2.5v9.2a5.7 5.7 0 1 1-5.7-5.7c.3 0 .6 0 .9.1v3a2.7 2.7 0 1 0 1.9 2.6V2.5h2.9c.4 2.2 2.2 3.9 4.6 4v.9Z"/>
  </svg>
);
// code:4ce0
