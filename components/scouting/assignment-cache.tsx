"use client";

import { useEffect } from "react";
import { cacheAssignments } from "@/lib/offline/sync";

/** Warms the offline cache with the current scouter's assignment context. */
export function AssignmentCache() {
  useEffect(() => {
    if (!navigator.onLine) return;
    fetch("/api/my-assignments")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.assignments?.length) void cacheAssignments(d.assignments);
      })
      .catch(() => {
        /* offline */
      });
  }, []);
  return null;
}
