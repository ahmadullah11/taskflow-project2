"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  ClipboardPaste,
  ImagePlus,
  Loader2,
  RefreshCw,
  Trash2,
} from "lucide-react";
import {
  IMAGE_ACCEPT_ATTRIBUTE,
  compressImageFile,
  estimateDataUrlBytes,
  formatFileSize,
} from "@/lib/image-utils";

interface TaskImageUploadProps {
  value?: string | null;
  onChange: (value: string | null) => void;
  disabled?: boolean;
}

/**
 * Screenshot/reference-image picker used by the Create and Edit task modals.
 * Supports click-to-browse, drag & drop, and Ctrl+V clipboard paste. Images are
 * compressed in the browser before they are placed in form state.
 */
export default function TaskImageUpload({
  value,
  onChange,
  disabled = false,
}: TaskImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const processFile = async (file: File) => {
    if (disabled) return;
    setError(null);
    setProcessing(true);
    try {
      const dataUrl = await compressImageFile(file);
      onChange(dataUrl);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not process that image."
      );
    } finally {
      setProcessing(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  // Clipboard screenshot paste (Ctrl+V / Cmd+V) while the modal is open.
  useEffect(() => {
    if (disabled) return;

    const handlePaste = (event: ClipboardEvent) => {
      const items = event.clipboardData?.items;
      if (!items || items.length === 0) return;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.kind === "file" && item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) {
            event.preventDefault();
            void processFile(file);
            return;
          }
        }
      }
    };

    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disabled]);

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    if (disabled) return;
    const file = event.dataTransfer.files?.[0];
    if (file) void processFile(file);
  };

  const attachedSizeLabel =
    value && value.startsWith("data:")
      ? formatFileSize(estimateDataUrlBytes(value))
      : "Linked image";

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <label className="text-xs font-semibold text-slate-700">
          Attach Reference Image / Screenshot
        </label>
        <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
          Optional
        </span>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={IMAGE_ACCEPT_ATTRIBUTE}
        className="hidden"
        disabled={disabled}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void processFile(file);
        }}
      />

      {value ? (
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt="Attached reference screenshot preview"
            className="h-40 w-full object-cover sm:h-44"
          />
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-slate-950/90 via-slate-950/60 to-transparent px-3 py-2.5">
            <span className="min-w-0 truncate text-[11px] font-semibold text-white/90">
              Screenshot attached · {attachedSizeLabel}
            </span>
            <div className="flex shrink-0 items-center gap-1.5">
              <button
                type="button"
                disabled={disabled || processing}
                onClick={() => inputRef.current?.click()}
                className="inline-flex items-center gap-1 rounded-lg bg-white/15 px-2 py-1 text-[10px] font-bold text-white backdrop-blur-sm transition-colors hover:bg-white/25 disabled:opacity-50"
              >
                <RefreshCw className="h-3 w-3" />
                <span>Replace</span>
              </button>
              <button
                type="button"
                disabled={disabled || processing}
                onClick={() => onChange(null)}
                className="inline-flex items-center gap-1 rounded-lg bg-rose-500/90 px-2 py-1 text-[10px] font-bold text-white backdrop-blur-sm transition-colors hover:bg-rose-600 disabled:opacity-50"
              >
                <Trash2 className="h-3 w-3" />
                <span>Remove</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div
          onDragOver={(event) => {
            event.preventDefault();
            if (!disabled) setIsDragging(true);
          }}
          onDragLeave={(event) => {
            event.preventDefault();
            setIsDragging(false);
          }}
          onDrop={handleDrop}
          className={`rounded-2xl border-2 border-dashed p-4 transition-colors ${
            isDragging
              ? "border-indigo-400 bg-indigo-50/80"
              : "border-slate-200 bg-slate-50/60 hover:border-indigo-300 hover:bg-indigo-50/40"
          } ${disabled ? "opacity-60" : ""}`}
        >
          <button
            type="button"
            disabled={disabled || processing}
            onClick={() => inputRef.current?.click()}
            className="flex w-full flex-col items-center justify-center gap-1.5 text-center disabled:cursor-not-allowed"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-indigo-100 bg-white text-indigo-600 shadow-xs">
              {processing ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <ImagePlus className="h-5 w-5" />
              )}
            </span>
            <span className="text-xs font-bold text-slate-700">
              {processing
                ? "Compressing image..."
                : isDragging
                  ? "Drop the image here"
                  : "Click to upload or drag & drop"}
            </span>
            <span className="text-[11px] leading-snug text-slate-400">
              PNG, JPG, WEBP up to 5MB
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-indigo-500">
              <ClipboardPaste className="h-3 w-3" />
              <span>Or paste a screenshot with Ctrl+V</span>
            </span>
          </button>
        </div>
      )}

      {error && (
        <p className="text-[11px] font-medium text-rose-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}