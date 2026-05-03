"use client";

import React, { useState } from "react";
import Image, { ImageProps } from "next/image";
import { cn } from "@/lib/utils";

export interface ImageWithFallbackProps extends Omit<ImageProps, "src" | "alt"> {
  src?: string | null;
  alt: string;
  fallbackType?: "skeleton" | "gradient" | "glass";
  containerClassName?: string;
}

export function ImageWithFallback({
  src,
  alt,
  fallbackType = "skeleton",
  containerClassName,
  className,
  ...rest
}: ImageWithFallbackProps) {
  const [status, setStatus] = useState<"loading" | "loaded" | "error">(
    src ? "loading" : "error"
  );

  const showFallback = !src || status === "error";

  return (
    <div
      className={cn(
        "relative overflow-hidden shrink-0 bg-muted",
        containerClassName
      )}
    >
      {/* Fallback Layer */}
      {showFallback && (
        <div
          className={cn(
            "absolute inset-0 w-full h-full flex flex-col items-center justify-center text-muted-foreground",
            {
              "animate-pulse bg-secondary": fallbackType === "skeleton",
              "bg-gradient-to-br from-primary/10 via-secondary to-primary/5":
                fallbackType === "gradient",
              "bg-background/50 backdrop-blur-md": fallbackType === "glass",
            }
          )}
        >
          <span className="text-xs font-medium uppercase tracking-wider opacity-50">
            {fallbackType === "skeleton" ? "" : alt.substring(0, 20)}
          </span>
        </div>
      )}

      {/* Main Image Layer */}
      {src && status !== "error" && (
        <Image
          src={src}
          alt={alt}
          className={cn(
            "object-cover transition-opacity duration-300",
            status === "loading" ? "opacity-0" : "opacity-100",
            className
          )}
          onLoad={(e) => {
            setStatus("loaded");
            if (rest.onLoad) rest.onLoad(e);
          }}
          onError={(e) => {
            setStatus("error");
            if (rest.onError) rest.onError(e);
          }}
          {...rest}
        />
      )}
    </div>
  );
}
