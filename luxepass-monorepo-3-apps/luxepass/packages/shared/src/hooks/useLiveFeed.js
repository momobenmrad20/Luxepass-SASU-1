// @ts-check
import { useContext } from "react";
import { LiveFeedContext } from "../contexts/LiveFeedContext";

/**
 * Temps réel staff : digitalLiveFeed, liveFeedConnected, digitalActiveStays,
 * digitalFolios, digitalPendingStays, refreshPmsSideData.
 */
/** @returns {import("../types").LiveFeedContextValue} */
export function useLiveFeed() {
  const ctx = useContext(LiveFeedContext);
  if (!ctx) throw new Error("useLiveFeed doit être utilisé à l'intérieur de <LiveFeedProvider>");
  return ctx;
}
