"use client";

import { useEffect, useRef, useState } from "react";
import type { StudioDraft } from "@/lib/studio-schema";

/**
 * Live flyer preview: posts the current Studio draft (in-memory, not saved)
 * to /api/flyer/preview on a debounce and shows the real rendered PNG.
 *
 * Lets the couple watch the actual card update as they change design or
 * colours, instead of saving first and visiting /preview. The render engine
 * is server-side, so this is just a debounced fetch + <img>.
 */
export function LivePreview({ draft }: { draft: StudioDraft }) {
  const [src, setSrc] = useState<string | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reqId = useRef(0);

  useEffect(() => {
    // Debounce so we don't render on every keystroke.
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      void run();
    }, 600);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft]);

  async function run() {
    const id = ++reqId.current;
    setState("loading");
    try {
      const res = await fetch("/api/flyer/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId: draft.flyer.templateId || "NG-004",
          monogram: draft.monogram,
          hashtag: draft.flyer.hashtag || undefined,
          groomName: draft.groomName || "Groom",
          brideName: draft.brideName || "Bride",
          timezone: draft.timezone,
          heroImageUrl: draft.heroImageUrl || null,
          theme: draft.theme,
          flyer: {
            families: draft.flyer.families,
            invitationMessage: draft.flyer.invitationMessage || undefined,
            palette: draft.flyer.palette.length > 0 ? draft.flyer.palette : undefined,
            scripture: draft.flyer.scripture || undefined,
            closingMessage: draft.flyer.closingMessage || undefined,
            rsvpContacts: draft.flyer.rsvpContacts.length > 0 ? draft.flyer.rsvpContacts : undefined,
          },
          ceremonies: draft.ceremonies
            .filter((c) => c.enabled && c.startsAt)
            .map((c) => ({
              kind: c.kind,
              venueName: c.venueName || "Venue",
              startsAt: c.startsAt,
            })),
        }),
      });
      // A newer request superseded this one — drop it.
      if (id !== reqId.current) return;
      if (!res.ok) {
        setState("error");
        return;
      }
      const data = (await res.json()) as { image?: string };
      if (id !== reqId.current) return;
      if (data.image) {
        setSrc(data.image);
        setState("idle");
      } else {
        setState("error");
      }
    } catch {
      if (id !== reqId.current) return;
      setState("error");
    }
  }

  return (
    <div className="border border-white/10 p-4">
      <p className="mb-3 text-xs uppercase tracking-wider text-rose-champagne/60">Live preview</p>
      <div className="flex justify-center">
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt="Invitation card preview"
            className="w-full max-w-[280px] shadow-2xl"
          />
        ) : (
          <div className="flex h-[400px] w-full max-w-[280px] items-center justify-center border border-dashed border-white/10 text-xs text-rose-champagne/40">
            {state === "error" ? "Preview unavailable" : "Rendering…"}
          </div>
        )}
      </div>
      {state === "loading" && src && (
        <p className="mt-2 text-center text-[11px] text-rose-champagne/40">Updating…</p>
      )}
    </div>
  );
}
