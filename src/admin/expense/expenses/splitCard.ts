import type { ExpenseGroup, SettlementTransfer } from "../../../api/types";
import { formatCurrency } from "../currency";

// A group's split-up drawn as a picture to share (WhatsApp and the like): the
// totals, where each person stands, and who pays whom. The same figures the
// settle-up screen and the split-up email show, never the single expenses.

const W = 1080;
const PAD = 64;
const BG = "#1b1915";
const PANEL = "#26231e";
const LINE = "rgba(255, 255, 255, 0.08)";
const AMBER = "#d9901a";
const AMBER_SOFT = "#f2c06b";
const TEXT = "#ffffff";
const MUTED = "rgba(255, 255, 255, 0.6)";
const GREEN = "#4ade80";
const RED = "#f87171";
const HEAD = `"Space Grotesk", Inter, system-ui, sans-serif`;
const BODY = `Inter, system-ui, sans-serif`;

const money = (cents: number) => formatCurrency(cents / 100);

// The Girish Creations mark (public/logo/logo.svg), drawn from its path so it
// needs no image load. It sits in a 50 × 50 box from (12, 25).
const LOGO_PATH =
  "M37 25A25 25 0 1 0 62 50H50A13 13 0 1 1 37 37ZM82.15 33.93A25 25 0 1 0 82.15 66.07L72.96 58.36A13 13 0 1 1 72.96 41.64Z";

// The mark `size` px tall, its top-left at (x, y).
function drawLogo(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  const scale = size / 50;
  ctx.save();
  ctx.translate(x - 12 * scale, y - 25 * scale);
  ctx.scale(scale, scale);
  ctx.fillStyle = AMBER;
  ctx.fill(new Path2D(LOGO_PATH), "evenodd");
  ctx.restore();
}
// The mark's width for a given height (it's 75.5 wide by 50 tall).
const logoWidth = (size: number) => (size * 75.5) / 50;

function dayLabel(iso: string) {
  return new Date(iso.slice(0, 10) + "T00:00:00").toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

function windowText(group: ExpenseGroup) {
  if (group.startDate && group.endDate) return `${dayLabel(group.startDate)} – ${dayLabel(group.endDate)}`;
  if (group.startDate) return `From ${dayLabel(group.startDate)}`;
  if (group.endDate) return `Until ${dayLabel(group.endDate)}`;
  return null;
}

function ellipsize(ctx: CanvasRenderingContext2D, text: string, width: number) {
  if (ctx.measureText(text).width <= width) return text;
  let cut = text;
  while (cut.length > 1 && ctx.measureText(`${cut}…`).width > width) cut = cut.slice(0, -1);
  return `${cut.trimEnd()}…`;
}

function fitFont(ctx: CanvasRenderingContext2D, text: string, weight: number, max: number, min: number, width: number, family: string) {
  let size = max;
  ctx.font = `${weight} ${size}px ${family}`;
  while (size > min && ctx.measureText(text).width > width) {
    size -= 2;
    ctx.font = `${weight} ${size}px ${family}`;
  }
}

function panel(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  ctx.fillStyle = PANEL;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 22);
  ctx.fill();
}

function balanceText(pendingCents: number) {
  if (pendingCents > 0) return { text: `Gets ${money(pendingCents)}`, color: GREEN };
  if (pendingCents < 0) return { text: `Owes ${money(-pendingCents)}`, color: RED };
  return { text: "Settled", color: MUTED };
}

const perHeadCents = (group: ExpenseGroup) =>
  group.balances.length > 0 ? Math.round(group.totalCents / group.balances.length) : 0;

const pendingTotalCents = (group: ExpenseGroup) =>
  group.balances.reduce((sum, b) => sum + Math.max(0, b.pendingCents), 0);

function fundText(group: ExpenseGroup) {
  const fund = group.fund;
  if (!fund) return null;
  const holder = group.balances.find((b) => b.adminUserId === fund.holderAdminUserId)?.name;
  const left = fund.putInCents - fund.spentCents;
  const tail =
    left >= 0
      ? `${money(left)} left${holder ? ` with ${holder}` : ""}`
      : `Over by ${money(-left)}${holder ? `, covered by ${holder}` : ""}`;
  return `In ${money(fund.putInCents)} · Spent ${money(fund.spentCents)} · ${tail}`;
}

