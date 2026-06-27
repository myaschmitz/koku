"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { useModalA11y } from "@/hooks/use-modal-a11y";

interface ImageGridProps {
  images: string[];
}

export function ImageGrid({ images }: ImageGridProps) {
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const lightboxRef = useModalA11y<HTMLDivElement>({
    open: lightboxUrl !== null,
    onEscape: () => setLightboxUrl(null),
  });

  if (images.length === 0) return null;

  return (
    <>
      <div className="flex flex-wrap gap-2 mt-3">
        {images.map((url) => (
          <button
            key={url}
            type="button"
            onClick={() => setLightboxUrl(url)}
            aria-label="View image full size"
            className="focus:outline-none focus:ring-2 focus:ring-accent-500 rounded-md"
          >
            {/* Arbitrary user-supplied Supabase URLs; next/image would require
                per-host remotePatterns config. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt=""
              className="h-24 w-24 rounded-md object-cover hover:opacity-80 transition-opacity"
            />
          </button>
        ))}
      </div>

      {/* Lightbox */}
      {lightboxUrl && (
        <div
          ref={lightboxRef}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          aria-label="Image preview"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 outline-none"
          onClick={() => setLightboxUrl(null)}
        >
          <button
            type="button"
            onClick={() => setLightboxUrl(null)}
            aria-label="Close image preview"
            className="absolute top-4 right-4 rounded-full bg-white/20 p-2 text-white hover:bg-white/30 transition-colors"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightboxUrl}
            alt=""
            className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
