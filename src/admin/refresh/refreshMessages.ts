// Slack-style lines shown while a refresh runs (RefreshStatus in
// PullToRefresh.tsx). One is picked per refresh, by section.

export type RefreshSection = "pocket" | "portfolio";

const LOADING: Record<RefreshSection, string[]> = {
  pocket: [
    "Counting the coins…",
    "Balancing the books…",
    "Chasing down who owes what…",
    "Shaking the piggy bank…",
    "Sorting the receipts…",
    "Splitting the bill, fairly…",
    "Tallying up the chai money…",
    "Rounding up the rupees…",
    "Checking under the sofa cushions…",
    "Doing the maths so you don't have to…",
    "Asking the calculator nicely…",
    "Following the money…",
  ],
  portfolio: [
    "Polishing your portfolio…",
    "Dusting off the projects…",
    "Fetching your latest work…",
    "Straightening the frames…",
    "Lining up the highlights…",
    "Checking for fresh messages…",
    "Tidying the bookshelf…",
    "Warming up the showcase…",
  ],
};

const DONE: Record<RefreshSection, string[]> = {
  pocket: ["All caught up!", "Books balanced.", "Every rupee accounted for.", "Fresh as morning chai."],
  portfolio: ["All caught up!", "Looking sharp.", "Everything's up to date.", "Fresh and polished."],
};

// `seed` is a 0–1 number fixed for one refresh, so the line doesn't change
// mid-refresh when the component re-renders.
function pick(list: string[], seed: number): string {
  return list[Math.floor(seed * list.length) % list.length];
}

export function loadingMessage(section: RefreshSection, seed: number): string {
  return pick(LOADING[section], seed);
}

export function doneMessage(section: RefreshSection, seed: number): string {
  return pick(DONE[section], seed);
}

export function sectionFor(pathname: string): RefreshSection {
  return pathname.startsWith("/admin/expense") ? "pocket" : "portfolio";
}
