"use client";
import * as React from "react";
import { Play } from "lucide-react";

/** Extract a YouTube video ID from any common YouTube URL shape. */
export function getYouTubeId(url: string | null | undefined): string | null {
  if (!url) return null;
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([\w-]{11})/,
    /(?:youtu\.be\/)([\w-]{11})/,
    /(?:youtube\.com\/embed\/)([\w-]{11})/,
    /(?:youtube\.com\/shorts\/)([\w-]{11})/,
  ];
  for (const re of patterns) {
    const m = url.match(re);
    if (m?.[1]) return m[1];
  }
  return null;
}

export function getYouTubeThumbnail(url: string | null | undefined): string | null {
  const id = getYouTubeId(url);
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
}

/** Returns true if the URL is a direct video file (mp4/webm/mov/ogg). */
export function isDirectVideoFile(url: string | null | undefined): boolean {
  if (!url) return false;
  return /\.(mp4|webm|mov|ogg|m4v)(\?.*)?$/i.test(url);
}

interface ProductVideoProps {
  url: string;
  title?: string;
  className?: string;
  /** When true, the player renders immediately. When false, shows a poster with a play button. */
  autoRender?: boolean;
  poster?: string | null;
}

/**
 * Renders a product video on the details page. Supports YouTube and direct
 * video files. Uses a click-to-play poster by default to avoid pulling in the
 * iframe/player on initial render.
 */
const ProductVideo: React.FC<ProductVideoProps> = ({ url, title, className = "", autoRender = false, poster }) => {
  const [playing, setPlaying] = React.useState(autoRender);
  const ytId = getYouTubeId(url);
  const isYouTube = !!ytId;
  const isDirect = !isYouTube && isDirectVideoFile(url);

  if (!isYouTube && !isDirect) {
    // Unsupported URL shape — offer a link as a graceful fallback.
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className={`block w-full aspect-video rounded-2xl bg-secondary/20 grid place-items-center text-sm text-muted-foreground ${className}`}
      >
        Open video
      </a>
    );
  }

  const posterSrc = poster || (isYouTube ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : undefined);

  if (!playing) {
    return (
      <button
        type="button"
        onClick={() => setPlaying(true)}
        aria-label={title ? `Play ${title} video` : "Play video"}
        className={`group relative w-full aspect-video rounded-2xl overflow-hidden bg-black ${className}`}
      >
        {posterSrc ? (
          <img
            src={posterSrc}
            alt={title ? `${title} preview` : "Video preview"}
            className="absolute inset-0 w-full h-full object-cover"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="absolute inset-0 bg-secondary/30" />
        )}
        <div className="absolute inset-0 bg-black/30 group-hover:bg-black/20 transition-colors" />
        <div className="absolute inset-0 grid place-items-center">
          <span className="flex items-center justify-center w-16 h-16 rounded-full bg-primary text-primary-foreground shadow-lg group-hover:scale-110 transition-transform">
            <Play className="w-7 h-7 ml-0.5 fill-current" />
          </span>
        </div>
      </button>
    );
  }

  if (isYouTube) {
    return (
      <div className={`w-full aspect-video rounded-2xl overflow-hidden bg-black ${className}`}>
        <iframe
          src={`https://www.youtube.com/embed/${ytId}?autoplay=1&rel=0&modestbranding=1`}
          title={title || "Product video"}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="w-full h-full"
        />
      </div>
    );
  }

  return (
    <video
      src={url}
      poster={posterSrc || undefined}
      controls
      autoPlay
      playsInline
      className={`w-full aspect-video rounded-2xl bg-black ${className}`}
    >
      Your browser does not support the video tag.
    </video>
  );
};

export default ProductVideo;
