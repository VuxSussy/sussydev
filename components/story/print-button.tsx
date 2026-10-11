"use client";

import { Printer } from "lucide-react";

/** Opens the browser print dialog (print / save as PDF). */
export function PrintButton({ label }: { label: string }) {
  return (
    <button type="button" className="outline-button" onClick={() => window.print()}>
      <Printer aria-hidden="true" size={16} /> {label}
    </button>
  );
}
