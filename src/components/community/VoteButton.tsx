"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useVisitorId } from "@/hooks/useVisitorId";
import { useCommunityStore } from "@/stores";
import { API_ROUTES } from "@/lib/constants";

interface VoteButtonProps {
  reportId: string;
  initialUpvotes: number;
}

export default function VoteButton({ reportId, initialUpvotes }: VoteButtonProps) {
  const visitorId = useVisitorId();
  const hasVoted = useCommunityStore((s) => s.hasVoted);
  const addVotedReport = useCommunityStore((s) => s.addVotedReport);
  const [upvotes, setUpvotes] = useState(initialUpvotes);
  const [animating, setAnimating] = useState(false);
  const voted = hasVoted(reportId);

  const handleVote = useCallback(async () => {
    if (!visitorId || voted) return;

    // Optimistic update
    setUpvotes((prev) => prev + 1);
    addVotedReport(reportId);
    setAnimating(true);
    setTimeout(() => setAnimating(false), 400);

    try {
      const res = await fetch(API_ROUTES.COMMUNITY.VOTE(reportId), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visitor_id: visitorId }),
      });
      const data = await res.json();
      if (!res.ok) {
        // Revert on error (but keep voted state for ALREADY_VOTED)
        if (data.error !== "ALREADY_VOTED") {
          setUpvotes(initialUpvotes);
        }
      } else {
        setUpvotes(data.upvotes);
      }
    } catch {
      setUpvotes(initialUpvotes);
    }
  }, [visitorId, voted, reportId, addVotedReport, initialUpvotes]);

  return (
    <button
      type="button"
      onClick={handleVote}
      disabled={voted || !visitorId}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition ${
        voted
          ? "bg-[color:var(--accent-soft)] text-[color:var(--accent)]"
          : "bg-black/5 text-[color:var(--muted-ink)] hover:bg-black/10"
      }`}
    >
      <AnimatePresence mode="wait">
        <motion.span
          key={animating ? "animating" : "idle"}
          initial={animating ? { scale: 1.4 } : false}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 500, damping: 15 }}
        >
          {voted ? "\u2764" : "\u2661"}
        </motion.span>
      </AnimatePresence>
      <span>{upvotes}</span>
    </button>
  );
}
