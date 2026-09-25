import React, { useRef } from "react";
import type { UploadResponse } from "../types";
import { SCENE_NAMES } from "./Background3D";
import { Upload, RefreshCw, Sun, Moon, FileSpreadsheet, Layers, Sparkles } from "lucide-react";

interface HeaderProps {
  session: UploadResponse | null;
  onFileUpload: (file: File) => void;
  onSheetSelect: (sheetName: string) => void;
  onReset: () => void;
  theme: "dark" | "light";
  onToggleTheme: () => void;
  loading: boolean;
  active3DScene: number;
  on3DSceneSelect: (index: number) => void;
}

export const Header: React.FC<HeaderProps> = ({
  session,
  onFileUpload,
  onSheetSelect,
  onReset,
  theme,
  onToggleTheme,
  loading,
  active3DScene,
  on3DSceneSelect,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onFileUpload(e.target.files[0]);
    }
  };

  return (
    <header className="card-3d mb-6 p-4 md:p-5 border flex flex-col md:flex-row items-center justify-between gap-4 relative overflow-hidden">
      <div className="flex items-center gap-3 relative z-10">
        <div className="p-3 bg-gradient-to-br from-purple-600/30 to-fuchsia-600/20 text-fuchsia-400 rounded-2xl border border-fuchsia-500/40 shadow-lg shadow-fuchsia-500/20">
          <FileSpreadsheet className="w-8 h-8 drop-shadow-md" />
        </div>
        <div>
          <h1 className="text-xl md:text-2xl font-black tracking-tight text-[var(--text-primary)] bg-gradient-to-r from-fuchsia-400 via-purple-400 to-sky-400 bg-clip-text text-transparent">
            Offline Excel Visualizer
          </h1>
          <p className="text-xs text-[var(--text-secondary)] font-semibold flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            100% Local • 8 Dynamic 3D Scenes (30s Auto) • Glassmorphism
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {/* 3D Background Scene Selector Dropdown */}
        <div className="flex items-center gap-2 bg-[var(--bg-primary)] px-3 py-1.5 rounded-lg border border-purple-500/30 text-xs font-semibold text-purple-400">
          <Sparkles className="w-4 h-4 text-fuchsia-400 animate-pulse" />
          <span className="hidden lg:inline text-[var(--text-secondary)]">3D Scene:</span>
          <select
            value={active3DScene}
            onChange={(e) => on3DSceneSelect(Number(e.target.value))}
            className="bg-transparent font-bold text-[var(--text-primary)] focus:outline-none cursor-pointer"
          >
            {SCENE_NAMES.map((name, idx) => (
              <option key={name} value={idx} className="bg-[var(--bg-card)] text-[var(--text-primary)]">
                {idx + 1}. {name}
              </option>
            ))}
          </select>
        </div>
        {session && (
          <>
            {session.sheets.length > 1 && (
              <div className="flex items-center gap-2 bg-[var(--bg-primary)] px-3 py-1.5 rounded-lg border border-[var(--border-color)]">
                <Layers className="w-4 h-4 text-blue-400" />
                <span className="text-xs text-[var(--text-secondary)] font-semibold">Sheet:</span>
                <select
                  value={session.active_sheet}
                  onChange={(e) => onSheetSelect(e.target.value)}
                  className="bg-transparent text-sm font-medium text-[var(--text-primary)] focus:outline-none cursor-pointer"
                  disabled={loading}
                >
                  {session.sheets.map((sheet) => (
                    <option key={sheet} value={sheet} className="bg-[var(--bg-card)]">
                      {sheet}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--accent-light)] border border-[var(--accent-primary)] text-xs font-semibold text-[var(--accent-primary)]">
              <span>{session.filename}</span>
              <span>•</span>
              <span>{session.row_count.toLocaleString()} rows</span>
              <span>•</span>
              <span>{session.column_count} cols</span>
            </div>
          </>
        )}

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".xlsx, .xls"
          className="hidden"
        />

        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition cursor-pointer disabled:opacity-50"
        >
          <Upload className="w-4 h-4" />
          <span>{session ? "Change File" : "Upload Excel"}</span>
        </button>

        {session && (
          <button
            onClick={onReset}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 bg-slate-700/50 hover:bg-slate-700 text-[var(--text-primary)] border border-[var(--border-color)] rounded-lg text-sm font-medium transition cursor-pointer"
            title="Clear current session and reset"
          >
            <RefreshCw className="w-4 h-4" />
            <span className="hidden sm:inline">Reset</span>
          </button>
        )}

        <button
          onClick={onToggleTheme}
          className="p-2 bg-slate-700/40 hover:bg-slate-700 text-[var(--text-primary)] border border-[var(--border-color)] rounded-lg transition cursor-pointer"
          title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
        >
          {theme === "dark" ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
        </button>
      </div>
    </header>
  );
};
