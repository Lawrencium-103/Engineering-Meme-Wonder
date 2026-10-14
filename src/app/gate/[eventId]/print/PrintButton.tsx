"use client";

/** Print trigger for the gate list — extracted so the page can stay a server component. */
export function PrintButton() {
  return (
    <button className="print-btn no-print" onClick={() => window.print()}>
      Print this list
    </button>
  );
}
