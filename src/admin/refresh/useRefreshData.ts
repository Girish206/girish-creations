import { useCallback, useSyncExternalStore } from "react";
import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

// One refresh for the whole admin, shared by every RefreshButton and the
// mobile pull-to-refresh, so they all spin (and finish) together and a
// second tap while one is running doesn't start another.

export type RefreshStatus = "idle" | "refreshing" | "done";
// What started it: only a pull shows the message pill (PullToRefresh);
// the button has its own spinner/check.
export type RefreshSource = "button" | "pull";

interface RefreshState {
  status: RefreshStatus;
  // Fixed for one refresh: picks its message (refreshMessages.ts).
  seed: number;
  source: RefreshSource;
}

// Long enough to read the message even when the server answers instantly.
const MIN_SPIN_MS = 900;
// How long the ✓ and the "all caught up" line stay.
const DONE_MS = 1500;

let state: RefreshState = { status: "idle", seed: 0, source: "button" };
let running: Promise<void> | null = null;
let doneTimer: ReturnType<typeof setTimeout> | undefined;
const listeners = new Set<() => void>();

function setState(next: Partial<RefreshState>) {
  state = { ...state, ...next };
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getState() {
  return state;
}

async function runRefresh(queryClient: QueryClient, source: RefreshSource): Promise<void> {
  clearTimeout(doneTimer);
  setState({ status: "refreshing", seed: Math.random(), source });
  const startedAt = Date.now();
  // Only what's on screen: queries with a mounted component. Everything
  // else is refetched when it's next opened anyway.
  await Promise.all([
    queryClient.refetchQueries({ type: "active" }),
    new Promise((resolve) => setTimeout(resolve, MIN_SPIN_MS)),
  ]);
  const failed = queryClient
    .getQueryCache()
    .findAll({ type: "active" })
    .some((query) => query.state.status === "error" && query.state.errorUpdatedAt >= startedAt);
  if (failed) {
    toast.error("Couldn't refresh. Check your connection and try again.");
    setState({ status: "idle" });
    return;
  }
  setState({ status: "done" });
  doneTimer = setTimeout(() => setState({ status: "idle" }), DONE_MS);
}

export function useRefreshData() {
  const queryClient = useQueryClient();
  const current = useSyncExternalStore(subscribe, getState, getState);

  const refresh = useCallback((source: RefreshSource = "button") => {
    if (!running) {
      running = runRefresh(queryClient, source).finally(() => {
        running = null;
      });
    }
    return running;
  }, [queryClient]);

  return {
    refresh,
    status: current.status,
    seed: current.seed,
    source: current.source,
    isRefreshing: current.status === "refreshing",
  };
}
