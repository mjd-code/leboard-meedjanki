"use client";

import React, { useEffect, useState } from "react";
import { Avatar as ShadcnAvatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { ImageIcon, User as UserIcon } from "lucide-react";

export type ImageFallbackVariant = "avatar" | "logo" | "generic";

export interface ImageFallbackProps
  extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, "src"> {
  src?: string | null;
  alt: string;
  variant?: ImageFallbackVariant;
  fallback?: React.ReactNode;
  wrapperClassName?: string;
}

export function dicebearAvatar(seed: string | undefined | null): string {
  const safeSeed = encodeURIComponent((seed ?? "student").trim() || "student");
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${safeSeed}&backgroundColor=b6e3f4,d1d4f9,c0aede,ffd5dc,ffdfbf`;
}

export function ImageFallback({
  src,
  alt,
  variant = "generic",
  fallback,
  className = "",
  wrapperClassName = "",
  onLoad,
  onError,
  ...rest
}: ImageFallbackProps) {
  const cleanSrc = typeof src === "string" && src.trim() !== "" ? src : null;

  const [status, setStatus] = useState<"loading" | "loaded" | "error">(
    cleanSrc ? "loading" : "error",
  );

  useEffect(() => {
    setStatus(cleanSrc ? "loading" : "error");
  }, [cleanSrc]);

  return (
    <ShadcnAvatar 
      className={`rounded-full overflow-hidden shrink-0 ${wrapperClassName} ${className}`}
    >
      {cleanSrc && status !== "error" && (
        <AvatarImage
          src={cleanSrc}
          alt={alt}
          className={`${status === "loading" ? "bg-muted" : ""} object-cover`}
          onLoad={(e) => {
            setStatus("loaded");
            onLoad?.(e);
          }}
          onError={(e) => {
            setStatus("error");
            onError?.(e);
          }}
          {...rest}
        />
      )}
      {(!cleanSrc || status === "error") && (
        <AvatarFallback className="bg-secondary text-muted-foreground flex items-center justify-center rounded-full h-full w-full">
          {fallback ?? <PlaceholderGlyph variant={variant} />}
        </AvatarFallback>
      )}
    </ShadcnAvatar>
  );
}

function PlaceholderGlyph({ variant }: { variant: ImageFallbackVariant }) {
  if (variant === "avatar") return <UserIcon className="w-1/2 h-1/2 opacity-60" />;
  if (variant === "logo") return <ImageIcon className="w-1/2 h-1/2 opacity-60" />;
  return <ImageIcon className="w-1/2 h-1/2 opacity-60" />;
}

export default ImageFallback;
