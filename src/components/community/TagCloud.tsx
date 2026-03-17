"use client";

import { useState } from "react";
import { useCommunityStore } from "@/stores";

interface TagCloudProps {
  tags: { tag: string; count: number }[];
  maxVisible?: number;
  compact?: boolean;
}

export default function TagCloud({ tags, maxVisible, compact = false }: TagCloudProps) {
  const selectedTag = useCommunityStore((s) => s.selectedTag);
  const setSelectedTag = useCommunityStore((s) => s.setSelectedTag);
  const [expanded, setExpanded] = useState(false);

  if (tags.length === 0) return null;

  const maxCount = Math.max(...tags.map((t) => t.count));
  const shouldCollapse = typeof maxVisible === "number" && maxVisible > 0 && tags.length > maxVisible;
  const visibleTags = shouldCollapse && !expanded ? tags.slice(0, maxVisible) : tags;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {visibleTags.map(({ tag, count }) => {
          const ratio = maxCount > 0 ? count / maxCount : 0;
          const isActive = selectedTag === tag;
          // Scale font size between 10px and 14px based on frequency
          const fontSize = 10 + ratio * 4;

          return (
            <button
              key={tag}
              type="button"
              onClick={() => setSelectedTag(isActive ? null : tag)}
              className={`tag-chip ${compact ? "tag-chip--compact" : ""} transition hover:opacity-80 ${
                isActive ? "!bg-[color:var(--accent-soft)] !text-[color:var(--accent)]" : ""
              }`}
              style={{ fontSize: `${fontSize}px` }}
            >
              {tag}
              <span className="ml-1 opacity-60">{count}</span>
            </button>
          );
        })}
      </div>
      {shouldCollapse && (
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="text-xs font-semibold text-[color:var(--muted-ink)] transition hover:opacity-80"
        >
          {expanded ? "收起" : `展开全部 (${tags.length})`}
        </button>
      )}
    </div>
  );
}
