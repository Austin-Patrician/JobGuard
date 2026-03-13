"use client";

interface AnalysisLoadingStateProps {
  text?: string;
  progress?: string;
}

export default function AnalysisLoadingState({
  text = "AI 正在扫描中...",
  progress,
}: AnalysisLoadingStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-6 py-16">
      <div className="relative h-32 w-64">
        <div className="absolute inset-0 rounded-lg border border-white/10 bg-white/5">
          <div className="absolute inset-0 overflow-hidden rounded-lg">
            <div className="scan-line absolute inset-y-0 w-1/3" />
          </div>
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex gap-1.5">
            <div className="typing-dot h-2 w-2 rounded-full bg-[color:var(--accent)]" />
            <div className="typing-dot h-2 w-2 rounded-full bg-[color:var(--accent)]" />
            <div className="typing-dot h-2 w-2 rounded-full bg-[color:var(--accent)]" />
          </div>
        </div>
      </div>
      <div className="text-center">
        <p className="text-sm font-medium text-white/80">{text}</p>
        {progress && (
          <p className="mt-1 text-xs text-white/50">{progress}</p>
        )}
      </div>
    </div>
  );
}
