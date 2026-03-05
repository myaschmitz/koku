"use client";

import { useState } from "react";
import { X } from "lucide-react";

interface ImageGridProps {
  images: string[];
}

export function ImageGrid({ images }: ImageGridProps) {
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  if (images.length === 0) return null;

  return (
    <>
      <div className="flex flex-wrap gap-2 mt-3">
        {images.map((url) => (
          <button
            key={url}
            type="button"
            onClick={() => setLightboxUrl(url)}
            className="focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-md"
          >
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setLightboxUrl(null)}
        >
          <button
            type="button"
            onClick={() => setLightboxUrl(null)}
            className="absolute top-4 right-4 rounded-full bg-white/20 p-2 text-white hover:bg-white/30 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
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
