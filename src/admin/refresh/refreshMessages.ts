// Slack-style lines shown while a refresh runs (RefreshStatus in
// PullToRefresh.tsx). One is picked per refresh.

const LOADING = [
  "Polishing your portfolio…",
  "Dusting off the projects…",
  "Fetching your latest work…",
  "Straightening the frames…",
  "Lining up the highlights…",
  "Checking for fresh messages…",
  "Tidying the bookshelf…",
  "Warming up the showcase…",
];

const DONE = ["All caught up!", "Looking sharp.", "Everything's up to date.", "Fresh and polished."];

// `seed` is a 0–1 number fixed for one refresh, so the line doesn't change
// mid-refresh when the component re-renders.
function pick(list: string[], seed: number): string {
  return list[Math.floor(seed * list.length) % list.length];
}

export function loadingMessage(seed: number): string {
  return pick(LOADING, seed);
}

export function doneMessage(seed: number): string {
  return pick(DONE, seed);
}
