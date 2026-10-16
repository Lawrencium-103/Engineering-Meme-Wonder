"use client";

import { useEffect, useState } from "react";
import { PromisePicker } from "./PromisePicker";

/**
 * Return-visit gift promise: if this browser already RSVP'd (sessionStorage),
 * show the picker on the invitation page again so the guest can add or edit
 * their promise later. Renders nothing otherwise.
 */
export function PromiseReturn({
  slug,
  groomName,
  brideName,
}: {
  slug: string;
  groomName: string;
  brideName: string;
}) {
  const [pass, setPass] = useState<{ publicToken: string; guestCode: string; slug?: string } | null>(null);

  useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem("av.pass");
      if (!raw) return;
      const data = JSON.parse(raw);
      if (!data?.publicToken) return;
      // Gate on slug when stored (new sessions); legacy entries show anyway.
      if (data.slug && data.slug !== slug) return;
      setPass(data);
    } catch {
      /* noop */
    }
  }, [slug]);

  if (!pass) return null;

  return (
    <section className="mx-auto max-w-xl px-6 pb-24">
      <PromisePicker
        publicToken={pass.publicToken}
        guestCode={pass.guestCode}
        groomName={groomName}
        brideName={brideName}
      />
    </section>
  );
}
