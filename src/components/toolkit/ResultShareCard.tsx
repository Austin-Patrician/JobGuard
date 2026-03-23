"use client";

import { useCallback, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import html2canvas from "html2canvas";
import QRCode from "qrcode";
import type { RiskLevel } from "@/types/toolkit";

interface ResultShareCardProps {
  score: number;
  riskLevel: RiskLevel;
  summary: string;
  toolName: string;
}

const riskLabels: Record<RiskLevel, string> = {
  safe: "安全",
  suspicious: "可疑",
  dangerous: "危险",
};

const riskColors: Record<RiskLevel, string> = {
  safe: "#2e7d5d",
  suspicious: "#d39a3a",
  dangerous: "#b32b2b",
};

const toolLabels: Record<string, string> = {
  mirror: "照妖镜",
  contract: "合同避雷针",
  resume: "简历优化器",
};

const toolMetricLabels: Record<string, { title: string; scoreLabel: string }> = {
  mirror: { title: "风险评级", scoreLabel: "安全评分" },
  contract: { title: "风险评级", scoreLabel: "安全评分" },
  resume: { title: "匹配判断", scoreLabel: "匹配度" },
};

const toolStatusLabels: Record<string, Record<RiskLevel, string>> = {
  mirror: riskLabels,
  contract: riskLabels,
  resume: {
    safe: "高匹配",
    suspicious: "待补强",
    dangerous: "低匹配",
  },
};

export default function ResultShareCard({
  score,
  riskLevel,
  summary,
  toolName,
}: ResultShareCardProps) {
  const [showCard, setShowCard] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const metricLabels = toolMetricLabels[toolName] ?? toolMetricLabels.mirror;
  const statusLabels = toolStatusLabels[toolName] ?? toolStatusLabels.mirror;

  const generateShare = useCallback(async () => {
    const qr = await QRCode.toDataURL(window.location.href, {
      width: 120,
      margin: 1,
    });
    setQrDataUrl(qr);
    setShowCard(true);
  }, []);

  const downloadImage = useCallback(async () => {
    if (!cardRef.current) return;
    const canvas = await html2canvas(cardRef.current, {
      scale: 2,
      backgroundColor: "#fbf7ef",
    });
    const link = document.createElement("a");
    link.download = `jobguard-${toolName}-report.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }, [toolName]);

  return (
    <>
      <button
        type="button"
        onClick={generateShare}
        className="rounded-full border border-white/20 bg-white/10 px-4 py-2.5 text-xs font-semibold text-white backdrop-blur-sm transition hover:bg-white/20"
      >
        分享报告
      </button>

      <AnimatePresence>
        {showCard && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={() => setShowCard(false)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm"
            >
              <div
                ref={cardRef}
                className="rounded-3xl bg-[color:var(--paper)] p-6"
                style={{
                  background: "#fbf7ef",
                  border: "1px solid rgba(20,16,12,0.08)",
                }}
              >
                <p
                  style={{
                    fontSize: 11,
                    textTransform: "uppercase",
                    letterSpacing: "0.28em",
                    color: "rgba(27,27,27,0.68)",
                  }}
                >
                  JobGuard {toolLabels[toolName] ?? toolName}
                </p>
                <div
                  style={{
                    marginTop: 12,
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <div
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: 16,
                      background: riskColors[riskLevel],
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#fff",
                      fontSize: 22,
                      fontWeight: 700,
                    }}
                  >
                    {score}
                  </div>
                  <div>
                    <p
                      style={{
                        fontSize: 20,
                        fontWeight: 700,
                        color: "#1b1b1b",
                      }}
                    >
                      {metricLabels.title}：{statusLabels[riskLevel]}
                    </p>
                    <p
                      style={{
                        fontSize: 12,
                        color: "rgba(27,27,27,0.68)",
                        marginTop: 2,
                      }}
                    >
                      {metricLabels.scoreLabel} {score}/100
                    </p>
                  </div>
                </div>
                <p
                  style={{
                    marginTop: 16,
                    fontSize: 13,
                    lineHeight: 1.7,
                    color: "rgba(27,27,27,0.68)",
                  }}
                >
                  {summary}
                </p>
                <div
                  style={{
                    marginTop: 16,
                    display: "flex",
                    alignItems: "flex-end",
                    justifyContent: "space-between",
                  }}
                >
                  <p
                    style={{
                      fontSize: 10,
                      color: "rgba(27,27,27,0.4)",
                    }}
                  >
                    jobguard.app
                  </p>
                  {qrDataUrl && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={qrDataUrl}
                      alt="QR Code"
                      style={{ width: 60, height: 60 }}
                    />
                  )}
                </div>
              </div>

              <div className="mt-4 flex justify-center gap-3">
                <button
                  type="button"
                  onClick={downloadImage}
                  className="rounded-full bg-[color:var(--accent)] px-5 py-2.5 text-xs font-semibold text-white"
                >
                  下载图片
                </button>
                <button
                  type="button"
                  onClick={() => setShowCard(false)}
                  className="rounded-full border border-white/20 px-5 py-2.5 text-xs font-semibold text-white"
                >
                  关闭
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
