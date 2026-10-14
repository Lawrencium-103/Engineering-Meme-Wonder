"use client";

import { useRef, useState } from "react";
import ReactSignatureCanvas from "react-signature-canvas";
import { uploadToCloudinary } from "./HeroUpload";

export function SignaturePad({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (url: string) => void;
}) {
  const padRef = useRef<ReactSignatureCanvas>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    const pad = padRef.current;
    if (!pad || pad.isEmpty()) {
      setError("Please sign first.");
      return;
    }
    setError("");
    setBusy(true);
    try {
      // Transparent PNG data URL.
      const dataUrl = pad.getTrimmedCanvas().toDataURL("image/png");
      const blob = await (await fetch(dataUrl)).blob();
      const url = await uploadToCloudinary(blob, "signature", `${label}.png`);
      onChange(url);
    } catch {
      setError("Could not upload signature — try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <p className="mb-2 text-sm text-rose-champagne/70">
        {label} {value && <span className="text-gold">✓ saved</span>}
      </p>
      {value ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={value} alt={`${label} signature`} className="h-20 w-auto" />
      ) : (
        <>
          <div className="border border-white/10 bg-white">
            <ReactSignatureCanvas
              ref={padRef}
              canvasProps={{ className: "w-full h-32" }}
              backgroundColor="rgba(255,255,255,0)"
              penColor="#0B0C10"
            />
          </div>
          <div className="mt-2 flex gap-4 text-xs">
            <button type="button" onClick={() => padRef.current?.clear()} className="text-rose-champagne/50 underline underline-offset-4">
              Clear
            </button>
            <button type="button" onClick={save} disabled={busy} className="text-gold underline underline-offset-4 disabled:opacity-50">
              {busy ? "Saving…" : "Save signature"}
            </button>
          </div>
        </>
      )}
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="mt-2 text-xs text-rose-champagne/50 underline underline-offset-4"
        >
          Re-sign
        </button>
      )}
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
}
