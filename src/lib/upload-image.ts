import type { SupabaseClient } from "@supabase/supabase-js";

/** Short random ID for filenames (8 chars, base36) */
function shortId() {
  return Math.random().toString(36).slice(2, 10);
}

/**
 * Uploads an image to Supabase storage and returns a short key
 * (e.g. "fBHXmx2W.png") rather than the full URL, to keep markdown clean.
 * Use `resolveImageUrl` to expand short keys back to full URLs at render time.
 */
export async function uploadImage(
  supabase: SupabaseClient,
  file: File,
  storagePath: string,
): Promise<string | null> {
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
      return null;
    }
  }

  const ext = processedFile.type === "image/png" ? "png" : "jpg";
  const filename = `${shortId()}.${ext}`;
  const path = `${storagePath}/${filename}`;

  const { error } = await supabase.storage
    .from("card-images")
    .upload(path, processedFile);

  if (error) return null;

  // Return just the storage path (storagePath/filename) as the short key
  return path;
}

/**
 * Resolves a short image key (storage path) to a full Supabase public URL.
 * If the src is already a full URL, returns it unchanged.
 */
export function resolveImageUrl(src: string): string {
  if (src.startsWith("http://") || src.startsWith("https://")) {
    return src;
  }
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return `${baseUrl}/storage/v1/object/public/card-images/${src}`;
}
