import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("[Supabase] Missing env vars - storage features disabled");
}

export const supabase = createClient(supabaseUrl || "", supabaseAnonKey || "");

// Storage bucket for ad images
const AD_IMAGES_BUCKET = "ad-images";

/**
 * Upload an image file to Supabase Storage
 * @param file - The image file to upload
 * @param walletAddress - The wallet address (for folder organization)
 * @returns The public URL of the uploaded image
 */
export async function uploadAdImage(
  file: File,
  walletAddress: string,
): Promise<string> {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase not configured");
  }

  // Generate unique filename
  const timestamp = Date.now();
  const fileExt = file.name.split(".").pop() || "png";
  const fileName = `${walletAddress.toLowerCase()}/${timestamp}.${fileExt}`;

  // Upload to Supabase Storage
  const { data, error } = await supabase.storage
    .from(AD_IMAGES_BUCKET)
    .upload(fileName, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (error) {
    console.error("[Supabase] Upload failed:", error);
    throw new Error(`Failed to upload image: ${error.message}`);
  }

  // Get public URL
  const { data: publicUrl } = supabase.storage
    .from(AD_IMAGES_BUCKET)
    .getPublicUrl(data.path);

  return publicUrl.publicUrl;
}

/**
 * Get the dimensions for a specific ad type
 */
export function getAdDimensions(adType: number): {
  width: number;
  height: number;
} {
  switch (adType) {
    case 0: // BANNER
      return { width: 728, height: 90 };
    case 1: // SQUARE
      return { width: 300, height: 300 };
    case 2: // SIDEBAR
      return { width: 300, height: 600 };
    case 3: // INTERSTITIAL
      return { width: 800, height: 600 };
    default:
      return { width: 728, height: 90 };
  }
}
