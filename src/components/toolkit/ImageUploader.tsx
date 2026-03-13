"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import clsx from "clsx";

interface ImageUploaderProps {
  onFilesSelected: (files: File[]) => void;
  maxFiles?: number;
  maxSizeMB?: number;
  accept?: Record<string, string[]>;
  files: File[];
  previews: string[];
  onRemove: (index: number) => void;
}

export default function ImageUploader({
  onFilesSelected,
  maxFiles = 1,
  maxSizeMB = 10,
  accept = { "image/png": [], "image/jpeg": [], "image/webp": [] },
  files,
  previews,
  onRemove,
}: ImageUploaderProps) {
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
        setError("不支持的文件格式");
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
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[color:var(--accent-soft)]">
            <svg
              className="h-6 w-6 text-[color:var(--accent)]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
              />
            </svg>
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-[color:var(--ink)]">
              {isDragActive ? "松开即可上传" : "点击或拖拽上传"}
            </p>
            <p className="mt-1 text-xs text-[color:var(--muted-ink)]">
              支持 PNG、JPG、WebP，最大 {maxSizeMB}MB
              {maxFiles > 1 && `，最多 ${maxFiles} 个文件`}
            </p>
          </div>
        </div>
      )}

      {previews.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {previews.map((preview, index) => (
            <div key={index} className="group relative">
              <div className="h-20 w-20 overflow-hidden rounded-xl border border-[color:var(--paper-edge)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={preview}
                  alt={`预览 ${index + 1}`}
                  className="h-full w-full object-cover"
                />
              </div>
              <button
                type="button"
                onClick={() => onRemove(index)}
                className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-[color:var(--accent)] text-[10px] text-white opacity-0 transition group-hover:opacity-100"
              >
                x
              </button>
            </div>
          ))}
        </div>
      )}

      {error && (
        <p className="text-xs text-[color:var(--accent)]">{error}</p>
      )}
    </div>
  );
}
