/**
 * Build-time checks for hero blueprints (README Phase 3 task 3, rubric §3.4).
 *
 * `validateHeroBlueprint()` returns human-readable problems (empty = ok).
 * `validateAllHeroBlueprints()` adds cross-blueprint checks (slug / sortOrder uniqueness)
 * and throws one aggregated error, so seed.ts can abort before touching the database.
 * Pure: no Prisma, no I/O.
 */
import {
  SHAPE_SIDES,
  binarySearchSteps,
  centreRule,
  countSquares,
  dominoTiling,
  flyTotal,
  frogMinMoves,
  handshakes,
  hasEulerPath,
  integerHypotenuse,
  isLegacySceneType,
  jugsShortestSolution,
  lcm,
  longestCollatz,
  mirrorKey,
  overlapTimes,
  parseSceneConfig,
  queensSolutions,
  ratioDenominator,
  scaleAnswer,
  seriesLimit,
  socksToGuarantee,
  staircaseWays,
  tilesAlone,
  type SceneConfig,
  type SceneConfigInput,
} from "@gmq/animation-engine";
import {
  AnswerSpecSchema,
  BiSchema,
  ChoicesSchema,
  GuessConfigSchema,
  SolutionTagsSchema,
  WrongAnswerRuleSchema,
  parseMatchRule,
  parseNumberV2,
  validateAnswerV2,
  type AnswerSpec,
  type Bi,
  type GuessOption,
  type WrongAnswerRule,
} from "@gmq/math-engine";
import { DEFAULT_HINTS } from "../us-k12-question-bank";
import {
  COLLECTION_SLUGS,
  HERO_AGE_GROUPS,
  HERO_KINDS,
  expandHeroVariants,
  variantId,
  type HeroQuestionBlueprint,
} from "./_template";
import { ALL_HERO_BLUEPRINTS, HERO_WORLDS, type HeroWorld } from "./worlds";

export const HERO_LIMITS = {
  hintCount: 3,
  hintMinChars: 15,
  ahaMaxChars: 240,
  ahaMaxSentences: 2,
  explanationMaxSentences: 4,
  funFactMaxChars: 300,
  titleMaxChars: 30,
  minWrongAnswers: 2,
  minVariants: 3,
  maxVariants: 5,
  rubricBar: 14,
  rubricMax: 20,
} as const;

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const RUBRIC_NOTES_PATTERN = /^(\d{1,2})\/20\b/;
/** The 10 rubric items (01-question-rubric.md §1) as they are named in rubricNotes. */
const RUBRIC_ITEMS = ["hook", "guess", "hands-on", "aha", "floor", "ceiling", "paths", "wrong", "hints", "retell"] as const;
const RUBRIC_ITEM_PATTERN = new RegExp(`\\b(${RUBRIC_ITEMS.join("|")}) ([012])\\b`, "g");
/** Kinds whose Act 1 is a guess (01-question-rubric.md §4: no guess -> not THREE_ACT / ESTIMATION). */
const GUESS_REQUIRED_KINDS: ReadonlySet<string> = new Set(["THREE_ACT", "ESTIMATION"]);
/** Translationese the style guide bans (rubric §5, anti-pattern 8). */
const ZH_BANNED_PHRASES = ["让我们", "这是一个", "值得注意的是"] as const;
/** Half-width punctuation touching a CJK character: Chinese copy must use full-width marks. */
const ZH_HALF_WIDTH_PUNCT = /[一-鿿][,?!;:]|[,?!;:][一-鿿]/;

const normalise = (s: string): string => s.trim().toLowerCase();
const DEFAULT_HINT_SET: ReadonlySet<string> = new Set(DEFAULT_HINTS.flatMap((h) => [normalise(h.en), normalise(h.zh)]));

