import { useCallback, useEffect, useMemo, useState } from "react";

export const formatCooldownDuration = (seconds: number): string => {
  const normalized = Math.max(0, Math.ceil(seconds));
  const minutes = Math.ceil(normalized / 60);
  return `${minutes} minute${minutes === 1 ? "" : "s"}`;
};

export const useRateLimitCooldown = () => {
  const [remainingSeconds, setRemainingSeconds] = useState(0);

  useEffect(() => {
    if (remainingSeconds <= 0) return;

    const intervalId = window.setInterval(() => {
      setRemainingSeconds((previous) => Math.max(previous - 1, 0));
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [remainingSeconds]);

  const startCooldown = useCallback((seconds: number) => {
    const normalized = Number.isFinite(seconds) ? Math.max(0, Math.ceil(seconds)) : 0;
    setRemainingSeconds(normalized);
  }, []);

  const cooldownLabel = useMemo(
    () => formatCooldownDuration(remainingSeconds),
    [remainingSeconds],
  );

  return {
    remainingSeconds,
    isCoolingDown: remainingSeconds > 0,
    startCooldown,
    cooldownLabel,
  };
};
