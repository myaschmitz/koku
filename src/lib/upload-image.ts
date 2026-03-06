import type { SupabaseClient } from "@supabase/supabase-js";

export async function uploadImage(
  supabase: SupabaseClient,
  file: File,
  storagePath: string
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
  const path = `${storagePath}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage
    .from("card-images")
    .upload(path, processedFile);

  if (error) return null;

  const {
    data: { publicUrl },
  } = supabase.storage.from("card-images").getPublicUrl(path);

  return publicUrl;
}
