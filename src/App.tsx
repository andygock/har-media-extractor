import React, { useCallback, useRef, useState } from "react";
import JSZip from "jszip";
import styles from "./App.module.css";

type MediaItem = {
  url: string;
  mimeType: string;
  name: string;
  encoding: "base64" | "utf8";
  raw: string;
};

// Simple hash function for uniqueness (djb2)
function shortHash(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) + hash + str.charCodeAt(i);
  }
  return Math.abs(hash).toString(36).slice(0, 6);
}

// Supported media types
const MEDIA_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
  "image/gif",
  "image/apng",
  "image/bmp",
  "image/x-icon",
  "image/vnd.microsoft.icon",
];

function getMediaFromHar(har: any): MediaItem[] {
  const entries = har?.log?.entries ?? [];
  const media: MediaItem[] = [];
  for (const entry of entries) {
    const resp = entry.response;
    const content = resp?.content;
    if (!content || !content.mimeType) continue;
    if (MEDIA_TYPES.includes(content.mimeType) && content.text) {
      let dataUrl;
      let encoding: "base64" | "utf8";
      if (content.encoding === "base64") {
        dataUrl = `data:${content.mimeType};base64,${content.text}`;
        encoding = "base64";
      } else {
        dataUrl = `data:${content.mimeType};charset=utf-8,${encodeURIComponent(
          content.text
        )}`;
        encoding = "utf8";
      }
      media.push({
        url: dataUrl,
        mimeType: content.mimeType,
        name: entry.request.url.split("/").pop()?.split("?")[0] || "media",
        encoding,
        raw: content.text,
      });
    }
  }
  return media;
}

function App() {
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [error, setError] = useState("");
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImg, setLightboxImg] = useState<MediaItem | null>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  const onDrop = useCallback(async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setError("");
    setMedia([]);
    const file = e.dataTransfer.files[0];
    if (!file || !file.name.endsWith(".har")) {
      setError("Please drop a valid .har file.");
      return;
    }
    try {
      const text = await file.text();
      let har;
      try {
        har = JSON.parse(text);
      } catch (err) {
        setError("Invalid HAR file: JSON parse error.");
        return;
      }
      const found = getMediaFromHar(har);
      if (found.length === 0) {
        setError("No media found in this HAR file.");
      }
      setMedia(found);
    } catch (err) {
      setError("Failed to read file.");
    }
  }, []);

  const onDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  }, []);

  const downloadAll = useCallback(async () => {
    const zip = new JSZip();
    media.forEach((item, i) => {
      const ext = item.mimeType.split("/")[1].split("+")[0];
      const base = item.name.replace(/[^a-zA-Z0-9._-]/g, "_") || `media_${i}`;
      const hash = shortHash(item.raw);
      const name = `${base}-${hash}.${ext}`;
      if (item.encoding === "base64") {
        // Decode base64 to Uint8Array for correct binary output
        const binary = atob(item.raw);
        const bytes = new Uint8Array(binary.length);
        for (let j = 0; j < binary.length; ++j) {
          bytes[j] = binary.charCodeAt(j);
        }
        zip.file(name, bytes);
      } else {
        zip.file(name, new TextEncoder().encode(item.raw));
      }
    });
    const blob = await zip.generateAsync({ type: "blob" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "media.zip";
    a.click();
    URL.revokeObjectURL(a.href);
  }, [media]);

  // Lightbox keyboard navigation handler
  React.useEffect(() => {
    if (!lightboxOpen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setLightboxOpen(false);
      } else if (
        (e.key === "ArrowLeft" || e.key === "ArrowRight") &&
        lightboxImg
      ) {
        const idx = media.findIndex((item) => item === lightboxImg);
        if (e.key === "ArrowLeft" && idx > 0) {
          setLightboxImg(media[idx - 1]);
        } else if (e.key === "ArrowRight" && idx < media.length - 1) {
          setLightboxImg(media[idx + 1]);
        }
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [lightboxOpen, lightboxImg, media]);

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>HAR Media Extractor</h1>
      <div
        ref={dropRef}
        onDrop={onDrop}
        onDragOver={onDragOver}
        className={styles.dropArea}
      >
        <div className={styles.dropLabel}>
          Drag & drop a <b>.har</b> file here
        </div>
        <div className={styles.dropHint}>
          Media (png, jpg, webp, svg, etc) will be extracted and shown below.
        </div>
      </div>
      {error && <div className={styles.error}>{error}</div>}
      {media.length > 0 && (
        <div className={styles.mediaSection}>
          <div className={styles.mediaHeader}>
            <div className={styles.mediaCount}>{media.length} media found</div>
            <button onClick={downloadAll} className={styles.downloadBtn}>
              Download all as zip
            </button>
          </div>
          <div className={styles.mediaGrid}>
            {media.map((item, i) => (
              <div key={i} className={styles.mediaItem}>
                <img
                  src={item.url}
                  alt={item.name}
                  className={styles.mediaImg}
                  style={{ cursor: "pointer" }}
                  onClick={() => {
                    setLightboxImg(item);
                    setLightboxOpen(true);
                  }}
                />
                <div className={styles.mediaName}>{item.name}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lightbox Modal */}
      {lightboxOpen && lightboxImg && (
        <div
          className={styles.lightboxOverlay}
          tabIndex={-1}
          aria-modal="true"
          role="dialog"
          onClick={() => setLightboxOpen(false)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            background: "rgba(0,0,0,0.85)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            cursor: "zoom-out",
          }}
        >
          <img
            src={lightboxImg.url}
            alt={lightboxImg.name}
            style={{
              maxWidth: "90vw",
              maxHeight: "90vh",
              boxShadow: "0 4px 32px #0008",
              background: "#fff",
              borderRadius: 8,
            }}
            onClick={() => setLightboxOpen(false)}
          />
        </div>
      )}
    </div>
  );
}

export default App;
