"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import clsx from "clsx";

interface FileUploaderProps {
  onFilesSelected: (files: File[]) => void;
  maxFiles?: number;
  maxSizeMB?: number;
  accept?: Record<string, string[]>;
  files: File[];
  onRemove: (index: number) => void;
  label?: string;
  description?: string;
}

export default function FileUploader({
  onFilesSelected,
  maxFiles = 1,
  maxSizeMB = 5,
  accept = { "application/pdf": [".pdf"] },
  files,
  onRemove,
  label = "点击或拖拽上传 PDF",
  description = "仅支持文本型 PDF，扫描件建议直接粘贴文本",
}: FileUploaderProps) {
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      setError(null);
      const totalFiles = files.length + acceptedFiles.length;
      if (totalFiles > maxFiles) {
        setError(`最多上传 ${maxFiles} 个文件`);
        return;
      }
      onFilesSelected(acceptedFiles);
    },
    [files.length, maxFiles, onFilesSelected]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    maxSize: maxSizeMB * 1024 * 1024,
    maxFiles: maxFiles - files.length,
    onDropRejected: (rejections) => {
      const firstError = rejections[0]?.errors[0];
      if (firstError?.code === "file-too-large") {
        setError(`文件大小不能超过 ${maxSizeMB}MB`);
      } else if (firstError?.code === "file-invalid-type") {
        setError("仅支持 PDF 文件");
      } else {
        setError("文件上传失败");
      }
    },
  });

  return (
    <div className="space-y-3">
      {files.length < maxFiles && (
        <div
          {...getRootProps()}
          className={clsx(
            "story-card flex cursor-pointer flex-col items-center justify-center gap-3 px-6 py-10 transition",
            isDragActive
              ? "ring-2 ring-[color:var(--accent)]/40 bg-[color:var(--accent-soft)]"
              : "hover:bg-white/90"
          )}
        >
          <input {...getInputProps()} />
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
            <svg
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5V6.75A2.25 2.25 0 0012.375 4.5h-1.75a2.25 2.25 0 00-2.25 2.25v1.5h-1.5A3.375 3.375 0 003.5 11.625v6.125A1.75 1.75 0 005.25 19.5h13.5a1.75 1.75 0 001.75-1.75v-3.5Z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8.25 12.75h7.5m-7.5 3h4.5"
              />
            </svg>
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-[color:var(--ink)]">
              {isDragActive ? "松开即可上传 PDF" : label}
            </p>
            <p className="mt-1 text-xs text-[color:var(--muted-ink)]">
              {description}，最大 {maxSizeMB}MB
            </p>
          </div>
        </div>
      )}

      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file, index) => (
            <div
              key={`${file.name}-${file.size}-${index}`}
              className="story-card flex items-center justify-between gap-3 px-4 py-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-[color:var(--ink)]">
                  {file.name}
                </p>
                <p className="mt-1 text-xs text-[color:var(--muted-ink)]">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              <button
                type="button"
                onClick={() => onRemove(index)}
                className="rounded-full bg-black/5 px-3 py-1 text-xs font-semibold text-[color:var(--muted-ink)] transition hover:bg-black/10 hover:text-[color:var(--ink)]"
              >
                移除
              </button>
            </div>
          ))}
        </div>
      )}

      {error && <p className="text-xs text-[color:var(--accent)]">{error}</p>}
    </div>
  );
}
