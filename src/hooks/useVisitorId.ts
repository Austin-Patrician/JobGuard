"use client";

import { useEffect, useState } from "react";
import { getVisitorId } from "@/lib/visitor";

export function useVisitorId() {
  const [visitorId, setVisitorId] = useState<string | null>(null);

  useEffect(() => {
    setVisitorId(getVisitorId());
  }, []);

  return visitorId;
}
