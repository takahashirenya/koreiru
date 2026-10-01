import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
export function useAction() {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const cache = useQueryClient();
  async function run(work: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await work();
      await cache.invalidateQueries();
    } catch (e) {
      setError(e instanceof Error ? e.message : "操作に失敗しました");
    } finally {
      setBusy(false);
    }
  }
  return { busy, error, setError, run };
}
