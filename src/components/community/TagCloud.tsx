"use client";

import { useCommunityStore } from "@/stores";

interface TagCloudProps {
  tags: { tag: string; count: number }[];
}

export default function TagCloud({ tags }: TagCloudProps) {
  const selectedTag = useCommunityStore((s) => s.selectedTag);
  const setSelectedTag = useCommunityStore((s) => s.setSelectedTag);

  if (tags.length === 0) return null;

  const maxCount = Math.max(...tags.map((t) => t.count));

  return (
    <div className="flex flex-wrap gap-2">
      {tags.map(({ tag, count }) => {
        const ratio = maxCount > 0 ? count / maxCount : 0;
        const isActive = selectedTag === tag;
        // Scale font size between 12px and 18px based on frequency
        const fontSize = 12 + ratio * 6;

        return (
          <button
            key={tag}
            type="button"
            onClick={() => setSelectedTag(isActive ? null : tag)}
            className={`tag-chip transition hover:opacity-80 ${
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
  );
}
