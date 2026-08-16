"use client";
import React from "react";

export interface PaymentLogoProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  className?: string;
  alt?: string;
}

/**
 * Official bKash Logo
 */
export const BkashLogo: React.FC<PaymentLogoProps> = ({
  className = "w-full h-full object-cover",
  alt = "bKash",
  ...props
}) => (
  <img
    src="/payments/bkash.png"
    alt={alt}
    className={className}
    loading="lazy"
    {...props}
  />
);

/**
 * Official Nagad Logo
 */
export const NagadLogo: React.FC<PaymentLogoProps> = ({
  className = "w-full h-full object-cover",
  alt = "Nagad",
  ...props
}) => (
  <img
    src="/payments/nagad.png"
    alt={alt}
    className={className}
    loading="lazy"
    {...props}
  />
);

/**
 * Official DBBL Rocket Logo
 */
export const RocketLogo: React.FC<PaymentLogoProps> = ({
  className = "w-full h-full object-cover",
  alt = "Rocket",
  ...props
}) => (
  <img
    src="/payments/rocket.png"
    alt={alt}
    className={className}
    loading="lazy"
    {...props}
  />
);

/**
 * Official UCB Upay Logo
 */
export const UpayLogo: React.FC<PaymentLogoProps> = ({
  className = "w-full h-full object-cover",
  alt = "Upay",
  ...props
}) => (
  <img
    src="/payments/upay.png"
    alt={alt}
    className={className}
    loading="lazy"
    {...props}
  />
);

/**
 * Dynamic MFS Logo Component
 */
export const MFSLogo: React.FC<{
  method: "bKash" | "Nagad" | "Rocket" | "Upay" | "bkash" | "nagad" | "rocket" | "upay" | string;
  className?: string;
}> = ({ method, className = "w-full h-full object-cover" }) => {
  const norm = method?.toLowerCase() || "";
  if (norm === "bkash") return <BkashLogo className={className} />;
  if (norm === "nagad") return <NagadLogo className={className} />;
  if (norm === "rocket") return <RocketLogo className={className} />;
  if (norm === "upay") return <UpayLogo className={className} />;
  return (
    <div
      className={`w-full h-full rounded-full bg-primary/10 flex items-center justify-center font-bold text-xs text-primary ${className}`}
    >
      {method?.slice(0, 2)?.toUpperCase() || "MF"}
    </div>
  );
};
