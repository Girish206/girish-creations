import type { CategoryIconType, ExpenseCategory } from "../../../api/types";

// Keyword → Font Awesome icon, checked in order against a category's name.
const KEYWORD_ICONS: [RegExp, string][] = [
  [/food|meal|lunch|dinner|breakfast|restaurant|dining|eat/, "fa-utensils"],
  [/snack|burger|fast ?food/, "fa-burger"],
  [/pizza/, "fa-pizza-slice"],
  [/coffee|tea|cafe/, "fa-mug-hot"],
  [/drink|bar|alcohol|beer/, "fa-beer-mug-empty"],
  [/wine|party|celebrat/, "fa-champagne-glasses"],
  [/grocer|vegetable|fruit|market/, "fa-basket-shopping"],
  [/shop|cloth|apparel|fashion|dress/, "fa-bag-shopping"],
  [/fuel|petrol|diesel|gas station/, "fa-gas-pump"],
  [/car|vehicle|auto/, "fa-car"],
  [/bike|cycle|scooter/, "fa-motorcycle"],
  [/taxi|cab|uber|ola/, "fa-taxi"],
  [/bus|metro|commute|transport/, "fa-bus"],
  [/train|rail/, "fa-train"],
  [/flight|air|plane/, "fa-plane"],
  [/travel|trip|vacation|holiday|tour/, "fa-suitcase-rolling"],
  [/hotel|stay|lodg|hostel/, "fa-hotel"],
  [/rent|house|home|housing/, "fa-house"],
  [/electric|power|bill|utilit/, "fa-bolt"],
  [/water/, "fa-droplet"],
  [/internet|wifi|broadband/, "fa-wifi"],
  [/phone|mobile|recharge/, "fa-mobile-screen"],
  [/tv|netflix|stream|subscri|ott/, "fa-tv"],
  [/movie|cinema|film|entertain/, "fa-film"],
  [/gam(e|es|ing)/, "fa-gamepad"],
  [/music|spotify|concert/, "fa-music"],
  [/medic|pharma|pill|drug/, "fa-pills"],
  [/doctor|hospital|clinic|health/, "fa-heart-pulse"],
  [/dental|teeth|tooth/, "fa-tooth"],
  [/gym|fitness|sport|workout/, "fa-dumbbell"],
  [/educat|school|college|course|tuition|fees/, "fa-graduation-cap"],
  [/book|stationery/, "fa-book"],
  [/gift|present/, "fa-gift"],
  [/birthday|cake/, "fa-cake-candles"],
  [/pets?|dogs?|cats?/, "fa-paw"],
  [/baby|kid|child/, "fa-baby"],
  [/salary|income|work|office|business/, "fa-briefcase"],
  [/invest|stock|mutual|share/, "fa-chart-line"],
  [/saving/, "fa-piggy-bank"],
  [/loan|emi|debt|credit/, "fa-credit-card"],
  [/insurance/, "fa-shield-heart"],
  [/tax/, "fa-file-invoice-dollar"],
  [/bank|finance/, "fa-landmark"],
  [/charity|donat/, "fa-hand-holding-heart"],
  [/repair|maint|service/, "fa-screwdriver-wrench"],
  [/clean|laundry|maid/, "fa-broom"],
  [/beauty|salon|spa|groom|hair/, "fa-spa"],
  [/furniture|decor/, "fa-couch"],
  [/garden|plant/, "fa-seedling"],
  [/electronic|gadget|laptop|computer/, "fa-laptop"],
  [/parking/, "fa-square-parking"],
  [/misc|other|general/, "fa-tags"],
];

// Picker choices — every keyword icon plus a few generic extras.
export const ICON_CHOICES: string[] = Array.from(
  new Set([
    ...KEYWORD_ICONS.map(([, icon]) => icon),
    "fa-receipt",
    "fa-money-bill-wave",
    "fa-wallet",
    "fa-star",
    "fa-heart",
    "fa-leaf",
    "fa-camera",
    "fa-palette",
    "fa-ticket",
    "fa-futbol",
  ]),
);

function hashOf(text: string) {
  let hash = 0;
  for (const ch of text) hash = (hash * 31 + ch.charCodeAt(0)) | 0;
  return Math.abs(hash);
}

// Best-fit icon for a name: a keyword match, otherwise a "random" pick seeded
// by the name so the same name always lands on the same icon.
export function suggestIcon(name: string): string {
  const lower = name.trim().toLowerCase();
  const match = KEYWORD_ICONS.find(([pattern]) => pattern.test(lower));
  if (match) return match[1];
  return ICON_CHOICES[hashOf(lower) % ICON_CHOICES.length];
}

// A different random icon from the picker, for the "shuffle" button.
export function randomIcon(except?: string): string {
  const pool = ICON_CHOICES.filter((icon) => icon !== except);
  return pool[Math.floor(Math.random() * pool.length)];
}

// Initials used as the default text icon ("Food & Dining" → "FD").
export function initialsOf(name: string): string {
  const words = name.trim().split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  return words
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");
}

// What to draw for a saved category — older ones without an icon fall back
// to the suggestion for their name.
export function resolveCategoryIcon(category: Pick<ExpenseCategory, "name" | "iconType" | "icon">): {
  type: CategoryIconType;
  value: string;
} {
  if (category.iconType && category.icon) return { type: category.iconType, value: category.icon };
  return { type: "icon", value: suggestIcon(category.name) };
}
