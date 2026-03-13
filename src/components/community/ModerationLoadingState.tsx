"use client";

import { motion } from "framer-motion";

const LOADING_TEXTS = [
  "AI 正在审核你的情报...",
  "正在脱敏个人信息...",
  "提取骗术标签中...",
  "生成情报摘要...",
  "分析地域信息...",
  "最终审核判断...",
];

export default function ModerationLoadingState() {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="relative mb-8">
        <motion.div
          className="h-16 w-16 rounded-full border-2 border-white/20"
          style={{ borderTopColor: "rgba(255,255,255,0.8)" }}
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
        <motion.div
          className="absolute inset-2 rounded-full border-2 border-white/10"
          style={{ borderBottomColor: "rgba(255,255,255,0.6)" }}
          animate={{ rotate: -360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
        />
      </div>
      <div className="h-6 overflow-hidden">
        <motion.div
          animate={{ y: [0, -24, -48, -72, -96, -120, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        >
          {LOADING_TEXTS.map((text, i) => (
            <p key={i} className="h-6 text-center text-sm text-white/70">
              {text}
            </p>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
