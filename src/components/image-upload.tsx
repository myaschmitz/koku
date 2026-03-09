"use client";

import {
  useState,
  useRef,
  useCallback,
  useImperativeHandle,
  forwardRef,
} from "react";
import { createClient } from "@/lib/supabase/client";
import { ImagePlus, X, Loader2 } from "lucide-react";

interface ImageUploadProps {
  images: string[];
  onChange: (images: string[]) => void;
  userId: string;
  storagePath: string;
}

export interface ImageUploadHandle {
  processFiles: (files: File[]) => Promise<void>;
}

export const ImageUpload = forwardRef<ImageUploadHandle, ImageUploadProps>(
  function ImageUpload({ images, onChange, userId, storagePath }, ref) {
    const supabase = createClient();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);
    const [dragOver, setDragOver] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const uploadFile = useCallback(
      async (file: File) => {
        let processedFile = file;

        // HEIC conversion
        if (
          file.name?.toLowerCase().endsWith(".heic") ||
          file.type === "image/heic" ||
          file.type === "image/heif"
        ) {
          try {
            const heic2any = (await import("heic2any")).default;
            const blob = await heic2any({
              blob: file,
              toType: "image/jpeg",
              quality: 0.85,
            });
            processedFile = new File([blob as Blob], "converted.jpg", {
              type: "image/jpeg",
            });
          } catch {
            setError("Failed to convert HEIC image");
            return null;
          }
        }

        const ext = processedFile.type === "image/png" ? "png" : "jpg";
        const path = `${storagePath}/${crypto.randomUUID()}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from("card-images")
          .upload(path, processedFile);

        if (uploadError) {
          setError(`Upload failed: ${uploadError.message}`);
          return null;
        }

        const {
          data: { publicUrl },
        } = supabase.storage.from("card-images").getPublicUrl(path);

        return publicUrl;
      },
      [supabase, storagePath],
    );

    const processFiles = useCallback(
      async (files: File[]) => {
        const imageFiles = files.filter(
          (f) =>
            f.type.startsWith("image/") ||
            f.name?.toLowerCase().endsWith(".heic") ||
            f.name?.toLowerCase().endsWith(".heif"),
        );
        if (imageFiles.length === 0) return;

        setError(null);
        setUploading(true);

        const urls: string[] = [];
        for (const file of imageFiles) {
          const url = await uploadFile(file);
          if (url) urls.push(url);
        }

        if (urls.length > 0) {
          onChange([...images, ...urls]);
        }
        setUploading(false);
      },
      [images, onChange, uploadFile],
    );

    // Expose processFiles so CardForm can route pastes here
    useImperativeHandle(ref, () => ({ processFiles }), [processFiles]);

    const handleDrop = useCallback(
      async (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        const files = Array.from(e.dataTransfer.files);
        await processFiles(files);
      },
      [processFiles],
    );

    const handleFileInput = useCallback(
      async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files ?? []);
        await processFiles(files);
        e.target.value = "";
      },
      [processFiles],
    );

    const removeImage = useCallback(
      async (url: string) => {
        const match = url.match(/card-images\/(.+)$/);
        if (match) {
          await supabase.storage.from("card-images").remove([match[1]]);
        }
        onChange(images.filter((img) => img !== url));
      },
      [images, onChange, supabase],
    );

    return (
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`mt-2 rounded-lg border-2 border-dashed p-3 transition-colors ${
          dragOver
            ? "border-accent-500 bg-accent-50 dark:bg-accent-900/30"
            : "border-slate-300 dark:border-slate-600"
        }`}
      >
        {/* Thumbnails */}
        {images.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {images.map((url) => (
              <div key={url} className="relative group">
                <img
                  src={url}
                  alt=""
                  className="h-20 w-20 rounded-md object-cover"
                />
                <button
                  type="button"
                  aria-label="Remove image"
                  onClick={() => removeImage(url)}
                  className="absolute -top-1.5 -right-1.5 rounded-full bg-red-500 p-0.5 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Upload area */}
        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ImagePlus className="h-4 w-4" />
          )}
          <span>{uploading ? "Uploading..." : "Paste, drag & drop, or "}</span>
          {!uploading && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-accent-500 hover:text-accent-600 font-medium"
            >
              browse
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileInput}
            className="hidden"
            aria-label="Upload images"
          />
        </div>

        {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
      </div>
    );
  },
);
