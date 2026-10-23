import { describe, expect, it } from "vitest";
import { parseSceneConfig } from "@gmq/animation-engine";
import { AnswerSpecSchema, validateAnswerV2, wrongAnswerFeedbackFor } from "@gmq/math-engine";
import {
  ALL_HERO_BLUEPRINTS,
  HERO_LIMITS,
  canonicalCorrectInput,
  defineVariants,
  expandHeroVariants,
  heroVariantsData,
  validateHeroBlueprint,
  variantId,
  type HeroQuestionBlueprint,
} from "./index";
import { handshakeParty } from "./world-huge-numbers";

const withVariants = (bp: HeroQuestionBlueprint, variants: HeroQuestionBlueprint["variants"]): HeroQuestionBlueprint => ({ ...bp, variants });

/** handshake-party's variants with one thing changed. */
function tweaked(change: { params?: { people: number }[]; standard?: { people: number }; answer?: (n: number) => number; wrongMatch?: (n: number) => string }) {
  const base = handshakeParty.variants!;
  return withVariants(
    handshakeParty,
    defineVariants<{ people: number }>({
      standard: change.standard ?? { people: 10 },
      params: change.params ?? [{ people: 6 }, { people: 8 }, { people: 9 }],
      build: (p) => {
        const content = base.build(p);
        return {
          ...content,
          answer: change.answer ? { type: "NUMERIC", value: change.answer(p.people) } : content.answer,
          wrongAnswers: change.wrongMatch
            ? [{ ...content.wrongAnswers[0], match: change.wrongMatch(p.people) }, ...content.wrongAnswers.slice(1)]
            : content.wrongAnswers,
        };
      },
    })
  );
}

const problems = (bp: HeroQuestionBlueprint) => validateHeroBlueprint(bp).filter((e) => e.startsWith("variants"));

describe("variantId", () => {
  it("is stable and order-independent", () => {
    expect(variantId({ people: 8 })).toBe("people8");
    expect(variantId({ n: 5, m: 3 })).toBe("m3-n5");
    expect(variantId({ m: 3, n: 5 })).toBe("m3-n5");
    expect(variantId({ d: 1.5 })).toBe("d1_5");
  });
});

describe("variants: build-time expansion and checks", () => {
  it("handshake-party expands to 4 variants with the formula answer and a matching scene", () => {
    const vs = expandHeroVariants(handshakeParty);
    expect(vs.map((v) => v.id)).toEqual(["people6", "people8", "people9", "people12"]);
    for (const v of vs) {
      const n = v.params.people;
      expect(v.answer).toEqual({ type: "NUMERIC", value: (n * (n - 1)) / 2 });
      expect(v.scene).toEqual({ type: "handshake_graph", people: n });
      expect(v.prompt.en).toContain(String(n));
    }
  });

  it("accepts handshake-party as written", () => {
    expect(validateHeroBlueprint(handshakeParty)).toEqual([]);
  });

  it("formula check: build(standard) must reproduce the hand-written answer", () => {
    expect(problems(tweaked({ answer: (n) => n * (n - 1) }))).toEqual(
      expect.arrayContaining([expect.stringMatching(/build\(standard\) gives answer .*90.*45/)])
    );
  });

  it("formula check: build(standard) must reproduce the hand-written scene", () => {
    expect(problems(tweaked({ standard: { people: 11 } })).some((e) => /different scene/.test(e))).toBe(true);
  });

  it("each variant passes the blueprint checks: a scene that disagrees with the answer is caught", () => {
    const bad = tweaked({ answer: (n) => (n === 10 ? 45 : n * n) });
    expect(problems(bad).some((e) => /variants\[0\] \(people6\): scene\/answer: handshake_graph asserts 15, answer is 36/.test(e))).toBe(true);
  });

  it("each variant passes the blueprint checks: a wrong-answer rule that hits the truth is caught", () => {
    const bad = tweaked({ wrongMatch: (n) => String((n * (n - 1)) / 2) });
    expect(problems(bad).some((e) => /variants\[0\].*is itself a correct answer/.test(e))).toBe(true);
  });

  it("each variant passes the blueprint checks: an out-of-range scene is caught", () => {
    expect(problems(tweaked({ params: [{ people: 6 }, { people: 8 }, { people: 20 }] })).some((e) => /variants\[2\] \(people20\): scene:/.test(e))).toBe(true);
  });

  it("needs 3-5 distinct parameter sets that differ from the standard", () => {
    expect(problems(tweaked({ params: [{ people: 6 }, { people: 8 }] }))).toContain("variants: need 3-5 parameter sets, got 2");
    expect(problems(tweaked({ params: [{ people: 6 }, { people: 6 }, { people: 8 }] })).some((e) => /duplicate parameters/.test(e))).toBe(true);
    expect(problems(tweaked({ params: [{ people: 6 }, { people: 10 }, { people: 8 }] })).some((e) => /same parameters as the standard/.test(e))).toBe(true);
  });

  it("rejects variants on answer types that can't vary", () => {
    const expression = ALL_HERO_BLUEPRINTS.find((bp) => bp.answer.type === "EXPRESSION")!;
    const bp = withVariants(expression, defineVariants({ standard: { n: 1 }, params: [{ n: 2 }, { n: 3 }, { n: 4 }], build: () => { throw new Error("unused"); } }));
    expect(problems(bp)).toEqual(["variants: EXPRESSION answers can't have variants"]);
  });

  it("reports a throwing build instead of crashing the seed", () => {
    const bp = withVariants(handshakeParty, defineVariants({ standard: { people: 10 }, params: [{ people: 6 }, { people: 7 }, { people: 8 }], build: () => { throw new Error("boom"); } }));
    expect(problems(bp)).toEqual(["variants: build(standard) throws: boom"]);
  });
});

describe("every blueprint with variants", () => {
  const withV = ALL_HERO_BLUEPRINTS.filter((bp) => bp.variants);

  it.each(withV.map((bp) => [bp.slug, bp] as const))("%s: each variant's canonical answer is accepted and every wrong rule gives feedback", (_slug, bp) => {
    const vs = expandHeroVariants(bp);
    expect(vs.length).toBeGreaterThanOrEqual(HERO_LIMITS.minVariants);
    expect(vs.length).toBeLessThanOrEqual(HERO_LIMITS.maxVariants);
    for (const v of vs) {
      const spec = AnswerSpecSchema.parse(v.answer);
      expect(parseSceneConfig(v.scene).ok, `${bp.slug}/${v.id} scene`).toBe(true);
      const correct = canonicalCorrectInput(spec, v.scene);
      expect(correct, `${bp.slug}/${v.id}`).not.toBeNull();
      expect(validateAnswerV2(correct!, spec).isCorrect, `${bp.slug}/${v.id} accepts ${correct}`).toBe(true);
      for (const rule of v.wrongAnswers) {
        if (!/^-?[\d.]+$/.test(rule.match)) continue;
        expect(wrongAnswerFeedbackFor(rule.match, spec, v.wrongAnswers)?.feedback, `${bp.slug}/${v.id} rule ${rule.match}`).toBeTruthy();
      }
    }
  });

  it("heroVariantsData stores what the API needs: the answer text and no functions", () => {
    for (const bp of withV) {
      const stored = heroVariantsData(bp);
      expect(JSON.parse(JSON.stringify(stored))).toEqual(stored);
      for (const v of stored) expect(v.answerText).not.toBe("");
    }
  });
});
