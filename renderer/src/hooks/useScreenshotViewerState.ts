import { useState } from "react";
import type { ScreenSource } from "../types/electron";
import type { Selection, StartPos } from "../types/common";

export const useScreenshotViewerState = () => {
  const [screenshotData, setScreenshotData] = useState<ScreenSource | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSelector, setShowSelector] = useState(false);
  const [selection, setSelection] = useState<Selection>({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  });
  const [isSelecting, setIsSelecting] = useState(false);
  const [startPos, setStartPos] = useState<StartPos>({ x: 0, y: 0 });

  const resetSelection = () => {
    setSelection({ x: 0, y: 0, width: 0, height: 0 });
    setIsSelecting(false);
  };

  const cancelSelection = () => {
    setShowSelector(false);
    resetSelection();
  };

  return {
    screenshotData,
    setScreenshotData,
    loading,
    setLoading,
    error,
    setError,
    showSelector,
    setShowSelector,
    selection,
    setSelection,
    isSelecting,
    setIsSelecting,
    startPos,
    setStartPos,
    resetSelection,
    cancelSelection,
  };
}; 