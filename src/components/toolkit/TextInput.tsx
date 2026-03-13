"use client";

import { useState } from "react";

interface TextInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minLength?: number;
  maxLength?: number;
}

export default function TextInput({
  value,
  onChange,
  placeholder = "粘贴招聘 JD、聊天记录或任何可疑内容...",
  minLength = 20,
  maxLength = 5000,
}: TextInputProps) {
  const [focused, setFocused] = useState(false);
  const tooShort = value.length > 0 && value.length < minLength;

  return (
    <div className="space-y-2">
      <div
        className={`story-card overflow-hidden transition ${
          focused ? "ring-2 ring-[color:var(--accent)]/30" : ""
        }`}
      >
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          rows={8}
          className="w-full resize-none bg-transparent px-4 py-4 text-sm leading-relaxed text-[color:var(--ink)] outline-none placeholder:text-[color:var(--muted-ink)]/50"
        />
      </div>
      <div className="flex items-center justify-between px-1">
        {tooShort ? (
          <p className="text-xs text-[color:var(--accent)]">
            至少需要 {minLength} 个字符
          </p>
        ) : (
          <p className="text-xs text-[color:var(--muted-ink)]" />
        )}
        <p className="text-xs text-[color:var(--muted-ink)]">
          {value.length}/{maxLength}
        </p>
      </div>
    </div>
  );
}
