import React from "react";
import { ShieldAlert } from "lucide-react";

export const Footer: React.FC = () => {
  return (
    <footer className="mt-12 py-6 border-t border-[var(--border-color)] text-center text-xs text-[var(--text-secondary)]">
      <div className="flex items-center justify-center gap-2 mb-1 text-emerald-400 font-semibold">
        <ShieldAlert className="w-4 h-4" />
        <span>100% Local Processing — Your Excel data never leaves this computer.</span>
      </div>
      <p className="text-[11px] text-slate-500">
        Schema-agnostic deterministic analytics engine • Zero telemetry • Zero AI/LLM calls • localhost:8000
      </p>
    </footer>
  );
};
