// frontend/src/utils/androidBridge.js
// Detects Android WebView JS bridge and exposes helpers for share/download

/** Returns true if running inside the SparkBill Android WebView */
export const isAndroidWebView = () =>
  typeof window !== "undefined" && typeof window.Android !== "undefined";

/**
 * Share a PDF blob via the Android native share sheet.
 * Falls back to Web Share API, then blob URL in new tab.
 */
export const sharePdfNative = (blob, filename, meta = {}) => {
  return new Promise((resolve, reject) => {
    // ── 1. Android WebView bridge ──────────────────────────────────────────
    if (isAndroidWebView()) {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const base64 = reader.result.split(",")[1];
          window.Android.sharePdf(base64, filename);
          resolve("bridge");
        } catch (e) {
          reject(e);
        }
      };
      reader.onerror = () => reject(new Error("FileReader failed"));
      reader.readAsDataURL(blob);
      return;
    }

    // ── 2. Web Share API (Chrome on Android / Safari iOS) ─────────────────
    const file = new File([blob], filename, { type: "application/pdf" });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      navigator
        .share({ files: [file], title: meta.title || "Invoice", text: meta.text || "" })
        .then(() => resolve("web-share"))
        .catch((e) => {
          if (e.name === "AbortError") resolve("cancelled");
          else reject(e);
        });
      return;
    }

    // ── 3. Fallback: open blob URL in new tab ──────────────────────────────
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
    resolve("blob-url");
  });
};

/**
 * Download PDF via Android bridge (saves to Downloads folder)
 * or browser <a download> fallback.
 */
export const downloadPdfNative = (blob, filename) => {
  return new Promise((resolve, reject) => {
    if (isAndroidWebView()) {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const base64 = reader.result.split(",")[1];
          window.Android.downloadPdf(base64, filename);
          resolve("bridge");
        } catch (e) {
          reject(e);
        }
      };
      reader.onerror = () => reject(new Error("FileReader failed"));
      reader.readAsDataURL(blob);
      return;
    }

    // Browser fallback
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    resolve("download-link");
  });
};