// The split-up as text, for Copy and for sharing where a picture can't go.
export function splitText(group: ExpenseGroup, transfers: SettlementTransfer[]) {
  const lines = [`${group.name} — split-up`];
  const when = windowText(group);
  if (when) lines.push(when);
  lines.push(`Total ${money(group.totalCents)} · Per head ${money(perHeadCents(group))}`);
  const fund = fundText(group);
  if (fund) lines.push(`Fund: ${fund}`);
  lines.push("", "Per person:");
  for (const b of group.balances) {
    const paid = b.paidCents + b.fundPutInCents;
    const share = b.shareCents + b.fundShareCents;
    lines.push(`• ${b.name}: paid ${money(paid)}, share ${money(share)} — ${balanceText(b.pendingCents).text}`);
  }
  lines.push("");
  if (transfers.length > 0) {
    lines.push("Who pays whom:");
    for (const t of transfers) lines.push(`• ${t.fromName} → ${t.toName}: ${money(t.amountCents)}`);
  } else {
    lines.push("Everyone is settled up.");
  }
  return lines.join("\n");
}

const ROW = 72;

export async function drawSplitCard(group: ExpenseGroup, transfers: SettlementTransfer[]): Promise<Blob | null> {
  await Promise.all([
    document.fonts.load(`700 64px "Space Grotesk"`),
    document.fonts.load(`600 30px Inter`),
    document.fonts.load(`500 26px Inter`),
  ]).catch(() => {});

  const fund = fundText(group);
  const when = windowText(group);
  const header = 250;
  const stats = 150 + 32;
  const fundBlock = fund ? 104 + 32 : 0;
  const peopleBlock = 70 + 56 + group.balances.length * ROW + 24 + 32;
  const payBlock = 70 + Math.max(1, transfers.length) * ROW + 24;
  const footer = 110;
  const height = header + stats + fundBlock + payBlock + peopleBlock + footer;

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const inner = W - PAD * 2;

  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, height);
  ctx.fillStyle = AMBER;
  ctx.fillRect(0, 0, W, 12);
  ctx.textBaseline = "middle";

  // Header: label, group name, dates and count.
  ctx.textAlign = "left";
  ctx.fillStyle = AMBER_SOFT;
  ctx.font = `700 24px ${HEAD}`;
  ctx.letterSpacing = "4px";
  ctx.fillText("SPLIT-UP", PAD, 84);
  ctx.letterSpacing = "0px";
  const logoSize = 84;
  drawLogo(ctx, W - PAD - logoWidth(logoSize), 64, logoSize);
  const titleRoom = inner - logoWidth(logoSize) - 32;
  ctx.fillStyle = TEXT;
  fitFont(ctx, group.name, 700, 68, 40, titleRoom, HEAD);
  ctx.fillText(ellipsize(ctx, group.name, titleRoom), PAD, 148);
  ctx.fillStyle = MUTED;
  ctx.font = `500 26px ${BODY}`;
  const sub = [when, `${group.expenseCount} expense${group.expenseCount === 1 ? "" : "s"}`, `${group.balances.length} people`]
    .filter(Boolean)
    .join("  ·  ");
  ctx.fillText(ellipsize(ctx, sub, titleRoom), PAD, 204);
  let y = header;

  // Stats: total, per head, still pending.
  const gap = 20;
  const tileW = (inner - gap * 2) / 3;
  const pending = pendingTotalCents(group);
  const tiles = [
    { label: "TOTAL", value: money(group.totalCents), color: TEXT },
    { label: "PER HEAD", value: money(perHeadCents(group)), color: TEXT },
    { label: "PENDING", value: pending > 0 ? money(pending) : "All settled", color: pending > 0 ? AMBER_SOFT : GREEN },
  ];
  tiles.forEach((tile, i) => {
    const x = PAD + i * (tileW + gap);
    panel(ctx, x, y, tileW, 150);
    ctx.fillStyle = MUTED;
    ctx.font = `600 20px ${BODY}`;
    ctx.letterSpacing = "2px";
    ctx.fillText(tile.label, x + 28, y + 48);
    ctx.letterSpacing = "0px";
    ctx.fillStyle = tile.color;
    fitFont(ctx, tile.value, 700, 44, 26, tileW - 56, HEAD);
    ctx.fillText(tile.value, x + 28, y + 102);
  });
  y += stats;

  if (fund && group.fund) {
    panel(ctx, PAD, y, inner, 104);
    ctx.fillStyle = AMBER_SOFT;
    ctx.font = `600 24px ${BODY}`;
    ctx.fillText(ellipsize(ctx, `Fund · ${group.fund.name}`, inner - 56), PAD + 28, y + 34);
    ctx.fillStyle = TEXT;
    fitFont(ctx, fund, 500, 26, 18, inner - 56, BODY);
    ctx.fillText(ellipsize(ctx, fund, inner - 56), PAD + 28, y + 72);
    y += fundBlock;
  }

  // Per person: paid, share, where they stand.
  ctx.fillStyle = TEXT;
  ctx.font = `700 32px ${HEAD}`;
  ctx.fillText("Per person", PAD, y + 30);
  y += 70;
  const tableH = 56 + group.balances.length * ROW + 24;
  panel(ctx, PAD, y, inner, tableH);
  const colName = PAD + 28;
  const colBalance = W - PAD - 28;
  const colShare = colBalance - 250;
  const colPaid = colShare - 170;
  ctx.fillStyle = MUTED;
  ctx.font = `600 20px ${BODY}`;
  ctx.letterSpacing = "2px";
  ctx.fillText("PERSON", colName, y + 40);
  ctx.textAlign = "right";
  ctx.fillText("PAID", colPaid, y + 40);
  ctx.fillText("SHARE", colShare, y + 40);
  ctx.fillText("BALANCE", colBalance, y + 40);
  ctx.letterSpacing = "0px";
  ctx.textAlign = "left";
  group.balances.forEach((b, i) => {
    const top = y + 68 + i * ROW;
    const rowY = top + ROW / 2;
    ctx.fillStyle = LINE;
    ctx.fillRect(PAD + 28, top, inner - 56, 2);
    ctx.fillStyle = TEXT;
    ctx.font = `600 28px ${BODY}`;
    ctx.fillText(ellipsize(ctx, b.name, colPaid - 150 - colName), colName, rowY);
    ctx.textAlign = "right";
    ctx.fillStyle = MUTED;
    ctx.font = `500 26px ${BODY}`;
    ctx.fillText(money(b.paidCents + b.fundPutInCents), colPaid, rowY);
    ctx.fillText(money(b.shareCents + b.fundShareCents), colShare, rowY);
    const balance = balanceText(b.pendingCents);
    ctx.fillStyle = balance.color;
    ctx.font = `600 26px ${BODY}`;
    ctx.fillText(balance.text, colBalance, rowY);
    ctx.textAlign = "left";
  });
  y += tableH + 32;

  // Who pays whom.
  ctx.fillStyle = TEXT;
  ctx.font = `700 32px ${HEAD}`;
  ctx.fillText("Who pays whom", PAD, y + 30);
  y += 70;
  const payH = Math.max(1, transfers.length) * ROW + 24;
  panel(ctx, PAD, y, inner, payH);
  if (transfers.length === 0) {
    ctx.fillStyle = GREEN;
    ctx.font = `600 28px ${BODY}`;
    ctx.fillText("✓  Everyone is settled up", PAD + 28, y + 12 + ROW / 2);
  }
  transfers.forEach((t, i) => {
    const rowY = y + 12 + i * ROW + ROW / 2;
    if (i > 0) {
      ctx.fillStyle = LINE;
      ctx.fillRect(PAD + 28, y + 12 + i * ROW, inner - 56, 2);
    }
    const amount = money(t.amountCents);
    ctx.font = `700 32px ${HEAD}`;
    const amountW = ctx.measureText(amount).width;
    ctx.textAlign = "right";
    ctx.fillStyle = AMBER_SOFT;
    ctx.fillText(amount, W - PAD - 28, rowY);
    ctx.textAlign = "left";
    // "From → To", shrunk to fit beside the amount.
    const nameRoom = inner - 56 - amountW - 32;
    const names = `${t.fromName}  →  ${t.toName}`;
    fitFont(ctx, names, 600, 30, 20, nameRoom, BODY);
    const from = `${t.fromName}  `;
    const fromText = ellipsize(ctx, from, nameRoom * 0.48);
    ctx.fillStyle = TEXT;
    ctx.fillText(fromText, PAD + 28, rowY);
    let x = PAD + 28 + ctx.measureText(fromText).width;
    ctx.fillStyle = MUTED;
    ctx.fillText("→  ", x, rowY);
    x += ctx.measureText("→  ").width;
    ctx.fillStyle = TEXT;
    ctx.fillText(ellipsize(ctx, t.toName, PAD + 28 + nameRoom - x), x, rowY);
  });
  y += payH;

  // Footer.
  ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
  ctx.font = `600 22px ${BODY}`;
  ctx.letterSpacing = "3px";
  drawLogo(ctx, PAD, height - 52 - 14, 28);
  ctx.fillText("GIRISH CREATIONS · POCKET", PAD + logoWidth(28) + 14, height - 52);
  ctx.letterSpacing = "0px";
  ctx.textAlign = "right";
  ctx.font = `500 22px ${BODY}`;
  ctx.fillText(
    new Date().toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }),
    W - PAD,
    height - 52,
  );

  return new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
}
