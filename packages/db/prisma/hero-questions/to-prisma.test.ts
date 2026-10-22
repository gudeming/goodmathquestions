import { describe, expect, it } from "vitest";
import { Prisma } from "@prisma/client";
import { ChoicesSchema, GuessConfigSchema, WrongAnswerRulesSchema, AnswerSpecSchema } from "@gmq/math-engine";
import { parseSceneConfig } from "@gmq/animation-engine";
import { ALL_HERO_BLUEPRINTS, HERO_WORLDS, heroQuestionData, heroSortOrder } from "./index";
import { gaussSum } from "./world-huge-numbers";
import { montyHall } from "./world-chance-and-luck";
import { scrambleAndNine } from "./world-number-magic";

const worldOf = (slug: string) => HERO_WORLDS.find((w) => w.blueprints.some((b) => b.slug === slug))!;
const dataFor = (bp: (typeof ALL_HERO_BLUEPRINTS)[number]) =>
  heroQuestionData(bp, { collectionId: "col_x", worldSortOrder: worldOf(bp.slug).sortOrder });

describe("heroQuestionData", () => {
  it("maps a NUMERIC three-act question", () => {
    const d = dataFor(gaussSum);
    expect(d).toMatchObject({
      slug: "gauss-sum",
      kind: "THREE_ACT",
      answerType: "NUMERIC",
      answer: "5050",
      contentEn: gaussSum.prompt.en,
      hookZh: gaussSum.hook.zh,
      answerExplainEn: gaussSum.explanation.en,
      collectionId: "col_x",
      isPublished: true,
      sortOrder: 10101,
    });
    expect(d.choices).toBe(Prisma.DbNull);
    expect(d.answerRule).toEqual({ type: "NUMERIC", value: 5050 });
  });

  it("derives CHOICE options with isCorrect and stores the correct id as the answer", () => {
    const m = dataFor(montyHall);
    expect(m.answerType).toBe("CHOICE");
    expect(m.answer).toBe("switch");
    expect(ChoicesSchema.parse(m.choices)).toEqual([
      { id: "switch", en: "Switch", zh: "换", isCorrect: true },
      { id: "stay", en: "Stay", zh: "不换", isCorrect: false },
      { id: "same", en: "It doesn't matter", zh: "换不换都一样", isCorrect: false },
    ]);
    expect(dataFor(scrambleAndNine).answer).toBe("9");
  });

  it("writes JSON every API schema accepts, and sortOrders that never collide with legacy rows", () => {
    const orders = new Set<number>();
    for (const bp of ALL_HERO_BLUEPRINTS) {
      const d = dataFor(bp);
      expect(AnswerSpecSchema.safeParse(d.answerRule).success).toBe(true);
      expect(WrongAnswerRulesSchema.safeParse(d.wrongAnswerFeedback).success).toBe(true);
      if (d.guessConfig !== Prisma.DbNull) expect(GuessConfigSchema.safeParse(d.guessConfig).success).toBe(true);
      expect(parseSceneConfig(d.animationConfig).ok).toBe(true);
      expect(d.sortOrder).toBeGreaterThan(10_000);
      orders.add(d.sortOrder);
    }
    expect(orders.size).toBe(ALL_HERO_BLUEPRINTS.length);
    expect(heroSortOrder(4, 2)).toBe(10402);
  });
});
