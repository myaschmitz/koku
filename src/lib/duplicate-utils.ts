import type { SupabaseClient } from "@supabase/supabase-js";

/** Regex to find image references in markdown: ![alt](path) */
const IMAGE_REGEX = /!\[([^\]]*)\]\(([^)]+)\)/g;

/**
 * Extracts all image storage paths from markdown content.
 * Only returns paths that look like Supabase storage keys (not full URLs).
 */
function extractImagePaths(content: string): string[] {
  const paths: string[] = [];
  for (const match of content.matchAll(IMAGE_REGEX)) {
    const src = match[2];
    if (!src.startsWith("http://") && !src.startsWith("https://")) {
      paths.push(src);
    }
  }
  return paths;
}

/**
 * Copies an image in Supabase storage from one path to another.
 * Returns the new path on success, or null on failure.
 */
async function copyStorageFile(
  supabase: SupabaseClient,
  fromPath: string,
  toPath: string,
): Promise<string | null> {
  const { error } = await supabase.storage
    .from("card-images")
    .copy(fromPath, toPath);

  if (error) {
    console.error(`Failed to copy image ${fromPath} -> ${toPath}:`, error);
    return null;
  }
  return toPath;
}

/**
 * Duplicates all images referenced in card content to a new storage path,
 * and returns the updated content with new image references.
 *
 * @param supabase - Supabase client
 * @param content - The card's markdown content
 * @param newStoragePath - The new base path (e.g. "userId/newCardId")
 * @returns Updated content with image paths pointing to the copies
 */
export async function duplicateCardImages(
  supabase: SupabaseClient,
  content: string,
  newStoragePath: string,
): Promise<string> {
  const imagePaths = extractImagePaths(content);
  if (imagePaths.length === 0) return content;

  const pathMap = new Map<string, string>();

  await Promise.all(
    imagePaths.map(async (oldPath) => {
      if (pathMap.has(oldPath)) return;
      const filename = oldPath.split("/").pop() ?? oldPath;
      const newPath = `${newStoragePath}/${filename}`;
      const result = await copyStorageFile(supabase, oldPath, newPath);
      if (result) {
        pathMap.set(oldPath, result);
      }
    }),
  );

  let updatedContent = content;
  for (const [oldPath, newPath] of pathMap) {
    updatedContent = updatedContent.replaceAll(oldPath, newPath);
  }

  return updatedContent;
}