/** English: terminators followed by whitespace or end. Chinese: every 。！？ run. */
export function countSentencesBi(text: Bi): { en: number; zh: number } {
  const en = text.en.trim();
  const zh = text.zh.trim();
  const enTerminators = (en.match(/[.!?]+(?=["'”’)]?(?:\s|$))/g) ?? []).length;
  const zhTerminators = (zh.match(/[。！？]+/g) ?? []).length;
  return {
    en: en === "" ? 0 : enTerminators + (/[.!?]["'”’)]?$/.test(en) ? 0 : 1),
    zh: zh === "" ? 0 : zhTerminators + (/[。！？][」』”）]?$/.test(zh) ? 0 : 1),
  };
}

/**
 * The input a child would type for a correct answer, or null when the type has none.
 * EXPRESSION answers take the first known solution of their `expression_builder` scene.
 */
export function canonicalCorrectInput(spec: AnswerSpec, scene?: SceneConfigInput): string | null {
  switch (spec.type) {
    case "NUMERIC":
      return String(spec.value);
    case "ESTIMATE":
      return String(spec.truth);
    case "CHOICE":
      return spec.correctId;
    case "MULTI_VALUE":
      return spec.values.join(", ");
    case "ORDERING":
      return spec.correctOrder.join(" > ");
    case "EXPRESSION":
      return scene?.type === "expression_builder" ? (scene.solutions?.[0] ?? null) : null;
    case "SCENE_COMPLETION":
      return null; // judged by the scene
  }
}

/** Options a CHOICE answer is picked from: explicit `choices`, else the guess options. */
export function resolveChoiceOptions(bp: Pick<HeroQuestionBlueprint, "choices" | "guess">): GuessOption[] | null {
  if (bp.choices) return bp.choices;
  if (bp.guess?.type === "choice") return bp.guess.options;
  return null;
}

/** The single number a scene asserts as the answer (catalog §1.4 redundant fields), if any. */
export function sceneTruth(scene: SceneConfig): number | null {
  switch (scene.type) {
    case "gauss_pairing":
      return scene.pairSum * scene.pairCount;
    case "handshake_graph":
      return handshakes(scene.people);
    case "grid_squares":
      return countSquares(scene.size);
    case "number_trick_stepper":
      return scene.expectFixedPoint ?? scene.expectDivisibleBy ?? null;
    // Tier-2 scenes whose explore phase proposes the answer (onProposeAnswer).
    case "scale_ladder":
      return scene.mode === "powers" ? null : scaleAnswer(scene.mode, scene.start, scene.target);
    case "halving_bar": {
      const d = ratioDenominator(scene.ratio);
      return d === null ? null : seriesLimit(d);
    }
    case "pythagoras_squares":
      return integerHypotenuse(scene.a, scene.b);
    case "clock_overlap":
      return overlapTimes(scene.hours).length;
    case "sock_drawer":
      return socksToGuarantee(scene.colors, scene.guaranteeTwoPairs ? 2 : 1);
    case "collatz_path":
      return longestCollatz(scene.highlightRange[0], scene.highlightRange[1]);
    // Tier-2 batch 3b: the scene's own helpers compute what its reveal shows.
    case "staircase_paths":
      return staircaseWays(scene.askN, scene.maxHop);
    case "pascal_triangle":
      return 2 ** (scene.askRow ?? scene.rows);
    case "calendar_grid":
      return scene.centre === undefined ? null : centreRule(scene.centre);
    case "cycle_timeline":
      return lcm(scene.a, scene.b);
    case "frog_puzzle":
      return frogMinMoves(scene.perSide);
    case "water_jugs":
      return jugsShortestSolution(scene)?.length ?? null;
    case "queens_board": {
      const all = queensSolutions(scene.n);
      return scene.dedupeMirrors ? new Set(all.map(mirrorKey)).size : all.length;
    }
    case "guess_game":
      return binarySearchSteps(scene.max);
    case "trains_fly":
      return flyTotal(scene);
    default:
      return null;
  }
}

function checkBi(label: string, value: Bi | undefined, errors: string[]): value is Bi {
  if (!value) {
    errors.push(`${label}: missing`);
    return false;
  }
  const parsed = BiSchema.safeParse(value);
  if (!parsed.success || value.en.trim() === "" || value.zh.trim() === "") {
    errors.push(`${label}: needs non-empty en and zh`);
    return false;
  }
  for (const phrase of ZH_BANNED_PHRASES) {
    if (value.zh.includes(phrase)) errors.push(`${label}.zh: contains 「${phrase}」 (rubric §5)`);
  }
  if (ZH_HALF_WIDTH_PUNCT.test(value.zh)) errors.push(`${label}.zh: half-width punctuation next to Chinese text (use ，？！；：)`);
  return true;
}

function checkMaxChars(label: string, value: Bi, max: number, errors: string[]): void {
  for (const lang of ["en", "zh"] as const) {
    if (value[lang].length > max) errors.push(`${label}.${lang}: ${value[lang].length} chars > ${max}`);
  }
}

function checkMaxSentences(label: string, value: Bi, max: number, errors: string[]): void {
  const counts = countSentencesBi(value);
  for (const lang of ["en", "zh"] as const) {
    if (counts[lang] > max) errors.push(`${label}.${lang}: ${counts[lang]} sentences > ${max}`);
  }
}

/**
 * Does `rule` fire for the correct answer? A wrong-answer rule that matches the truth
 * would either never show (correct answers skip feedback) or hide a bug in the spec.
 */
function ruleHitsCorrect(rule: WrongAnswerRule, spec: AnswerSpec, correctInput: string): string | null {
  const parsed = parseMatchRule(rule.match);
  if (!parsed) return "is not a valid match rule";
  const accepts = (input: string): boolean => validateAnswerV2(input, spec).isCorrect;
  switch (parsed.kind) {
    case "exact":
      return accepts(parsed.value) ? "is itself a correct answer" : null;
    case "regex":
      return parsed.regex.test(correctInput) ? `matches the correct input "${correctInput}"` : null;
    case "choice":
      return spec.type === "CHOICE" && parsed.id === spec.correctId ? "names the correct option" : null;
    case "gt":
    case "lt": {
      if (parsed.than === "correct") return null; // relative to the truth by construction
      if (spec.type === "NUMERIC") {
        const hit = parsed.kind === "gt" ? spec.value > parsed.than : spec.value < parsed.than;
        return hit ? `${rule.match} includes the correct value ${spec.value}` : null;
      }
      if (spec.type === "ESTIMATE") {
        const hit = parsed.kind === "gt" ? parsed.than < spec.max : parsed.than > spec.min;
        return hit ? `${rule.match} overlaps the accepted range [${spec.min}, ${spec.max}]` : null;
      }
      return null;
    }
    case "offByFactor": {
      const n = parseNumberV2(correctInput);
      if (n === null) return null;
      return accepts(String(n * parsed.factor)) || accepts(String(n / parsed.factor))
        ? `${rule.match} fires on the correct value`
        : null;
    }
  }
}

function checkWrongAnswers(bp: HeroQuestionBlueprint, spec: AnswerSpec, options: GuessOption[] | null, errors: string[]): void {
  if (bp.wrongAnswers.length < HERO_LIMITS.minWrongAnswers) {
    errors.push(`wrongAnswers: ${bp.wrongAnswers.length} < ${HERO_LIMITS.minWrongAnswers}`);
  }
  const correctInput = canonicalCorrectInput(spec, bp.scene);
  const seen = new Set<string>();
  bp.wrongAnswers.forEach((rule, i) => {
    const label = `wrongAnswers[${i}] (${rule.match})`;
    if (!WrongAnswerRuleSchema.safeParse(rule).success) {
      errors.push(`${label}: malformed rule`);
      return;
    }
    checkBi(`${label}.feedback`, rule.feedback, errors);
    if (seen.has(rule.match)) errors.push(`${label}: duplicate match`);
    seen.add(rule.match);

    const parsed = parseMatchRule(rule.match);
    if (parsed?.kind === "choice") {
      if (spec.type !== "CHOICE") errors.push(`${label}: choice: rules only apply to CHOICE answers`);
      else if (!options?.some((o) => o.id === parsed.id)) errors.push(`${label}: unknown option id "${parsed.id}"`);
    }
    if (spec.type === "CHOICE" && parsed && parsed.kind !== "choice" && parsed.kind !== "exact") {
      errors.push(`${label}: CHOICE answers only take choice:/exact rules`);
    }
    if (correctInput !== null) {
      const problem = ruleHitsCorrect(rule, spec, correctInput);
      if (problem) errors.push(`${label}: ${problem}`);
    }
  });
}

/** Scene vs answer, where both carry the truth. */
function checkSceneAnswer(scene: SceneConfig, spec: AnswerSpec, errors: string[]): void {
  if (scene.type === "monty_hall") {
    if (spec.type !== "CHOICE" || spec.correctId !== "switch") {
      errors.push(`scene/answer: monty_hall needs a CHOICE answer with correctId "switch"`);
    }
    return;
  }
  if (scene.type === "domino_tiling") {
    // Same copy convention as bridges_trace: CHOICE "possible" / "impossible".
    const want = dominoTiling(scene) !== null ? "possible" : "impossible";
    if (spec.type !== "CHOICE" || spec.correctId !== want) {
      errors.push(`scene/answer: domino_tiling ${want === "possible" ? "can" : "can't"} be tiled, so the answer must be CHOICE "${want}"`);
    }
    return;
  }
  if (scene.type === "tiling_lab") {
    // MULTI_VALUE answers name the tilers by their number of sides ("3, 4, 6"): typed on a number pad, same in both languages.
    const truth = scene.shapes.map((s) => SHAPE_SIDES[s]).filter(tilesAlone).sort((a, b) => a - b).map(String);
    if (spec.type !== "MULTI_VALUE") {
      errors.push(`scene/answer: tiling_lab needs a MULTI_VALUE answer (sides of the shapes that tile alone)`);
    } else if ([...spec.values].sort((a, b) => Number(a) - Number(b)).join() !== truth.join()) {
      errors.push(`scene/answer: tiling_lab's tilers have ${truth.join(", ")} sides, answer is ${spec.values.join(", ")}`);
    }
    return;
  }
  if (scene.type === "expression_builder") {
    if (spec.type !== "EXPRESSION") {
      errors.push(`scene/answer: expression_builder needs an EXPRESSION answer`);
      return;
    }
    const sameList = (a: readonly (number | string)[], b: readonly (number | string)[]) => [...a].map(String).sort().join() === [...b].map(String).sort().join();
    if (scene.target !== spec.target) errors.push(`scene/answer: expression_builder target ${scene.target}, answer target ${spec.target}`);
    if (!sameList(scene.allowedNumbers, spec.allowedNumbers)) errors.push(`scene/answer: expression_builder numbers ${scene.allowedNumbers.join(",")} differ from the answer's ${spec.allowedNumbers.join(",")}`);
    if (!sameList(scene.allowedOps, spec.allowedOps)) errors.push(`scene/answer: expression_builder ops ${scene.allowedOps.join(" ")} differ from the answer's ${spec.allowedOps.join(" ")}`);
    const solutions = scene.solutions ?? [];
    if (solutions.length === 0) errors.push(`scene/answer: expression_builder needs at least one listed solution (it is the canonical correct input)`);
    // Every solution the reveal shows must make the target with exactly the allowed numbers (math-engine evaluator).
    for (const s of solutions) {
      if (!validateAnswerV2(s, spec).isCorrect) errors.push(`scene/answer: listed solution "${s}" is not a correct EXPRESSION answer`);
    }
    return;
  }
  if (scene.type === "bridges_trace") {
    // Euler's rule decides the walk; the copy convention is a CHOICE between "possible" and "impossible".
    const want = hasEulerPath(scene) ? "possible" : "impossible";
    if (spec.type === "CHOICE" && spec.correctId !== want) {
      errors.push(`scene/answer: bridges_trace ${want === "possible" ? "has" : "has no"} Euler walk, so correctId must be "${want}"`);
    }
    return;
  }
  const truth = sceneTruth(scene);
  if (truth === null) return;
  if (spec.type === "ESTIMATE") {
    // An estimate only has to bracket what the scene shows (e.g. 11.574 days in [11, 12]).
    if (truth < spec.min || truth > spec.max) {
      errors.push(`scene/answer: ${scene.type} asserts ${truth}, outside the accepted range [${spec.min}, ${spec.max}]`);
    }
    return;
  }
  let answerTruth: number | null = null;
  if (spec.type === "NUMERIC") answerTruth = spec.value;
  else if (spec.type === "CHOICE") answerTruth = parseNumberV2(spec.correctId);
  if (answerTruth === null) {
    errors.push(`scene/answer: ${scene.type} asserts ${truth} but the ${spec.type} answer carries no number to compare`);
  } else if (answerTruth !== truth) {
    errors.push(`scene/answer: ${scene.type} asserts ${truth}, answer is ${answerTruth}`);
  }
}

/** Every problem with one blueprint; empty when it is publishable. */
export function validateHeroBlueprint(bp: HeroQuestionBlueprint): string[] {
  const errors: string[] = [];

  if (!SLUG_PATTERN.test(bp.slug)) errors.push(`slug: "${bp.slug}" is not kebab-case`);
  if (!(COLLECTION_SLUGS as readonly string[]).includes(bp.collection)) errors.push(`collection: unknown "${bp.collection}"`);
  if (!(HERO_KINDS as readonly string[]).includes(bp.kind)) errors.push(`kind: "${bp.kind}" is not a hero kind`);
  if (!(HERO_AGE_GROUPS as readonly string[]).includes(bp.ageGroup)) {
    errors.push(`ageGroup: "${bp.ageGroup}" must be one of ${HERO_AGE_GROUPS.join(", ")}`);
  }
  if (!Number.isInteger(bp.sortOrder) || bp.sortOrder < 1 || bp.sortOrder > 99) errors.push(`sortOrder: must be an integer 1-99`);

  // Bilingual text.
  if (checkBi("title", bp.title, errors)) checkMaxChars("title", bp.title, HERO_LIMITS.titleMaxChars, errors);
  checkBi("hook", bp.hook, errors);
  checkBi("prompt", bp.prompt, errors);
  if (checkBi("explanation", bp.explanation, errors)) {
    checkMaxSentences("explanation", bp.explanation, HERO_LIMITS.explanationMaxSentences, errors);
  }
  if (checkBi("aha", bp.aha, errors)) {
    checkMaxChars("aha", bp.aha, HERO_LIMITS.ahaMaxChars, errors);
    checkMaxSentences("aha", bp.aha, HERO_LIMITS.ahaMaxSentences, errors);
  }
  checkBi("extension", bp.extension, errors);
  checkBi("discussionPrompt", bp.discussionPrompt, errors);
  if (bp.funFact !== undefined && checkBi("funFact", bp.funFact, errors)) {
    checkMaxChars("funFact", bp.funFact, HERO_LIMITS.funFactMaxChars, errors);
  }

  // Hints.
  if (!Array.isArray(bp.hints) || bp.hints.length !== HERO_LIMITS.hintCount) {
    errors.push(`hints: need exactly ${HERO_LIMITS.hintCount}, got ${Array.isArray(bp.hints) ? bp.hints.length : 0}`);
  }
  (bp.hints ?? []).forEach((h, i) => {
    if (!checkBi(`hints[${i}]`, h, errors)) return;
    for (const lang of ["en", "zh"] as const) {
      if (DEFAULT_HINT_SET.has(normalise(h[lang]))) errors.push(`hints[${i}].${lang}: is a DEFAULT_HINTS text`);
      if (h[lang].trim().length < HERO_LIMITS.hintMinChars) {
        errors.push(`hints[${i}].${lang}: ${h[lang].trim().length} chars < ${HERO_LIMITS.hintMinChars}`);
      }
    }
  });
  if (Array.isArray(bp.hints) && new Set(bp.hints.map((h) => normalise(h.en))).size !== bp.hints.length) {
    errors.push("hints: duplicate hint text");
  }

  // Guess.
  if (bp.guess !== undefined) {
    const guess = GuessConfigSchema.safeParse(bp.guess);
    if (!guess.success) errors.push(`guess: ${guess.error.issues.map((i) => i.message).join("; ")}`);
  } else if (GUESS_REQUIRED_KINDS.has(bp.kind)) {
    errors.push(`guess: required for kind ${bp.kind}`);
  }

  // Solution tags.
  if (!SolutionTagsSchema.safeParse(bp.solutionTags).success || bp.solutionTags.length === 0) {
    errors.push("solutionTags: need at least one valid tag");
  } else if (new Set(bp.solutionTags).size !== bp.solutionTags.length) {
    errors.push("solutionTags: duplicates");
  }

  // Rubric score.
  const score = RUBRIC_NOTES_PATTERN.exec(bp.rubricNotes ?? "");
  if (!score) {
    errors.push(`rubricNotes: must start with "NN/20"`);
  } else {
    const n = Number(score[1]);
    if (n > HERO_LIMITS.rubricMax) errors.push(`rubricNotes: ${n}/20 is above the maximum`);
    else if (n < HERO_LIMITS.rubricBar) errors.push(`rubricNotes: ${n}/20 is below the publishing bar of ${HERO_LIMITS.rubricBar}`);
    const items = [...bp.rubricNotes.matchAll(RUBRIC_ITEM_PATTERN)];
    if (items.length > 0) {
      const sum = items.reduce((total, m) => total + Number(m[2]), 0);
      if (items.length !== RUBRIC_ITEMS.length) errors.push(`rubricNotes: lists ${items.length} of ${RUBRIC_ITEMS.length} items`);
      else if (sum !== n) errors.push(`rubricNotes: item scores add up to ${sum}, not ${n}`);
    }
  }

  // Scene.
  const scene = parseSceneConfig(bp.scene);
  if (!scene.ok) {
    errors.push(`scene: ${scene.error}`);
  } else if (isLegacySceneType(scene.config.type)) {
    errors.push(`scene: legacy type "${scene.config.type}" is for DRILL questions only`);
  }

  // Answer.
  const parsedSpec = AnswerSpecSchema.safeParse(bp.answer);
  if (!parsedSpec.success) {
    errors.push(`answer: ${parsedSpec.error.issues.map((i) => i.message).join("; ")}`);
    return errors;
  }
  const spec = parsedSpec.data;
  const options = resolveChoiceOptions(bp);
  if (spec.type === "CHOICE") {
    if (!options) {
      errors.push("answer: CHOICE needs `choices` or a choice-type guess to take options from");
    } else {
      if (!ChoicesSchema.safeParse(options).success) errors.push("choices: need 2-12 options with unique ids");
      if (!options.some((o) => o.id === spec.correctId)) errors.push(`answer: correctId "${spec.correctId}" is not an option`);
      options.forEach((o, i) => checkBi(`choices[${i}]`, o, errors));
    }
  } else if (bp.choices) {
    errors.push(`choices: only CHOICE answers take options (answer is ${spec.type})`);
  }

  const correctInput = canonicalCorrectInput(spec, bp.scene);
  if (correctInput !== null && !validateAnswerV2(correctInput, spec).isCorrect) {
    errors.push(`answer: validateAnswerV2 rejects the canonical correct input "${correctInput}"`);
  }

  checkWrongAnswers(bp, spec, options, errors);
  if (scene.ok) checkSceneAnswer(scene.config, spec, errors);

  if (bp.variants !== undefined) checkVariants(bp, spec, errors);

  return errors;
}

/**
 * Answer types a variant may use. EXPRESSION needs per-variant number rules, SCENE_COMPLETION has no typed
 * answer, and ORDERING takes its items from the standard guess, which a variant doesn't carry.
 */
const VARIANT_ANSWER_TYPES: ReadonlySet<string> = new Set(["NUMERIC", "ESTIMATE", "CHOICE", "MULTI_VALUE"]);

const sameJson = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);

/**
 * "Try another number": the formula must reproduce the standard version, and every expanded
 * variant must pass the same checks as a blueprint (scene parses and agrees with the answer,
 * wrong-answer rules miss the truth, three real hints, aha/explanation limits).
 */
function checkVariants(bp: HeroQuestionBlueprint, spec: AnswerSpec, errors: string[]): void {
  const v = bp.variants!;
  if (!VARIANT_ANSWER_TYPES.has(spec.type)) {
    errors.push(`variants: ${spec.type} answers can't have variants`);
    return;
  }
  if (v.params.length < HERO_LIMITS.minVariants || v.params.length > HERO_LIMITS.maxVariants) {
    errors.push(`variants: need ${HERO_LIMITS.minVariants}-${HERO_LIMITS.maxVariants} parameter sets, got ${v.params.length}`);
  }
  const keys = Object.keys(v.standard).sort().join();
  const standardId = variantId(v.standard);

  let standard;
  try {
    standard = v.build(v.standard);
  } catch (e) {
    errors.push(`variants: build(standard) throws: ${(e as Error).message}`);
    return;
  }
  if (!sameJson(standard.answer, bp.answer)) {
    errors.push(`variants: build(standard) gives answer ${JSON.stringify(standard.answer)}, the blueprint says ${JSON.stringify(bp.answer)}`);
  }
  if (!sameJson(parseSceneConfig(standard.scene), parseSceneConfig(bp.scene))) {
    errors.push(`variants: build(standard) gives a different scene from the blueprint's`);
  }

  const ids = new Set<string>();
  v.params.forEach((p, i) => {
    const id = variantId(p);
    const label = `variants[${i}] (${id})`;
    if (Object.keys(p).sort().join() !== keys) errors.push(`${label}: parameters must be the standard's (${keys})`);
    if (Object.values(p).some((x) => !Number.isFinite(x))) errors.push(`${label}: parameters must be finite numbers`);
    if (id === standardId) errors.push(`${label}: same parameters as the standard version`);
    if (ids.has(id)) errors.push(`${label}: duplicate parameters`);
    ids.add(id);
  });

  let expanded;
  try {
    expanded = expandHeroVariants(bp);
  } catch (e) {
    errors.push(`variants: build throws: ${(e as Error).message}`);
    return;
  }
  const prompts = new Set([normalise(bp.prompt.en)]);
  expanded.forEach((variant, i) => {
    const label = `variants[${i}] (${variant.id})`;
    if (variant.answer.type !== spec.type) errors.push(`${label}: answer type ${variant.answer.type}, the standard is ${spec.type}`);
    // An ESTIMATE variant answers on the standard version's slider (VariantPlay keeps it), so its range must be on it.
    if (variant.answer.type === "ESTIMATE" && bp.guess?.type === "slider" && (variant.answer.min < bp.guess.min || variant.answer.max > bp.guess.max)) {
      errors.push(`${label}: accepted range [${variant.answer.min}, ${variant.answer.max}] is off the slider [${bp.guess.min}, ${bp.guess.max}]`);
    }
    if (prompts.has(normalise(variant.prompt.en))) errors.push(`${label}: prompt is the same as another version's; put the numbers in it`);
    prompts.add(normalise(variant.prompt.en));
    // The variant replaces only these fields, so checking it as a blueprint covers exactly them.
    const asBlueprint: HeroQuestionBlueprint = {
      ...bp,
      prompt: variant.prompt,
      scene: variant.scene,
      answer: variant.answer,
      choices: variant.choices ?? bp.choices,
      hints: variant.hints,
      wrongAnswers: variant.wrongAnswers,
      explanation: variant.explanation,
      aha: variant.aha,
      variants: undefined,
    };
    for (const problem of validateHeroBlueprint(asBlueprint)) errors.push(`${label}: ${problem}`);
  });
}

/** Problems across a set of blueprints, keyed by slug (or `#index` when the slug is blank). */
export function collectHeroBlueprintErrors(blueprints: readonly HeroQuestionBlueprint[]): Map<string, string[]> {
  const problems = new Map<string, string[]>();
  const add = (key: string, msgs: string[]) => {
    if (msgs.length > 0) problems.set(key, [...(problems.get(key) ?? []), ...msgs]);
  };
  const slugCount = new Map<string, number>();
  const orderSlots = new Map<string, string>();
  const legacyTitles = new Map<string, string>();

  blueprints.forEach((bp, i) => {
    const key = bp.slug || `#${i}`;
    add(key, validateHeroBlueprint(bp));
    slugCount.set(bp.slug, (slugCount.get(bp.slug) ?? 0) + 1);

    const slot = `${bp.collection}/${bp.sortOrder}`;
    const other = orderSlots.get(slot);
    if (other !== undefined) add(key, [`sortOrder: ${bp.sortOrder} already used in ${bp.collection} by "${other}"`]);
    else orderSlots.set(slot, bp.slug);

    if (bp.upgradesLegacyTitleEn !== undefined) {
      const owner = legacyTitles.get(bp.upgradesLegacyTitleEn);
      if (owner !== undefined) add(key, [`upgradesLegacyTitleEn: "${bp.upgradesLegacyTitleEn}" already upgraded by "${owner}"`]);
      else legacyTitles.set(bp.upgradesLegacyTitleEn, bp.slug);
    }
  });
  for (const [slug, n] of slugCount) {
    if (n > 1) add(slug, [`slug: "${slug}" is used by ${n} blueprints`]);
  }
  return problems;
}

export class HeroBlueprintValidationError extends Error {
  constructor(readonly problems: Map<string, string[]>) {
    const lines = [...problems].flatMap(([slug, msgs]) => [`  ${slug}:`, ...msgs.map((m) => `    - ${m}`)]);
    super(`Hero question validation failed (${problems.size} blueprint(s)):\n${lines.join("\n")}`);
    this.name = "HeroBlueprintValidationError";
  }
}

/** Each world file may only hold blueprints for its own collection. */
export function collectWorldErrors(worlds: readonly HeroWorld[]): Map<string, string[]> {
  const problems = new Map<string, string[]>();
  for (const world of worlds) {
    for (const bp of world.blueprints) {
      if (bp.collection !== world.slug) {
        problems.set(bp.slug, [`collection: "${bp.collection}" but listed in world "${world.slug}"`]);
      }
    }
  }
  return problems;
}

/**
 * Validates every hero blueprint (default: all worlds) and throws one readable,
 * aggregated `HeroBlueprintValidationError` when anything is wrong.
 */
export function validateAllHeroBlueprints(
  blueprints: readonly HeroQuestionBlueprint[] = ALL_HERO_BLUEPRINTS,
  worlds: readonly HeroWorld[] = HERO_WORLDS
): void {
  const problems = collectHeroBlueprintErrors(blueprints);
  for (const [slug, msgs] of collectWorldErrors(worlds)) problems.set(slug, [...(problems.get(slug) ?? []), ...msgs]);
  if (problems.size > 0) throw new HeroBlueprintValidationError(problems);
}
