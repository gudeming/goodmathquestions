/**
 * The six worlds (Collection rows) and the blueprints that belong to each.
 * Titles follow the catalog headings (02-hero-question-catalog.md); colours are
 * the `fun-*` tokens from apps/web/tailwind.config.ts.
 */
import type { Bi, CollectionSlug, HeroQuestionBlueprint } from "./_template";
import { CHANCE_AND_LUCK } from "./world-chance-and-luck";
import { HUGE_NUMBERS } from "./world-huge-numbers";
import { IMPOSSIBLE_PUZZLES } from "./world-impossible-puzzles";
import { NUMBER_MAGIC } from "./world-number-magic";
import { PATTERNS_EVERYWHERE } from "./world-patterns-everywhere";
import { SHAPES_THAT_LIE } from "./world-shapes-that-lie";

export interface HeroWorld {
  slug: CollectionSlug;
  title: Bi;
  description: Bi;
  emoji: string;
  colorToken: string;
  /** 1-based display order; also the world index in hero question sortOrders. */
  sortOrder: number;
  blueprints: readonly HeroQuestionBlueprint[];
}

export const HERO_WORLDS: readonly HeroWorld[] = [
  {
    slug: "huge-numbers",
    title: { en: "Huge Numbers & Infinity", zh: "大数与无限" },
    description: {
      en: "Numbers so big your brain says no: doubling, giant sums and things that never end.",
      zh: "大到让你不敢相信的数：翻倍、超长的加法，还有永远走不到头的东西。",
    },
    emoji: "🪐",
    colorToken: "fun-purple",
    sortOrder: 1,
    blueprints: HUGE_NUMBERS,
  },
  {
    slug: "shapes-that-lie",
    title: { en: "Shapes That Lie", zh: "会骗人的形状" },
    description: {
      en: "Pictures that look obvious until you count, cut or fold them.",
      zh: "一眼看上去很简单的图形，一数、一切、一折，答案就变了。",
    },
    emoji: "📐",
    colorToken: "fun-cyan",
    sortOrder: 2,
    blueprints: SHAPES_THAT_LIE,
  },
  {
    slug: "chance-and-luck",
    title: { en: "Chance & Luck", zh: "运气与机会" },
    description: {
      en: "Doors, dice and birthdays where your gut feeling is wrong. Play it and see.",
      zh: "门、骰子和生日，直觉常常会骗你。自己玩几局就知道了。",
    },
    emoji: "🎲",
    colorToken: "fun-green",
    sortOrder: 3,
    blueprints: CHANCE_AND_LUCK,
  },
  {
    slug: "number-magic",
    title: { en: "Number Magic", zh: "数字魔术" },
    description: {
      en: "Tricks that read your mind, and the hidden math that makes them work every time.",
      zh: "能读出你心里想法的魔术，还有让它每次都成功的秘密数学。",
    },
    emoji: "🎩",
    colorToken: "fun-pink",
    sortOrder: 4,
    blueprints: NUMBER_MAGIC,
  },
  {
    slug: "patterns-everywhere",
    title: { en: "Patterns Everywhere", zh: "处处是规律" },
    description: {
      en: "Towers, tiles and sequences. Spot the pattern and predict what comes next.",
      zh: "塔、瓷砖和数列。找到规律，就能猜出下一步。",
    },
    emoji: "🔁",
    colorToken: "fun-orange",
    sortOrder: 5,
    blueprints: PATTERNS_EVERYWHERE,
  },
  {
    slug: "impossible-puzzles",
    title: { en: "Impossible Puzzles", zh: "不可能的谜题" },
    description: {
      en: "Puzzles that look impossible. Some are, and the fun is proving which ones.",
      zh: "看起来做不到的谜题。有的真做不到，证明它才是最好玩的部分。",
    },
    emoji: "🧩",
    colorToken: "fun-yellow",
    sortOrder: 6,
    blueprints: IMPOSSIBLE_PUZZLES,
  },
];

/** Every blueprint, in world order then world-internal order. */
export const ALL_HERO_BLUEPRINTS: readonly HeroQuestionBlueprint[] = HERO_WORLDS.flatMap((w) =>
  [...w.blueprints].sort((a, b) => a.sortOrder - b.sortOrder)
);
