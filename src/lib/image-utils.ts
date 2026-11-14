/**
 * Shared image helpers for task screenshot attachments.
 *
 * Client: validates + compresses a picked/pasted image into a small WebP data
 * URL so mobile photos upload quickly and stay well under server payload limits.
 * Server: validates the value again before it is persisted to MongoDB.
 */

export const ACCEPTED_IMAGE_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
] as const;

export const IMAGE_ACCEPT_ATTRIBUTE = "image/png,image/jpeg,image/webp";
export const MAX_IMAGE_FILE_BYTES = 5 * 1024 * 1024; // 5MB

/** Hard cap for a stored value (~1.8MB of binary once base64 decoded). */
export const MAX_STORED_IMAGE_CHARS = 2_500_000;
/** Remote/public URLs are tiny compared to data URLs. */
const MAX_IMAGE_URL_CHARS = 2048;

const DATA_URL_PATTERN = /^data:image\/(png|jpe?g|webp);base64,[a-z0-9+/=\s]+$/i;

export type NormalizedTaskImage =
  | { valid: true; value: string | null | undefined }
  | { valid: false; error: string };

/**
 * Validates an `image` field coming from the API. `undefined` means the field
 * was omitted (leave the current value untouched); `null`/"" clears it.
 */
export function normalizeTaskImage(input: unknown): NormalizedTaskImage {
  if (input === undefined) {
    return { valid: true, value: undefined };
  }

  if (input === null || input === "") {
    return { valid: true, value: null };
  }

  if (typeof input !== "string") {
    return { valid: false, error: "Task image must be a string." };
  }

  const value = input.trim();

  if (!value) {
    return { valid: true, value: null };
  }

  if (value.length > MAX_STORED_IMAGE_CHARS) {
    return {
      valid: false,
      error: "Image is too large. Please attach an image under 5MB.",
    };
  }

  if (value.toLowerCase().startsWith("data:")) {
    if (!DATA_URL_PATTERN.test(value)) {
      return {
        valid: false,
        error: "Image must be a PNG, JPG, or WEBP data URL.",
      };
    }

    if (value.length > MAX_STORED_IMAGE_CHARS) {
      return {
        valid: false,
        error: "Image is too large. Please attach an image under 5MB.",
      };
    }

    return { valid: true, value };
  }

  // Allow already-hosted images (e.g. /uploads/screenshot.webp or a CDN URL).
  const isRelativeUpload = value.startsWith("/uploads/");
  const isHttpUrl = /^https?:\/\//i.test(value);

  if ((isRelativeUpload || isHttpUrl) && value.length <= MAX_IMAGE_URL_CHARS) {
    return { valid: true, value };
  }

  return {
    valid: false,
    error: "Image must be an uploaded file or a valid image URL.",
  };
}

export function isAcceptedImageFile(file: File): boolean {
  return (ACCEPTED_IMAGE_MIME_TYPES as readonly string[]).includes(file.type);
}

export function estimateDataUrlBytes(dataUrl: string): number {
  const commaIndex = dataUrl.indexOf(",");
  if (commaIndex === -1) return dataUrl.length;
  const base64Length = dataUrl.length - commaIndex - 1;
  return Math.round((base64Length * 3) / 4);
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () =>
      reject(new Error("Could not read that image. Please try again."));
    reader.readAsDataURL(file);
  });
}

function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () =>
      reject(new Error("That image could not be decoded. Please try another file."));
    img.src = src;
  });
}

interface CompressOptions {
  /** Longest side in pixels. Keeps screenshots readable while shrinking photos. */
  maxDimension?: number;
  /** Aim for this encoded size (base64 overhead is handled separately). */
  targetBytes?: number;
}

/**
 * Compress a user-selected image in the browser and return a self-contained
 * data URL. Screenshots stay sharp; large camera photos are downscaled.
 */
export async function compressImageFile(
  file: File,
  { maxDimension = 1600, targetBytes = 380 * 1024 }: CompressOptions = {}
): Promise<string> {
  if (!isAcceptedImageFile(file)) {
    throw new Error("Please choose a PNG, JPG, or WEBP image.");
  }

  if (file.size > MAX_IMAGE_FILE_BYTES) {
    throw new Error("Image is larger than 5MB. Please choose a smaller file.");
  }

  const source = await readFileAsDataUrl(file);
  const image = await loadImageElement(source);

  // Tiny screenshots/icons can be kept as-is when they are already light.
  if (
    estimateDataUrlBytes(source) <= targetBytes &&
    Math.max(image.width, image.height) <= maxDimension
  ) {
    return source;
  }

  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) {
    // Extremely old browsers: fall back to the original (still <= 5MB).
    return source;
  }

  let width = image.width;
  let height = image.height;
  const initialScale = Math.min(
    1,
    maxDimension / Math.max(image.width, image.height)
  );
  width = Math.max(1, Math.round(width * initialScale));
  height = Math.max(1, Math.round(height * initialScale));

  let quality = 0.86;
  let output = source;

  for (let attempt = 0; attempt < 7; attempt++) {
    canvas.width = width;
    canvas.height = height;

    // Fill white first so transparent PNG screenshots don't turn black if the
    // browser falls back to JPEG encoding.
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);

    output = canvas.toDataURL("image/webp", quality);

    // Browsers without WebP encoding silently return a PNG/JPEG data URL.
    // Fall back to JPEG explicitly so payloads stay small.
    if (!output.startsWith("data:image/webp")) {
      output = canvas.toDataURL("image/jpeg", quality);
    }

    if (estimateDataUrlBytes(output) <= targetBytes) {
      break;
    }

    quality = Math.max(0.5, quality - 0.08);

    // After a couple of quality reductions, start shrinking dimensions too.
    if (attempt % 2 === 1 && Math.max(width, height) > 640) {
      width = Math.max(1, Math.round(width * 0.82));
      height = Math.max(1, Math.round(height * 0.82));
    }
  }

  return output;
}