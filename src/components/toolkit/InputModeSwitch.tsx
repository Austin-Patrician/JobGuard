"use client";

import clsx from "clsx";

interface InputModeSwitchProps {
  mode: string;
  onModeChange: (mode: string) => void;
  options: { value: string; label: string }[];
  theme?: "accent" | "sky" | "amber";
}

const activeThemeClass = {
  accent: "bg-[color:var(--accent)] text-white shadow-sm",
  sky: "bg-sky-600 text-white shadow-sm",
  amber: "bg-amber-500 text-white shadow-sm",
} as const;

export default function InputModeSwitch({
  mode,
  onModeChange,
  options,
  theme = "accent",
}: InputModeSwitchProps) {
  return (
    <div className="inline-flex rounded-full border border-[color:var(--paper-edge)] bg-white/80 p-1">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onModeChange(option.value)}
          className={clsx(
            "rounded-full px-4 py-2 text-xs font-semibold transition",
            mode === option.value
              ? activeThemeClass[theme]
              : "text-[color:var(--muted-ink)] hover:text-[color:var(--ink)]"
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
