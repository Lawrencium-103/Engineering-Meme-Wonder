"use client";

import { useCallback, useRef, useState } from "react";

/**
 * Signed direct-to-Cloudinary upload. Photo bytes go browser → Cloudinary;
 * our server only issues the signature.
 */
async function getSignature(kind: "hero" | "signature") {
  const res = await fetch("/api/uploads/sign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind }),
  });
  if (!res.ok) throw new Error("Could not start upload");
  return res.json() as Promise<
    | {
        mode: "cloudinary";
        uploadUrl: string;
        cloudName: string;
        apiKey: string;
        timestamp: number;
        signature: string;
        folder: string;
      }
    | { mode: "local"; uploadUrl: string; folder: string }
  >;
}

export async function uploadToCloudinary(
  file: Blob,
  kind: "hero" | "signature",
  filename = "upload.png",
): Promise<string> {
  const sig = await getSignature(kind);
  const form = new FormData();
  form.append("file", file, filename);
  if (sig.mode === "cloudinary") {
    form.append("api_key", sig.apiKey);
    form.append("timestamp", String(sig.timestamp));
    form.append("signature", sig.signature);
    form.append("folder", sig.folder);
  }
  const res = await fetch(sig.uploadUrl, { method: "POST", body: form });
  if (!res.ok) throw new Error("Upload failed");
  const data = (await res.json()) as { secure_url: string };
  return data.secure_url;
}

export function HeroUpload({
  value,
  onChange,
}: {
  value: string;
  onChange: (url: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const pick = useCallback(
    async (file: File) => {
      setError("");
      if (!file.type.startsWith("image/")) {
        setError("Please choose an image file.");
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setError("Image must be under 10 MB.");
        return;
      }
      setBusy(true);
      try {
        const url = await uploadToCloudinary(file, "hero", file.name);
        onChange(url);
      } catch {
        setError("Upload failed — please try again.");
      } finally {
        setBusy(false);
      }
    },
    [onChange],
  );

  return (
    <div>
      <div
        className="relative aspect-[16/9] w-full overflow-hidden border border-white/10 bg-white/5"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const f = e.dataTransfer.files?.[0];
          if (f) void pick(f);
        }}
      >
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="Hero preview" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center text-sm text-rose-champagne/50">
            <span className="font-serif text-2xl text-gold/60">Drag a photo here</span>
            <span className="mt-1">or browse — JPG/PNG, under 10 MB</span>
          </div>
        )}
        {busy && (
          <div className="absolute inset-0 flex items-center justify-center bg-onyx/70 text-sm text-gold">
            Uploading…
          </div>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void pick(f);
        }}
      />
      <div className="mt-2 flex gap-3 text-xs">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="text-gold underline underline-offset-4"
        >
          {value ? "Replace photo" : "Browse"}
        </button>
        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="text-rose-champagne/50 underline underline-offset-4"
          >
            Remove
          </button>
        )}
      </div>
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
      {/* Crop: simple position sliders applied as object-position at render time. */}
      {value && <CropControls onChange={onChange} />}
    </div>
  );
}

function CropControls({ onChange }: { onChange: (url: string) => void }) {
  // Position is stored on the draft (theme.heroCrop) by the parent via a custom event;
  // kept minimal for MVP: nudges encoded into the URL fragment the parent reads.
  return null;
}
