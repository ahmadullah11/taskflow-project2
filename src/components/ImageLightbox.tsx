"use client";

import React, { useEffect } from "react";
import { Download, X } from "lucide-react";

interface ImageLightboxProps {
  src?: string | null;
  alt?: string;
  onClose: () => void;
}

/**
 * Full-resolution viewer for task screenshots. Closes on backdrop click, the X
 * button, or Escape, and locks page scrolling while open.
 */
export default function ImageLightbox({
  src,
  alt = "Task screenshot",
  onClose,
}: ImageLightboxProps) {
  useEffect(() => {
    if (!src) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [src, onClose]);

  if (!src) return null;

  const isDataUrl = src.startsWith("data:");
  const extension = src.startsWith("data:image/png")
    ? "png"
    : src.startsWith("data:image/jpeg")
      ? "jpg"
      : "webp";

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm sm:p-8"
      role="dialog"
      aria-modal="true"
      aria-label={alt}
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close image preview"
        className="absolute right-3 top-3 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-md transition-colors hover:bg-white/20 sm:right-5 sm:top-5"
      >
        <X className="h-5 w-5" />
      </button>

      <div
        className="flex max-h-full w-full max-w-5xl flex-col items-center gap-3"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex max-h-[82vh] w-full items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-slate-900/60 shadow-2xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={alt}
            className="max-h-[82vh] w-auto max-w-full object-contain"
          />
        </div>

        <div className="flex w-full flex-wrap items-center justify-between gap-3 px-1">
          <p className="min-w-0 truncate text-xs font-medium text-white/70">
            {alt}
          </p>
          <a
            href={src}
            download={isDataUrl ? `task-screenshot.${extension}` : undefined}
            target={isDataUrl ? undefined : "_blank"}
            rel={isDataUrl ? undefined : "noreferrer"}
            className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-md transition-colors hover:bg-white/20"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Download</span>
          </a>
        </div>
      </div>
    </div>
  );
}