/**
 * Client-Side Upload Utility with Real-Time Progress, Mobile Image Compression,
 * Generous Timeout Protection, and Human-Friendly Error Messages.
 */

export interface UploadProgress {
  percent: number;
  loadedFormatted: string;
  totalFormatted: string;
}

export function formatBytes(bytes: number): string {
  if (!bytes || isNaN(bytes)) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Compresses an image file (JPEG, PNG, WEBP) using HTML5 Canvas in the browser.
 * Reduces raw 8-20MB phone/iPad camera photos down to ~800KB-1.5MB while maintaining crisp readability.
 */
export async function compressImageIfNeeded(file: File, maxDimension = 2048, quality = 0.85): Promise<File> {
  if (typeof window === "undefined" || !file || !file.type || !file.type.startsWith("image/") || file.type === "image/svg+xml") {
    return file;
  }
  // Only compress if file is larger than 2MB
  if (file.size <= 2 * 1024 * 1024) {
    return file;
  }

  return new Promise((resolve) => {
    try {
      const img = new Image();
      const url = URL.createObjectURL(file);

      img.onload = () => {
        try {
          URL.revokeObjectURL(url);
          let { width, height } = img;

          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }

          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            resolve(file);
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob(
            (blob) => {
              if (blob && blob.size < file.size) {
                const cleanName = file.name.replace(/\.[^.]+$/, ".jpg");
                const compressedFile = new File([blob], cleanName, {
                  type: "image/jpeg",
                  lastModified: Date.now(),
                });
                resolve(compressedFile);
              } else {
                resolve(file);
              }
            },
            "image/jpeg",
            quality
          );
        } catch {
          resolve(file);
        }
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(file);
      };

      img.src = url;
    } catch {
      resolve(file);
    }
  });
}

/**
 * Uploads a file to /api/upload with real-time upload progress tracking via XMLHttpRequest,
 * generous 10-minute timeout, and human-friendly error handling that prevents cryptic
 * Safari 'Load failed' errors.
 */
export async function uploadWithProgress(
  file: File,
  courseName: string,
  existingOldUrl?: string,
  sessionToken?: string,
  onProgress?: (progress: UploadProgress) => void
): Promise<{ url: string; path: string; folder?: string }> {
  // Auto-compress large images from mobile/iPad cameras
  const preparedFile = await compressImageIfNeeded(file);

  const formData = new FormData();
  formData.append("file", preparedFile);
  formData.append("course_name", courseName);
  if (existingOldUrl) {
    formData.append("oldUrl", existingOldUrl);
  }

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    // 10-minute timeout so large multi-page scans on slower connections don't drop prematurely
    xhr.timeout = 600000;

    if (xhr.upload && onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && e.total > 0) {
          const percent = Math.min(99, Math.round((e.loaded / e.total) * 100));
          onProgress({
            percent,
            loadedFormatted: formatBytes(e.loaded),
            totalFormatted: formatBytes(e.total),
          });
        }
      };
    }

    xhr.onload = () => {
      if (onProgress) {
        onProgress({
          percent: 100,
          loadedFormatted: formatBytes(preparedFile.size),
          totalFormatted: formatBytes(preparedFile.size),
        });
      }

      try {
        const data = JSON.parse(xhr.responseText || "{}");
        if (xhr.status >= 200 && xhr.status < 300 && data.url) {
          resolve(data);
        } else {
          reject(new Error(data.error || `Server returned status ${xhr.status}`));
        }
      } catch {
        if (xhr.status === 413) {
          reject(new Error(`File is too large (${formatBytes(preparedFile.size)}). Please compress your PDF or choose a smaller file.`));
        } else {
          reject(new Error(`Upload failed with server status ${xhr.status}. Please try again.`));
        }
      }
    };

    xhr.onerror = () => {
      reject(
        new Error(
          `Connection was interrupted or timed out while uploading (${formatBytes(preparedFile.size)}). If your PDF is large, try compressing it or connecting to a stable Wi-Fi network.`
        )
      );
    };

    xhr.ontimeout = () => {
      reject(
        new Error(
          `Upload timed out because the file (${formatBytes(preparedFile.size)}) took longer than 10 minutes to send. Please check your internet connection or compress the PDF.`
        )
      );
    };

    xhr.open("POST", "/api/upload");
    if (sessionToken) {
      xhr.setRequestHeader("Authorization", `Bearer ${sessionToken}`);
    }
    xhr.send(formData);
  });
}

/**
 * Translates low-level browser network errors (like Safari's 'Load failed') into friendly,
 * helpful guidance for students.
 */
export function humanizeUploadError(err: any, fileSize?: number): string {
  const rawMsg = String(err?.message || err || "").trim();
  const lower = rawMsg.toLowerCase();

  if (lower === "load failed" || lower.includes("failed to fetch") || lower.includes("network error") || lower.includes("network request failed")) {
    const sizeHint = fileSize ? ` (file size: ${formatBytes(fileSize)})` : "";
    return `The upload connection was interrupted or timed out${sizeHint}. If your file is a large scanned PDF, please compress it or switch to a stable Wi-Fi network, then try again.`;
  }

  if (lower.includes("timeout") || lower.includes("timed out")) {
    return "The upload timed out because your file is taking too long to send over your current internet connection. Try compressing your PDF to reduce its size.";
  }

  if (lower.includes("413") || lower.includes("too large")) {
    return "The file is too large for the server. Please compress your PDF to under 25 MB before uploading.";
  }

  return rawMsg || "There was an error uploading your file. Please try again.";
}
