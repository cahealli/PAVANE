"use client";
import { useEffect } from "react";

export function usePageTitle(title: string) {
  useEffect(() => {
    document.title = title ? `${title} — Pavane` : "Pavane";
    return () => {
      document.title = "Pavane";
    };
  }, [title]);
}
