import { Prisma, PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { buildUSK12QuestionBank } from "./us-k12-question-bank";
import { buildHeroQuestions, HERO_WORLDS, heroQuestionData, type HeroQuestionBlueprint } from "./hero-questions";
import { KNOWLEDGE_POINT_TAXONOMY } from "@gmq/math-engine";

const prisma = new PrismaClient();

type SeedQuestionLike = {
  animationConfig?: Record<string, unknown>;
};

type CommunityBoostConfig = {
  enabled: boolean;
  randomUserCount: number;
  randomCommentCount: number;
};

const COMMUNITY_EMAIL_DOMAINS = ["@seed.gmq.local", "@community.gmq.local"];

function parseBooleanFlag(value: string | undefined, fallback = false): boolean {
  if (value === undefined) return fallback;
  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
}

function parseIntWithBounds(
  value: string | undefined,
  fallback: number,
  min: number,
  max: number
): number {
  const parsed = Number.parseInt(value ?? "", 10);
  if (Number.isNaN(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function randomFrom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function resolveCommunityBoostConfig(): CommunityBoostConfig {
  const enabled = parseBooleanFlag(process.env.SEED_COMMUNITY_BOOST, false);
  const randomUserCount = enabled
    ? parseIntWithBounds(process.env.SEED_RANDOM_USER_COUNT, 50, 0, 200)
    : 0;
  const randomCommentCount = enabled
    ? parseIntWithBounds(
        process.env.SEED_RANDOM_COMMENT_COUNT,
        Math.max(300, randomUserCount * 8),
        0,
        5000
      )
    : 0;

  return { enabled, randomUserCount, randomCommentCount };
}

function buildTopicHint(
  question: { category: string; difficulty: string; titleEn?: string; contentEn?: string },
  locale: "en" | "zh"
): string {
  const text = `${question.titleEn ?? ""} ${question.contentEn ?? ""}`.toLowerCase();

  const byCategoryEn: Record<string, string[]> = {
    ARITHMETIC: ["mental math rhythm", "number splitting", "quick estimation"],
    ALGEBRA: ["setting up the equation", "isolating the variable", "reverse-checking"],
    GEOMETRY: ["angle relationships", "shape structure", "drawing a neat sketch"],
    FRACTIONS: ["common denominators", "fraction simplification", "visual partitioning"],
    NUMBER_THEORY: ["factor patterns", "divisibility rules", "prime structure"],
    WORD_PROBLEMS: ["translating words into equations", "unit tracking", "step-by-step modeling"],
    LOGIC: ["elimination logic", "case-by-case reasoning", "constraint checking"],
    PROBABILITY: ["sample space counting", "outcome mapping", "careful case counting"],
  };
  const byCategoryZh: Record<string, string[]> = {
    ARITHMETIC: ["心算节奏", "数字拆分", "先估后算"],
    ALGEBRA: ["列方程", "移项与化简", "倒推验算"],
    GEOMETRY: ["角度关系", "图形结构", "先画草图"],
    FRACTIONS: ["通分思路", "约分技巧", "分块可视化"],
    NUMBER_THEORY: ["因数规律", "整除规则", "质数结构"],
    WORD_PROBLEMS: ["文字转方程", "单位一致性", "分步建模"],
    LOGIC: ["排除法", "分类讨论", "条件约束检查"],
    PROBABILITY: ["样本空间", "结果枚举", "分情况计数"],
  };

  const difficultyToneEn: Record<string, string> = {
    EASY: "Great warm-up",
    MEDIUM: "Nice mid-level challenge",
    HARD: "This one is seriously competitive",
    CHALLENGE: "Boss-level question",
  };
  const difficultyToneZh: Record<string, string> = {
    EASY: "很好的热身题",
    MEDIUM: "中等强度，刚刚好",
    HARD: "这题有竞赛味道",
    CHALLENGE: "这题是BOSS级别",
  };

  const defaultEn = ["core pattern spotting"];
  const defaultZh = ["抓核心规律"];
  const tech =
    locale === "zh"
      ? randomFrom(byCategoryZh[question.category] ?? defaultZh)
      : randomFrom(byCategoryEn[question.category] ?? defaultEn);
  const tone =
    locale === "zh"
      ? difficultyToneZh[question.difficulty] ?? "这题挺有意思"
      : difficultyToneEn[question.difficulty] ?? "Interesting problem";
  const strategyTail =
    locale === "zh"
      ? randomFrom(["，我先理清条件关系再推进。", "，我先抓住已知与未知的连接。", "，我先把步骤拆小再求解。"])
      : randomFrom([
          ", I mapped knowns to unknowns first.",
          ", I broke the steps into small chunks first.",
          ", I clarified the constraints before computing.",
        ]);

  return locale === "zh"
    ? `${tone}，关键在${tech}${strategyTail}`
    : `${tone}; the key was ${tech}${strategyTail}`;
}

function buildEngagingComment(
  question: { category: string; difficulty: string; titleEn?: string; contentEn?: string },
  locale: "en" | "zh"
): string {
  const openersEn = [
    "I used two methods and both landed on the same result",
    "This looked hard at first, but the structure is super clean",
    "I almost overcomplicated this one before spotting the shortcut",
    "This is exactly the kind of problem that makes discussion fun",
    "I retried it after a mistake and learned more on the second pass",
    "I timed myself, then redid it slowly to verify every step",
  ];
  const openersZh = [
    "我用了两种方法，最后答案一致，特别踏实",
    "第一眼觉得难，做完发现结构很清晰",
    "我差点想复杂了，后来发现有捷径",
    "这种题特别适合在评论区交流思路",
    "我第一次做错，第二遍纠正后收获更大",
    "我先计时做一遍，再慢速复盘一遍",
  ];
  const callsEn = [
    "What method did you use?",
    "Anyone solved it with a completely different path?",
    "Drop your fastest clean solution below.",
    "Curious whether others went visual first or algebra first.",
  ];
  const callsZh = [
    "你是怎么做的？",
    "有人用了完全不同的路径吗？",
    "欢迎晒一下你最快又最稳的解法。",
    "大家是先画图还是先列式？",
  ];

  const topicHint = buildTopicHint(question, locale);
  const opener = locale === "zh" ? randomFrom(openersZh) : randomFrom(openersEn);
  const call = locale === "zh" ? randomFrom(callsZh) : randomFrom(callsEn);

  return locale === "zh" ? `${opener}。${topicHint}${call}` : `${opener}. ${topicHint} ${call}`;
}

async function seedCommunityBoost(config: CommunityBoostConfig) {
  if (!config.enabled) return;

  const questions = await prisma.question.findMany({
    select: { id: true, category: true, difficulty: true, titleEn: true, contentEn: true },
  });

  if (questions.length === 0) {
    console.log("ℹ️ Community boost skipped: no questions found.");
    return;
  }

  const createdUsers: Array<{ id: string; locale: string }> = [];
  const hashedPassword = await bcrypt.hash("demo123", 12);
  const baseToken = Date.now().toString(36).slice(-5);
  const firstNamesEn = [
    "Liam",
    "Olivia",
    "Noah",
    "Emma",
    "Ethan",
    "Ava",
    "Lucas",
    "Mia",
    "Henry",
    "Sofia",
    "Jackson",
    "Harper",
  ];
  const lastNamesEn = [
    "Turner",
    "Brooks",
    "Hayes",
    "Morgan",
    "Bennett",
    "Foster",
    "Carter",
    "Reed",
    "Parker",
    "Diaz",
    "Chen",
    "Wang",
  ];
  const zhDisplayNames = [
    "李子涵",
    "王浩然",
    "张雨桐",
    "陈思源",
    "刘嘉宁",
    "赵欣怡",
    "黄宇辰",
    "周一诺",
    "吴梓萌",
    "徐俊熙",
  ];
  const zhHandles = [
    "li_zihan",
    "wang_haoran",
    "zhang_yutong",
    "chen_siyuan",
    "liu_jianing",
    "zhao_xinyi",
    "huang_yuchen",
    "zhou_yinuo",
    "wu_zimeng",
    "xu_junxi",
  ];

  for (let i = 0; i < config.randomUserCount; i++) {
    const locale: "en" | "zh" = Math.random() < 0.35 ? "zh" : "en";
    const seq = `${i.toString().padStart(2, "0")}${randomInt(10, 99)}`;
    const displayName =
      locale === "zh"
        ? randomFrom(zhDisplayNames)
        : `${randomFrom(firstNamesEn)} ${randomFrom(lastNamesEn)}`;
    const username =
      locale === "zh"
        ? `${randomFrom(zhHandles)}_${baseToken}${seq}`
        : `${randomFrom(firstNamesEn).toLowerCase()}_${randomFrom(lastNamesEn).toLowerCase()}_${baseToken}${seq}`;
    const age = randomInt(8, 16);
    const xp = randomInt(20, 1800);
    const level = Math.max(1, Math.floor(xp / 100) + 1);

    const user = await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        displayName,
        email: `${username}@community.gmq.local`,
        age,
        parentEmail: `parent+${username}@community.gmq.local`,
        authMethod: "PARENT_EMAIL",
        locale,
        xp,
        level,
        streak: randomInt(0, 30),
      },
      select: { id: true, locale: true },
    });

    createdUsers.push(user);
  }

  if (createdUsers.length === 0 || config.randomCommentCount <= 0) {
    console.log(
      `✅ Community boost finished (users +${createdUsers.length}, comments +0)`
    );
    return;
  }

  const commentRows: Prisma.CommentCreateManyInput[] = [];
  const existingComments = await prisma.comment.findMany({
    select: { content: true },
  });
  const globalUsedComments = new Set<string>(
    existingComments.map((c) => c.content.trim()).filter(Boolean)
  );
  const perQuestionUsedComments = new Map<string, Set<string>>();
  const uniqueRunToken = Date.now().toString(36).slice(-6);
  let uniqueSuffixCounter = 0;
  const variantTailsEn = [
    "I am bookmarking this one.",
    "This deserves more upvotes.",
    "Would love a follow-up at the same level.",
    "Great one for discussion practice.",
  ];
  const variantTailsZh = [
    "这题我先收藏了。",
    "这题值得更多点赞。",
    "希望有同风格的下一题。",
    "非常适合拿来讨论训练。",
  ];

  for (let i = 0; i < config.randomCommentCount; i++) {
    const author = randomFrom(createdUsers);
    const commentLocale: "en" | "zh" = author.locale === "zh" ? "zh" : "en";
    const question = randomFrom(questions);
    const createdAt = new Date(
      Date.now() - randomInt(0, 1000 * 60 * 60 * 24 * 45)
    );

    const usedForQuestion =
      perQuestionUsedComments.get(question.id) ?? new Set<string>();
    perQuestionUsedComments.set(question.id, usedForQuestion);

    let content = "";
    let attempts = 0;
    while (attempts < 24) {
      const base = buildEngagingComment(question, commentLocale);
      const withVariant =
        attempts === 0
          ? base
          : commentLocale === "zh"
            ? `${base} ${randomFrom(variantTailsZh)}`
            : `${base} ${randomFrom(variantTailsEn)}`;

      if (!usedForQuestion.has(withVariant) && !globalUsedComments.has(withVariant)) {
        content = withVariant;
        break;
      }
      attempts += 1;
    }

    if (!content) {
      const fallback =
        commentLocale === "zh"
          ? `${buildEngagingComment(question, commentLocale)} 讨论标记#${uniqueRunToken}-${++uniqueSuffixCounter}。`
          : `${buildEngagingComment(question, commentLocale)} Discussion marker #${uniqueRunToken}-${++uniqueSuffixCounter}.`;
      content = fallback;
      while (usedForQuestion.has(content) || globalUsedComments.has(content)) {
        content =
          commentLocale === "zh"
            ? `${buildEngagingComment(question, commentLocale)} 讨论标记#${uniqueRunToken}-${++uniqueSuffixCounter}。`
            : `${buildEngagingComment(question, commentLocale)} Discussion marker #${uniqueRunToken}-${++uniqueSuffixCounter}.`;
      }
    }
    usedForQuestion.add(content);
    globalUsedComments.add(content);

    commentRows.push({
      questionId: question.id,
      userId: author.id,
      content,
      isApproved: true,
      isFlagged: false,
      createdAt,
      updatedAt: createdAt,
    });
  }

  await prisma.comment.createMany({
    data: commentRows,
  });

  console.log(
    `✅ Community boost finished (users +${createdUsers.length}, comments +${commentRows.length})`
  );
}

async function cleanupCommunityBoostUsers() {
  const where: Prisma.UserWhereInput = {
    OR: [
      ...COMMUNITY_EMAIL_DOMAINS.map((domain) => ({ email: { endsWith: domain } })),
      ...COMMUNITY_EMAIL_DOMAINS.map((domain) => ({ parentEmail: { endsWith: domain } })),
    ],
  };

  const targetCount = await prisma.user.count({ where });
  if (targetCount === 0) {
    console.log("ℹ️ Community cleanup: no generated users found.");
    return;
  }

  await prisma.user.deleteMany({ where });
  console.log(`🧹 Community cleanup complete (users removed: ${targetCount}).`);
}

/**
 * The question's authored scene config, or `{}` (no scene). No keyword inference: GEOMETRY
 * used to be re-guessed from text ("angle" -> a 60/60/60 triangle), which README §0.3 rule 2
 * forbids. An empty config means the question page shows no animation card.
 */
function normalizeAnimationConfig(q: SeedQuestionLike): Record<string, unknown> {
  return q.animationConfig && Object.keys(q.animationConfig).length > 0 ? q.animationConfig : {};
}

/** Upsert the six worlds by slug. Safe in every mode: Collection rows hold no user data. */
async function seedCollections(): Promise<Map<string, string>> {
  const ids = new Map<string, string>();
  for (const world of HERO_WORLDS) {
    const data = {
      titleEn: world.title.en,
      titleZh: world.title.zh,
      descEn: world.description.en,
      descZh: world.description.zh,
      emoji: world.emoji,
      colorToken: world.colorToken,
      sortOrder: world.sortOrder,
    };
    const row = await prisma.collection.upsert({
      where: { slug: world.slug },
      update: data,
      create: { slug: world.slug, ...data },
      select: { id: true },
    });
    ids.set(world.slug, row.id);
  }
  console.log(`  ✓ ${HERO_WORLDS.length} collections upserted`);
  return ids;
}

/**
 * Upsert hero questions by slug. A blueprint with `upgradesLegacyTitleEn` takes over that
 * legacy row in place (same id, so submissions, comments and links survive) the first time;
 * afterwards the row is found by its slug. Tags are reset so the grade-tag pass below
 * re-derives them from the hero age group.
 */
async function seedHeroQuestions(
  blueprints: readonly HeroQuestionBlueprint[],
  collectionIds: ReadonlyMap<string, string>
): Promise<{ created: number; updated: number; upgraded: number }> {
  const worldOrder = new Map(HERO_WORLDS.map((w) => [w.slug, w.sortOrder] as const));
  const counts = { created: 0, updated: 0, upgraded: 0 };

  for (const bp of blueprints) {
    const collectionId = collectionIds.get(bp.collection);
    const worldSortOrder = worldOrder.get(bp.collection);
    if (!collectionId || worldSortOrder === undefined) throw new Error(`Hero question ${bp.slug}: unknown collection ${bp.collection}`);
    const data = heroQuestionData(bp, { collectionId, worldSortOrder });

    const bySlug = await prisma.question.findUnique({ where: { slug: bp.slug }, select: { id: true } });
    if (bySlug) {
      await prisma.question.update({ where: { id: bySlug.id }, data: { ...data, tags: { deleteMany: {} } } });
      counts.updated++;
      continue;
    }

    if (bp.upgradesLegacyTitleEn) {
      const legacy = await prisma.question.findMany({
        where: { titleEn: bp.upgradesLegacyTitleEn, slug: null },
        select: { id: true },
        take: 2,
      });
      if (legacy.length > 1) throw new Error(`Hero question ${bp.slug}: legacy title "${bp.upgradesLegacyTitleEn}" is ambiguous`);
      if (legacy.length === 1) {
        await prisma.question.update({ where: { id: legacy[0].id }, data: { ...data, tags: { deleteMany: {} } } });
        counts.upgraded++;
        continue;
      }
      console.warn(`  ⚠️ ${bp.slug}: legacy row "${bp.upgradesLegacyTitleEn}" not found; creating a new question`);
    }

    await prisma.question.create({ data });
    counts.created++;
  }
  return counts;
}

async function main() {
  const seedMode = (process.env.SEED_MODE ?? "full").toLowerCase();
  const questionsOnly = seedMode === "questions_only";
  const cleanupOnly = seedMode === "community_cleanup";
  const cleanupRequested = parseBooleanFlag(process.env.SEED_COMMUNITY_CLEANUP, false);
  const communityBoostConfig = resolveCommunityBoostConfig();

  const modeLabel = cleanupOnly ? "community_cleanup" : questionsOnly ? "questions_only" : "full";
  console.log(`🌱 Seeding database... (mode: ${modeLabel})`);
  // Validate hero blueprints before touching the database: a bad blueprint aborts the seed.
  const heroBlueprints = cleanupOnly ? [] : buildHeroQuestions();
  if (cleanupRequested || cleanupOnly) {
    await cleanupCommunityBoostUsers();
    if (cleanupOnly) {
      console.log("🎯 Community cleanup complete.");
      return;
    }
  }
  if (communityBoostConfig.enabled) {
    console.log(
      `🎲 Community boost enabled (new users: ${communityBoostConfig.randomUserCount}, comments: ${communityBoostConfig.randomCommentCount})`
    );
  }

  if (!questionsOnly) {
    // Development full reset: make script repeatable
    await prisma.userKnowledgePointMastery.deleteMany();
    await prisma.knowledgePoint.deleteMany();
    await prisma.challengeParticipant.deleteMany();
    await prisma.challenge.deleteMany();
    await prisma.comment.deleteMany();
    await prisma.submission.deleteMany();
    await prisma.questionLike.deleteMany();
    await prisma.tagsOnQuestions.deleteMany();
    await prisma.question.deleteMany();
    await prisma.userBadge.deleteMany();
    await prisma.badge.deleteMany();
    await prisma.session.deleteMany();
    await prisma.account.deleteMany();
    await prisma.user.deleteMany();
    await prisma.classroom.deleteMany();
    await prisma.tag.deleteMany();
  } else {
    console.log("ℹ️ questions_only mode: preserving users, XP, submissions, classrooms, badges, and sessions.");
  }

  // Create tags
  const tags = await Promise.all([
    prisma.tag.upsert({
      where: { nameEn: "Fun" },
      update: {},
      create: { nameEn: "Fun", nameZh: "趣味" },
    }),
    prisma.tag.upsert({
      where: { nameEn: "Visual" },
      update: {},
      create: { nameEn: "Visual", nameZh: "可视化" },
    }),
    prisma.tag.upsert({
      where: { nameEn: "Real World" },
      update: {},
      create: { nameEn: "Real World", nameZh: "现实世界" },
    }),
    prisma.tag.upsert({
      where: { nameEn: "Brain Teaser" },
      update: {},
      create: { nameEn: "Brain Teaser", nameZh: "脑筋急转弯" },
    }),
    prisma.tag.upsert({
      where: { nameEn: "Classic" },
      update: {},
      create: { nameEn: "Classic", nameZh: "经典" },
    }),
    prisma.tag.upsert({
      where: { nameEn: "GRADE_4" },
      update: {},
      create: { nameEn: "GRADE_4", nameZh: "四年级闯关" },
    }),
    prisma.tag.upsert({
      where: { nameEn: "GRADE_5" },
      update: {},
      create: { nameEn: "GRADE_5", nameZh: "五年级闯关" },
    }),
    prisma.tag.upsert({
      where: { nameEn: "GRADE_6" },
      update: {},
      create: { nameEn: "GRADE_6", nameZh: "六年级闯关" },
    }),
    prisma.tag.upsert({
      where: { nameEn: "GRADE_7" },
      update: {},
      create: { nameEn: "GRADE_7", nameZh: "七年级闯关" },
    }),
    prisma.tag.upsert({
      where: { nameEn: "GRADE_8" },
      update: {},
      create: { nameEn: "GRADE_8", nameZh: "八年级闯关" },
    }),
    prisma.tag.upsert({
      where: { nameEn: "KNOWLEDGE_CHECK" },
      update: {},
      create: { nameEn: "KNOWLEDGE_CHECK", nameZh: "知识检查" },
    }),
  ]);

  // Seed knowledge points for mastery tracking
  for (let i = 0; i < KNOWLEDGE_POINT_TAXONOMY.length; i++) {
    const kp = KNOWLEDGE_POINT_TAXONOMY[i];
    await prisma.knowledgePoint.upsert({
      where: { slug: kp.slug },
      update: {},
      create: {
        slug: kp.slug,
        domain: kp.domain as any,
        nameEn: kp.nameEn,
        nameZh: kp.nameZh,
        minLevel: kp.minLevel,
        maxLevel: kp.maxLevel,
        sortOrder: i,
      },
    });
  }
  console.log(`  ✓ ${KNOWLEDGE_POINT_TAXONOMY.length} knowledge points seeded`);

  // ============================================================
  // 56 BILINGUAL MATH QUESTIONS
  // Categories: ARITHMETIC, ALGEBRA, GEOMETRY, FRACTIONS,
  //             NUMBER_THEORY, WORD_PROBLEMS, LOGIC, PROBABILITY
  // ============================================================
  const questions = [
    // ─── ARITHMETIC (7 questions) ────────────────────────────
    {
      titleEn: "Speed Math Race",
      titleZh: "速算竞赛",
      contentEn: "What is 25 × 4? Tip: Think of a clever shortcut!",
      contentZh: "25 × 4 等于多少？提示：想想有没有什么巧妙的方法！",
      difficulty: "EASY" as const,
      category: "ARITHMETIC" as const,
      ageGroup: "AGE_8_10" as const,
      answer: "100",
      answerExplainEn: "25 × 4 = 100! A quick way to remember: 4 quarters make $1.00, and 25 cents × 4 = 100 cents!",
      answerExplainZh: "25 × 4 = 100！快速记忆法：25分钱 × 4 = 100分钱 = 1元！",
      hints: [
        { en: "Think about money: how many quarters in a dollar?", zh: "想想钱：一元钱有几个25分？" },
        { en: "25 + 25 = 50, and 50 + 50 = ?", zh: "25 + 25 = 50，50 + 50 = ?" },
      ],
      animationConfig: { type: "number_combine", numbers: [25, 25, 25, 25], operation: "add" },
      funFactEn: "Ancient Egyptian mathematicians only used addition and doubling to multiply!",
      funFactZh: "古埃及数学家只用加法和倍增来做乘法！",
      isPublished: true,
      sortOrder: 1,
    },
    {
      titleEn: "The Double-Double Trick",
      titleZh: "翻倍再翻倍",
      contentEn: "What is 17 × 4? Hint: try doubling 17 twice!",
      contentZh: "17 × 4 等于多少？提示：试试把17翻倍两次！",
      difficulty: "EASY" as const,
      category: "ARITHMETIC" as const,
      ageGroup: "AGE_8_10" as const,
      answer: "68",
      answerExplainEn: "Double 17 to get 34. Double 34 to get 68. So 17 × 4 = 68!",
      answerExplainZh: "17翻倍得34，34再翻倍得68。所以17 × 4 = 68！",
      hints: [
        { en: "Multiplying by 4 is the same as doubling twice", zh: "乘以4就是翻倍两次" },
        { en: "17 × 2 = 34, now double again", zh: "17 × 2 = 34，再翻倍一次" },
      ],
      animationConfig: { type: "number_combine", numbers: [17, 17, 17, 17], operation: "add" },
      funFactEn: "This doubling trick is called 'Russian peasant multiplication' and works for any number!",
      funFactZh: "这个翻倍技巧叫做「俄国农民乘法」，对任何数字都有效！",
      isPublished: true,
      sortOrder: 2,
    },
    {
      titleEn: "Number Neighbors",
      titleZh: "数字邻居",
      contentEn: "What is 99 + 47? Can you find a shortcut?",
      contentZh: "99 + 47 等于多少？你能找到捷径吗？",
      difficulty: "EASY" as const,
      category: "ARITHMETIC" as const,
      ageGroup: "AGE_8_10" as const,
      answer: "146",
      answerExplainEn: "Think of 99 as 100 - 1. So 99 + 47 = 100 + 47 - 1 = 146!",
      answerExplainZh: "把99想成100 - 1。所以99 + 47 = 100 + 47 - 1 = 146！",
      hints: [
        { en: "99 is very close to a round number", zh: "99离一个整数很近" },
        { en: "99 = 100 - 1", zh: "99 = 100 - 1" },
      ],
      animationConfig: { type: "number_journey", range: [90, 150], highlights: [99, 100, 146, 147] },
      funFactEn: "Mental math tricks like this are used by 'mathemagicians' who do live math shows!",
      funFactZh: "这样的心算技巧被「数学魔术师」用在现场表演中！",
      isPublished: true,
      sortOrder: 3,
    },
    {
      titleEn: "The Hungry Calculator",
      titleZh: "饥饿的计算器",
      contentEn: "If you multiply 111 × 111, what do you get?",
      contentZh: "111 × 111 等于多少？",
      difficulty: "MEDIUM" as const,
      category: "ARITHMETIC" as const,
      ageGroup: "AGE_10_12" as const,
      answer: "12321",
      answerExplainEn: "111 × 111 = 12321. Notice the beautiful palindrome pattern: 1-2-3-2-1!",
      answerExplainZh: "111 × 111 = 12321。注意这个美丽的回文模式：1-2-3-2-1！",
      hints: [
        { en: "Try breaking it down: 111 × 100 + 111 × 11", zh: "试试拆分：111 × 100 + 111 × 11" },
        { en: "Look at 11 × 11 = 121 for a pattern hint", zh: "看看11 × 11 = 121找找规律" },
      ],
      animationConfig: { type: "number_combine", numbers: [111, 111], operation: "multiply" },
      funFactEn: "These palindrome patterns continue: 1111 × 1111 = 1234321!",
      funFactZh: "这些回文模式还会继续：1111 × 1111 = 1234321！",
      isPublished: true,
      sortOrder: 4,
    },
    {
      titleEn: "Order of Operations Quest",
      titleZh: "运算顺序大冒险",
      contentEn: "What is 3 + 4 × 5?",
      contentZh: "3 + 4 × 5 等于多少？",
      difficulty: "MEDIUM" as const,
      category: "ARITHMETIC" as const,
      ageGroup: "AGE_10_12" as const,
      answer: "23",
      answerExplainEn: "Remember PEMDAS! Multiplication comes before addition. 4 × 5 = 20, then 3 + 20 = 23!",
      answerExplainZh: "记住运算顺序！先乘除后加减。4 × 5 = 20，然后3 + 20 = 23！",
      hints: [
        { en: "Which operation should you do first?", zh: "你应该先做哪个运算？" },
        { en: "Multiplication before addition!", zh: "先乘后加！" },
      ],
      animationConfig: { type: "number_combine", numbers: [3, 4, 5], operation: "mixed" },
      funFactEn: "The order of operations is the same in every country in the world!",
      funFactZh: "运算顺序在全世界每个国家都是一样的！",
      isPublished: true,
      sortOrder: 5,
    },
    {
      titleEn: "The Power Tower",
      titleZh: "幂次塔",
      contentEn: "What is 2⁵ (2 to the power of 5)?",
      contentZh: "2⁵（2的5次方）等于多少？",
      difficulty: "MEDIUM" as const,
      category: "ARITHMETIC" as const,
      ageGroup: "AGE_10_12" as const,
      answer: "32",
      answerExplainEn: "2⁵ = 2×2×2×2×2 = 32. You double 5 times: 2→4→8→16→32!",
      answerExplainZh: "2⁵ = 2×2×2×2×2 = 32。你翻倍5次：2→4→8→16→32！",
      hints: [
        { en: "2⁵ means multiply 2 by itself 5 times", zh: "2⁵ 表示2乘以自己5次" },
        { en: "Start: 2, 4, 8, 16, ...", zh: "开始：2, 4, 8, 16, ..." },
      ],
      animationConfig: { type: "number_journey", range: [1, 35], highlights: [2, 4, 8, 16, 32] },
      funFactEn: "Powers of 2 are fundamental to computers! Your phone uses them billions of times per second!",
      funFactZh: "2的幂次是计算机的基础！你的手机每秒使用它们数十亿次！",
      isPublished: true,
      sortOrder: 6,
    },
    {
      titleEn: "The Giant Product",
      titleZh: "巨大的乘积",
      contentEn: "What is 999 × 5? Use a clever trick!",
      contentZh: "999 × 5 等于多少？用巧妙的方法！",
      difficulty: "HARD" as const,
      category: "ARITHMETIC" as const,
      ageGroup: "AGE_12_14" as const,
      answer: "4995",
      answerExplainEn: "999 × 5 = (1000 - 1) × 5 = 5000 - 5 = 4995!",
      answerExplainZh: "999 × 5 = (1000 - 1) × 5 = 5000 - 5 = 4995！",
      hints: [
        { en: "999 is close to what round number?", zh: "999接近哪个整数？" },
        { en: "999 = 1000 - 1, so use the distributive property", zh: "999 = 1000 - 1，用分配律" },
      ],
      animationConfig: { type: "number_combine", numbers: [999, 5], operation: "multiply" },
      funFactEn: "The distributive property is one of the most useful tricks in all of mathematics!",
      funFactZh: "分配律是数学中最有用的技巧之一！",
      isPublished: true,
      sortOrder: 7,
    },

    // ─── ALGEBRA (7 questions) ───────────────────────────────
    {
      titleEn: "The Mystery Number",
      titleZh: "神秘数字",
      contentEn: "I am a number. When you multiply me by 6 and add 4, you get 40. What am I?",
      contentZh: "我是一个数字。当你把我乘以6再加4，你得到40。我是什么？",
      difficulty: "MEDIUM" as const,
      category: "ALGEBRA" as const,
      ageGroup: "AGE_10_12" as const,
      answer: "6",
      answerExplainEn: "Let the mystery number be x. 6x + 4 = 40. Subtract 4: 6x = 36. Divide by 6: x = 6!",
      answerExplainZh: "设神秘数字为x。6x + 4 = 40。减去4：6x = 36。除以6：x = 6！",
      hints: [
        { en: "Write it as an equation: 6 × ? + 4 = 40", zh: "写成方程：6 × ? + 4 = 40" },
        { en: "First, subtract 4 from both sides", zh: "首先，两边都减4" },
        { en: "6 × ? = 36. Now divide by 6", zh: "6 × ? = 36。现在除以6" },
      ],
      animationConfig: { type: "balance_scale", leftSide: { expression: "6x + 4" }, rightSide: { value: 40 } },
      funFactEn: "Algebra was invented by Al-Khwarizmi around 820 AD. The word 'algorithm' comes from his name!",
      funFactZh: "代数是花拉子米在公元820年左右发明的。'算法'一词就来源于他的名字！",
      isPublished: true,
      sortOrder: 8,
    },
    {
      titleEn: "The Twin Equation",
      titleZh: "双胞胎方程",
      contentEn: "If x + y = 10 and x - y = 4, what is x?",
      contentZh: "如果 x + y = 10 且 x - y = 4，x等于多少？",
      difficulty: "HARD" as const,
      category: "ALGEBRA" as const,
      ageGroup: "AGE_12_14" as const,
      answer: "7",
      answerExplainEn: "Add both equations: (x+y) + (x-y) = 10 + 4, so 2x = 14, x = 7!",
      answerExplainZh: "两个方程相加：(x+y) + (x-y) = 10 + 4，所以2x = 14，x = 7！",
      hints: [
        { en: "What happens when you add the two equations together?", zh: "把两个方程加在一起会怎样？" },
        { en: "The y terms cancel out!", zh: "y项会被消掉！" },
        { en: "2x = 14", zh: "2x = 14" },
      ],
      animationConfig: { type: "balance_scale", leftSide: { expression: "x + y" }, rightSide: { value: 10 } },
      funFactEn: "This is called 'elimination method' and was used by Chinese mathematicians over 2000 years ago!",
      funFactZh: "这叫做「消元法」，中国数学家2000多年前就在使用了！",
      isPublished: true,
      sortOrder: 9,
    },
    {
      titleEn: "The Secret Code",
      titleZh: "秘密密码",
      contentEn: "If 3a = 15, what is 5a + 2?",
      contentZh: "如果 3a = 15，那么 5a + 2 等于多少？",
      difficulty: "EASY" as const,
      category: "ALGEBRA" as const,
      ageGroup: "AGE_8_10" as const,
      answer: "27",
      answerExplainEn: "First find a: 3a = 15, so a = 5. Then 5a + 2 = 5×5 + 2 = 25 + 2 = 27!",
      answerExplainZh: "先求a：3a = 15，所以a = 5。然后5a + 2 = 5×5 + 2 = 25 + 2 = 27！",
      hints: [
        { en: "First, find what 'a' equals", zh: "先找出'a'等于多少" },
        { en: "3a = 15, so a = ?", zh: "3a = 15，所以a = ?" },
        { en: "Now plug a = 5 into 5a + 2", zh: "现在把a = 5代入5a + 2" },
      ],
      animationConfig: { type: "balance_scale", leftSide: { expression: "3a" }, rightSide: { value: 15 } },
      funFactEn: "Letters in math equations are called 'variables' because their values can vary!",
      funFactZh: "数学方程中的字母叫做「变量」，因为它们的值可以变化！",
      isPublished: true,
      sortOrder: 10,
    },
    {
      titleEn: "The Age Riddle",
      titleZh: "年龄谜题",
      contentEn: "Tom is twice as old as Sam. Together their ages add up to 18. How old is Tom?",
      contentZh: "汤姆的年龄是山姆的两倍。他们的年龄加起来是18岁。汤姆多大？",
      difficulty: "MEDIUM" as const,
      category: "ALGEBRA" as const,
      ageGroup: "AGE_10_12" as const,
      answer: "12",
      answerExplainEn: "Let Sam = x, Tom = 2x. Then x + 2x = 18, so 3x = 18, x = 6. Tom = 2×6 = 12!",
      answerExplainZh: "设山姆 = x，汤姆 = 2x。那么x + 2x = 18，所以3x = 18，x = 6。汤姆 = 2×6 = 12！",
      hints: [
        { en: "Let Sam's age be x. What's Tom's age in terms of x?", zh: "设山姆的年龄为x。汤姆的年龄用x怎么表示？" },
        { en: "x + 2x = 18", zh: "x + 2x = 18" },
        { en: "3x = 18, so x = 6", zh: "3x = 18，所以x = 6" },
      ],
      animationConfig: { type: "balance_scale", leftSide: { expression: "x + 2x" }, rightSide: { value: 18 } },
      funFactEn: "Age problems are one of the oldest types of algebra puzzles, dating back thousands of years!",
      funFactZh: "年龄问题是最古老的代数谜题之一，有数千年的历史！",
      isPublished: true,
      sortOrder: 11,
    },
    {
      titleEn: "The Pattern Finder",
      titleZh: "规律发现者",
      contentEn: "What is the next number in the pattern: 2, 6, 18, 54, ?",
      contentZh: "下列数列的下一个数是什么：2, 6, 18, 54, ?",
      difficulty: "MEDIUM" as const,
      category: "ALGEBRA" as const,
      ageGroup: "AGE_10_12" as const,
      answer: "162",
      answerExplainEn: "Each number is multiplied by 3! 2×3=6, 6×3=18, 18×3=54, 54×3=162!",
      answerExplainZh: "每个数都乘以3！2×3=6, 6×3=18, 18×3=54, 54×3=162！",
      hints: [
        { en: "How do you get from 2 to 6?", zh: "从2怎么变成6的？" },
        { en: "Each number is multiplied by the same value", zh: "每个数都乘以相同的值" },
        { en: "The multiplier is 3", zh: "乘数是3" },
      ],
      animationConfig: { type: "number_journey", range: [0, 170], highlights: [2, 6, 18, 54, 162] },
      funFactEn: "This is called a geometric sequence. It's how bacteria multiply — one becomes billions!",
      funFactZh: "这叫做等比数列。细菌就是这样繁殖的——一个变成数十亿！",
      isPublished: true,
      sortOrder: 12,
    },
    {
      titleEn: "The Backward Calculator",
      titleZh: "倒推计算器",
      contentEn: "I think of a number, subtract 7, then multiply by 3 and get 27. What was my number?",
      contentZh: "我想了一个数，减去7，然后乘以3，得到27。我想的数是什么？",
      difficulty: "HARD" as const,
      category: "ALGEBRA" as const,
      ageGroup: "AGE_12_14" as const,
      answer: "16",
      answerExplainEn: "Work backwards: 27 ÷ 3 = 9, then 9 + 7 = 16. Check: (16-7)×3 = 9×3 = 27 ✓",
      answerExplainZh: "倒推：27 ÷ 3 = 9，然后9 + 7 = 16。验证：(16-7)×3 = 9×3 = 27 ✓",
      hints: [
        { en: "Try working backwards from the answer", zh: "试试从答案倒推" },
        { en: "Undo the multiplication: 27 ÷ 3 = ?", zh: "撤销乘法：27 ÷ 3 = ?" },
        { en: "Undo the subtraction: 9 + 7 = ?", zh: "撤销减法：9 + 7 = ?" },
      ],
      animationConfig: { type: "balance_scale", leftSide: { expression: "(x-7)×3" }, rightSide: { value: 27 } },
      funFactEn: "Working backwards is called 'inverse operations' — a key skill in cryptography!",
      funFactZh: "倒推叫做「逆运算」——是密码学中的关键技能！",
      isPublished: true,
      sortOrder: 13,
    },
    {
      titleEn: "The Growth Formula",
      titleZh: "增长公式",
      contentEn: "A plant doubles in height every week. After 6 weeks it's 64cm. How tall was it after 4 weeks?",
      contentZh: "一株植物每周长高一倍。6周后它有64厘米高。4周后它有多高？",
      difficulty: "CHALLENGE" as const,
      category: "ALGEBRA" as const,
      ageGroup: "AGE_12_14" as const,
      answer: "16",
      answerExplainEn: "Go backwards: Week 6 = 64, Week 5 = 32, Week 4 = 16cm!",
      answerExplainZh: "倒推：第6周 = 64，第5周 = 32，第4周 = 16厘米！",
      hints: [
        { en: "If it doubles each week, go backwards by halving", zh: "如果每周翻倍，倒推就除以2" },
        { en: "Week 6: 64 → Week 5: 32 → Week 4: ?", zh: "第6周：64 → 第5周：32 → 第4周：?" },
      ],
      animationConfig: { type: "number_journey", range: [0, 70], highlights: [1, 2, 4, 8, 16, 32, 64] },
      funFactEn: "Exponential growth is why compound interest is called 'the most powerful force in the universe'!",
      funFactZh: "指数增长就是复利被称为「宇宙中最强大的力量」的原因！",
      isPublished: true,
      sortOrder: 14,
    },

    // ─── GEOMETRY (7 questions) ──────────────────────────────
    {
      titleEn: "Triangle Detective",
      titleZh: "三角形侦探",
      contentEn: "A triangle has angles of 60° and 80°. What is the third angle?",
      contentZh: "一个三角形有60°和80°的角。第三个角是多少度？",
      difficulty: "EASY" as const,
      category: "GEOMETRY" as const,
      ageGroup: "AGE_8_10" as const,
      answer: "40",
      answerExplainEn: "All angles in a triangle add up to 180°. 60° + 80° + ? = 180°. ? = 40°!",
      answerExplainZh: "三角形的所有角之和等于180°。60° + 80° + ? = 180°。? = 40°！",
      hints: [
        { en: "All angles in a triangle add up to 180°", zh: "三角形的所有角之和等于180°" },
        { en: "60° + 80° = 140°", zh: "60° + 80° = 140°" },
        { en: "180° - 140° = ?", zh: "180° - 140° = ?" },
      ],
      animationConfig: { type: "triangle_angles", angles: [60, 80, 40] },
      funFactEn: "The ancient Egyptians used triangles to build the pyramids over 4,500 years ago!",
      funFactZh: "古埃及人在4500多年前就用三角形来建造金字塔！",
      isPublished: true,
      sortOrder: 15,
    },
    {
      titleEn: "The Garden Fence",
      titleZh: "花园围栏",
      contentEn: "A rectangular garden is 8m long and 5m wide. How many meters of fence do you need to go all the way around?",
      contentZh: "一个长方形花园长8米，宽5米。围一圈需要多少米的围栏？",
      difficulty: "EASY" as const,
      category: "GEOMETRY" as const,
      ageGroup: "AGE_8_10" as const,
      answer: "26",
      answerExplainEn: "Perimeter = 2 × (length + width) = 2 × (8 + 5) = 2 × 13 = 26 meters!",
      answerExplainZh: "周长 = 2 × (长 + 宽) = 2 × (8 + 5) = 2 × 13 = 26米！",
      hints: [
        { en: "Perimeter means the distance all the way around", zh: "周长就是绕一圈的距离" },
        { en: "A rectangle has 2 lengths and 2 widths", zh: "长方形有2条长和2条宽" },
      ],
      animationConfig: { type: "number_combine", numbers: [8, 5, 8, 5], operation: "add" },
      funFactEn: "The word 'perimeter' comes from Greek: 'peri' (around) + 'meter' (measure)!",
      funFactZh: "周长的英文perimeter来自希腊语：'peri'（周围）+ 'meter'（测量）！",
      isPublished: true,
      sortOrder: 16,
    },
    {
      titleEn: "The Tiling Challenge",
      titleZh: "铺砖挑战",
      contentEn: "A room floor is 6m by 4m. Each tile is 1m × 1m. How many tiles do you need?",
      contentZh: "一个房间地板是6米×4米。每块瓷砖是1米×1米。你需要多少块瓷砖？",
      difficulty: "EASY" as const,
      category: "GEOMETRY" as const,
      ageGroup: "AGE_8_10" as const,
      answer: "24",
      answerExplainEn: "Area = length × width = 6 × 4 = 24 square meters = 24 tiles!",
      answerExplainZh: "面积 = 长 × 宽 = 6 × 4 = 24平方米 = 24块瓷砖！",
      hints: [
        { en: "You need to find the area of the room", zh: "你需要求房间的面积" },
        { en: "Area = length × width", zh: "面积 = 长 × 宽" },
      ],
      animationConfig: { type: "magic_square", size: 4, targetSum: 24, known: {} },
      funFactEn: "Tiling patterns are studied in a branch of math called 'tessellations'!",
      funFactZh: "铺砖图案在数学中叫做「镶嵌」！",
      isPublished: true,
      sortOrder: 17,
    },
    {
      titleEn: "Circle Adventure",
      titleZh: "圆形冒险",
      contentEn: "A circle has a radius of 7cm. What is its diameter?",
      contentZh: "一个圆的半径是7厘米。它的直径是多少？",
      difficulty: "EASY" as const,
      category: "GEOMETRY" as const,
      ageGroup: "AGE_8_10" as const,
      answer: "14",
      answerExplainEn: "The diameter is twice the radius. Diameter = 2 × 7 = 14cm!",
      answerExplainZh: "直径是半径的两倍。直径 = 2 × 7 = 14厘米！",
      hints: [
        { en: "The diameter goes all the way across through the center", zh: "直径穿过圆心到达另一边" },
        { en: "Diameter = 2 × radius", zh: "直径 = 2 × 半径" },
      ],
      animationConfig: { type: "triangle_angles", angles: [180, 180, 0] },
      funFactEn: "The ratio of a circle's circumference to its diameter is π (pi) ≈ 3.14159..., which goes on forever!",
      funFactZh: "圆的周长与直径的比值是π（圆周率）≈ 3.14159...，它的小数位永远不会结束！",
      isPublished: true,
      sortOrder: 18,
    },
    {
      titleEn: "The Angle Hunter",
      titleZh: "角度猎人",
      contentEn: "Two lines cross to make an X. One angle is 65°. What is the angle directly opposite it?",
      contentZh: "两条直线交叉形成X形。其中一个角是65°。正对面的角是多少度？",
      difficulty: "MEDIUM" as const,
      category: "GEOMETRY" as const,
      ageGroup: "AGE_10_12" as const,
      answer: "65",
      answerExplainEn: "When two lines cross, opposite angles (vertical angles) are always equal! So the answer is 65°!",
      answerExplainZh: "两条直线相交时，对顶角总是相等的！所以答案是65°！",
      hints: [
        { en: "These are called 'vertical angles' or 'opposite angles'", zh: "这些叫做「对顶角」" },
        { en: "Vertical angles are always equal", zh: "对顶角总是相等的" },
      ],
      animationConfig: { type: "triangle_angles", angles: [65, 115, 65] },
      funFactEn: "Vertical angles being equal was first proven by Euclid over 2300 years ago!",
      funFactZh: "对顶角相等最早由欧几里得在2300多年前证明！",
      isPublished: true,
      sortOrder: 19,
    },
    {
      titleEn: "The Pyramid Builder",
      titleZh: "金字塔建造者",
      contentEn: "A square pyramid has a square base. How many faces (flat surfaces) does it have in total?",
      contentZh: "一个正四棱锥有一个正方形底面。它总共有多少个面？",
      difficulty: "MEDIUM" as const,
      category: "GEOMETRY" as const,
      ageGroup: "AGE_10_12" as const,
      answer: "5",
      answerExplainEn: "1 square base + 4 triangular sides = 5 faces total!",
      answerExplainZh: "1个正方形底面 + 4个三角形侧面 = 总共5个面！",
      hints: [
        { en: "Count the base first", zh: "先数底面" },
        { en: "How many triangular sides does a square base have?", zh: "正方形底面有几个三角形侧面？" },
      ],
      animationConfig: { type: "triangle_angles", angles: [60, 60, 60] },
      funFactEn: "The Great Pyramid of Giza has faces that are almost perfect triangles — only off by 0.025°!",
      funFactZh: "吉萨大金字塔的面几乎是完美的三角形——只偏差了0.025°！",
      isPublished: true,
      sortOrder: 20,
    },
    {
      titleEn: "The Right Triangle Secret",
      titleZh: "直角三角形的秘密",
      contentEn: "A right triangle has legs of length 3 and 4. What is the hypotenuse?",
      contentZh: "一个直角三角形的两条直角边长度是3和4。斜边是多少？",
      difficulty: "HARD" as const,
      category: "GEOMETRY" as const,
      ageGroup: "AGE_12_14" as const,
      answer: "5",
      answerExplainEn: "Pythagorean theorem: a² + b² = c². 3² + 4² = 9 + 16 = 25. √25 = 5!",
      answerExplainZh: "勾股定理：a² + b² = c²。3² + 4² = 9 + 16 = 25。√25 = 5！",
      hints: [
        { en: "Use the Pythagorean theorem: a² + b² = c²", zh: "用勾股定理：a² + b² = c²" },
        { en: "3² + 4² = 9 + 16 = ?", zh: "3² + 4² = 9 + 16 = ?" },
        { en: "What number squared equals 25?", zh: "什么数的平方等于25？" },
      ],
      animationConfig: { type: "triangle_angles", angles: [37, 53, 90] },
      funFactEn: "The 3-4-5 triangle was used by ancient builders. They tied knots at 3-4-5 intervals to make right angles!",
      funFactZh: "3-4-5三角形被古代建筑师使用。他们在绳子上每隔3-4-5打结来制作直角！",
      isPublished: true,
      sortOrder: 21,
    },

    // ─── FRACTIONS (7 questions) ─────────────────────────────
    {
      titleEn: "The Pizza Problem",
      titleZh: "披萨问题",
      contentEn: "If you cut a pizza into 8 equal slices and eat 3, what fraction of the pizza is left?",
      contentZh: "如果你把一个披萨切成8等份，吃了3片，剩下的披萨是多少？",
      difficulty: "EASY" as const,
      category: "FRACTIONS" as const,
      ageGroup: "AGE_8_10" as const,
      answer: "5/8",
      answerExplainEn: "You started with 8 slices and ate 3. That leaves 5/8 of the pizza!",
      answerExplainZh: "你开始有8片，吃了3片。剩下5/8的披萨！",
      hints: [
        { en: "How many slices are left?", zh: "还剩几片？" },
        { en: "8 - 3 = 5 slices out of 8", zh: "8 - 3 = 5片，总共8片" },
      ],
      animationConfig: { type: "pizza_slice", totalSlices: 8, eatenSlices: 3 },
      funFactEn: "The word 'fraction' comes from the Latin 'fractio' meaning 'to break'!",
      funFactZh: "分数在古埃及最早被使用来分配尼罗河土地！",
      isPublished: true,
      sortOrder: 22,
    },
    {
      titleEn: "The Chocolate Bar",
      titleZh: "巧克力棒",
      contentEn: "You eat 1/4 of a chocolate bar, then 1/4 more. What fraction have you eaten in total?",
      contentZh: "你吃了一块巧克力的1/4，然后又吃了1/4。你总共吃了多少？",
      difficulty: "EASY" as const,
      category: "FRACTIONS" as const,
      ageGroup: "AGE_8_10" as const,
      answer: "1/2",
      answerExplainEn: "1/4 + 1/4 = 2/4 = 1/2. You ate half the chocolate bar!",
      answerExplainZh: "1/4 + 1/4 = 2/4 = 1/2。你吃了半块巧克力！",
      hints: [
        { en: "Add the fractions: 1/4 + 1/4", zh: "把分数加起来：1/4 + 1/4" },
        { en: "2/4 can be simplified", zh: "2/4可以化简" },
      ],
      animationConfig: { type: "pizza_slice", totalSlices: 4, eatenSlices: 2 },
      funFactEn: "The first chocolate bar was made in 1847 by Joseph Fry in England!",
      funFactZh: "第一块巧克力棒是1847年由英国的约瑟夫·弗莱制作的！",
      isPublished: true,
      sortOrder: 23,
    },
    {
      titleEn: "The Fraction Race",
      titleZh: "分数赛跑",
      contentEn: "Which is bigger: 3/5 or 2/3?",
      contentZh: "哪个更大：3/5 还是 2/3？",
      difficulty: "MEDIUM" as const,
      category: "FRACTIONS" as const,
      ageGroup: "AGE_10_12" as const,
      answer: "2/3",
      answerExplainEn: "Find a common denominator: 3/5 = 9/15, 2/3 = 10/15. Since 10/15 > 9/15, 2/3 is bigger!",
      answerExplainZh: "通分：3/5 = 9/15，2/3 = 10/15。因为10/15 > 9/15，所以2/3更大！",
      hints: [
        { en: "Convert both fractions to the same denominator", zh: "把两个分数通分" },
        { en: "The common denominator of 5 and 3 is 15", zh: "5和3的公分母是15" },
        { en: "3/5 = 9/15 and 2/3 = 10/15", zh: "3/5 = 9/15，2/3 = 10/15" },
      ],
      animationConfig: { type: "pizza_slice", totalSlices: 15, eatenSlices: 10 },
      funFactEn: "Ancient Egyptians only used unit fractions like 1/2, 1/3, 1/4. They wrote 2/5 as 1/3 + 1/15!",
      funFactZh: "古埃及人只用单位分数如1/2, 1/3, 1/4。他们把2/5写成1/3 + 1/15！",
      isPublished: true,
      sortOrder: 24,
    },
    {
      titleEn: "The Sharing Problem",
      titleZh: "分享难题",
      contentEn: "3 friends share 2 pizzas equally. What fraction of a pizza does each friend get?",
      contentZh: "3个朋友平分2个披萨。每人能得到多少披萨？",
      difficulty: "MEDIUM" as const,
      category: "FRACTIONS" as const,
      ageGroup: "AGE_10_12" as const,
      answer: "2/3",
      answerExplainEn: "2 pizzas ÷ 3 friends = 2/3 of a pizza each!",
      answerExplainZh: "2个披萨 ÷ 3个朋友 = 每人2/3个披萨！",
      hints: [
        { en: "Division and fractions are related", zh: "除法和分数是有关系的" },
        { en: "2 ÷ 3 = ?/?", zh: "2 ÷ 3 = ?/?" },
      ],
      animationConfig: { type: "pizza_slice", totalSlices: 3, eatenSlices: 2 },
      funFactEn: "The fraction bar (÷) is called an 'obelus' and was first used in 1659!",
      funFactZh: "除号（÷）叫做「方尖标」，最早在1659年被使用！",
      isPublished: true,
      sortOrder: 25,
    },
    {
      titleEn: "Mixed Number Mastery",
      titleZh: "带分数大师",
      contentEn: "Convert 7/4 to a mixed number.",
      contentZh: "把7/4转换成带分数。",
      difficulty: "MEDIUM" as const,
      category: "FRACTIONS" as const,
      ageGroup: "AGE_10_12" as const,
      answer: "1 3/4",
      answerExplainEn: "7 ÷ 4 = 1 remainder 3. So 7/4 = 1 and 3/4!",
      answerExplainZh: "7 ÷ 4 = 1余3。所以7/4 = 1又3/4！",
      hints: [
        { en: "How many times does 4 go into 7?", zh: "7里面有几个4？" },
        { en: "7 ÷ 4 = 1 remainder ?", zh: "7 ÷ 4 = 1余?" },
      ],
      animationConfig: { type: "pizza_slice", totalSlices: 4, eatenSlices: 3 },
      funFactEn: "Mixed numbers are used in cooking all the time — '1 and 3/4 cups of flour'!",
      funFactZh: "带分数在烹饪中经常用到——'1又3/4杯面粉'！",
      isPublished: true,
      sortOrder: 26,
    },
    {
      titleEn: "The Fraction Multiplication",
      titleZh: "分数乘法",
      contentEn: "What is 2/3 × 3/4?",
      contentZh: "2/3 × 3/4 等于多少？",
      difficulty: "HARD" as const,
      category: "FRACTIONS" as const,
      ageGroup: "AGE_12_14" as const,
      answer: "1/2",
      answerExplainEn: "Multiply numerators: 2×3 = 6. Multiply denominators: 3×4 = 12. 6/12 = 1/2!",
      answerExplainZh: "分子相乘：2×3 = 6。分母相乘：3×4 = 12。6/12 = 1/2！",
      hints: [
        { en: "Multiply top × top and bottom × bottom", zh: "分子乘分子，分母乘分母" },
        { en: "2×3 = 6 and 3×4 = 12", zh: "2×3 = 6，3×4 = 12" },
        { en: "Simplify 6/12", zh: "化简6/12" },
      ],
      animationConfig: { type: "pizza_slice", totalSlices: 12, eatenSlices: 6 },
      funFactEn: "Multiplying fractions is actually easier than adding them — no common denominators needed!",
      funFactZh: "分数乘法实际上比分数加法简单——不需要通分！",
      isPublished: true,
      sortOrder: 27,
    },
    {
      titleEn: "The Water Jug",
      titleZh: "水壶问题",
      contentEn: "A jug is 3/5 full. You pour out 1/5. What fraction is left?",
      contentZh: "一个水壶装了3/5满。你倒出1/5。还剩多少？",
      difficulty: "EASY" as const,
      category: "FRACTIONS" as const,
      ageGroup: "AGE_8_10" as const,
      answer: "2/5",
      answerExplainEn: "3/5 - 1/5 = 2/5. Since the denominators are the same, just subtract the numerators!",
      answerExplainZh: "3/5 - 1/5 = 2/5。分母相同，直接减分子！",
      hints: [
        { en: "The denominators are the same", zh: "分母是一样的" },
        { en: "Just subtract the numerators: 3 - 1", zh: "直接减分子：3 - 1" },
      ],
      animationConfig: { type: "pizza_slice", totalSlices: 5, eatenSlices: 2 },
      funFactEn: "Fractions with the same denominator are called 'like fractions' — they're easy to add and subtract!",
      funFactZh: "分母相同的分数叫做「同分母分数」——加减它们很容易！",
      isPublished: true,
      sortOrder: 28,
    },

    // ─── NUMBER THEORY (7 questions) ─────────────────────────
    {
      titleEn: "Prime Number Hunter",
      titleZh: "质数猎人",
      contentEn: "How many prime numbers are there between 1 and 20?",
      contentZh: "1到20之间有多少个质数？",
      difficulty: "MEDIUM" as const,
      category: "NUMBER_THEORY" as const,
      ageGroup: "AGE_10_12" as const,
      answer: "8",
      answerExplainEn: "The primes: 2, 3, 5, 7, 11, 13, 17, 19. That's 8!",
      answerExplainZh: "质数有：2, 3, 5, 7, 11, 13, 17, 19。一共8个！",
      hints: [
        { en: "A prime is only divisible by 1 and itself", zh: "质数只能被1和它自己整除" },
        { en: "2 is the only even prime", zh: "2是唯一的偶数质数" },
        { en: "Check: 2, 3, 5, 7, 11, 13, 17, 19...", zh: "检查：2, 3, 5, 7, 11, 13, 17, 19..." },
      ],
      animationConfig: { type: "number_journey", range: [1, 20], highlights: [2, 3, 5, 7, 11, 13, 17, 19] },
      funFactEn: "The largest known prime number has over 24 million digits!",
      funFactZh: "已知最大的质数有超过2400万位数字！",
      isPublished: true,
      sortOrder: 29,
    },
    {
      titleEn: "The GCD Challenge",
      titleZh: "最大公约数挑战",
      contentEn: "What is the greatest common divisor (GCD) of 12 and 18?",
      contentZh: "12和18的最大公约数是多少？",
      difficulty: "MEDIUM" as const,
      category: "NUMBER_THEORY" as const,
      ageGroup: "AGE_10_12" as const,
      answer: "6",
      answerExplainEn: "Factors of 12: 1,2,3,4,6,12. Factors of 18: 1,2,3,6,9,18. GCD = 6!",
      answerExplainZh: "12的因数：1,2,3,4,6,12。18的因数：1,2,3,6,9,18。最大公约数 = 6！",
      hints: [
        { en: "List the factors of both numbers", zh: "列出两个数的所有因数" },
        { en: "Which factors do they share?", zh: "它们有哪些共同因数？" },
        { en: "Find the biggest shared factor", zh: "找最大的共同因数" },
      ],
      animationConfig: { type: "number_journey", range: [1, 20], highlights: [1, 2, 3, 6] },
      funFactEn: "Euclid discovered an elegant algorithm for GCD over 2300 years ago that computers still use!",
      funFactZh: "欧几里得2300多年前发现了一种优雅的求最大公约数的算法，至今计算机仍在使用！",
      isPublished: true,
      sortOrder: 30,
    },
    {
      titleEn: "The Even-Odd Mystery",
      titleZh: "奇偶之谜",
      contentEn: "If you add three odd numbers together, is the result odd or even?",
      contentZh: "三个奇数相加，结果是奇数还是偶数？",
      difficulty: "EASY" as const,
      category: "NUMBER_THEORY" as const,
      ageGroup: "AGE_8_10" as const,
      answer: "odd",
      answerExplainEn: "Odd + Odd = Even. Even + Odd = Odd. So three odds give odd! Try: 1+3+5=9 (odd)!",
      answerExplainZh: "奇+奇=偶。偶+奇=奇。所以三个奇数之和是奇数！试试：1+3+5=9（奇数）！",
      hints: [
        { en: "Try a simple example: 1 + 3 + 5 = ?", zh: "试个简单例子：1 + 3 + 5 = ?" },
        { en: "Odd + Odd = Even. Then Even + Odd = ?", zh: "奇+奇=偶。然后偶+奇=?" },
      ],
      animationConfig: { type: "number_journey", range: [1, 10], highlights: [1, 3, 5, 7, 9] },
      funFactEn: "Zero is considered an even number! It can be divided by 2 with no remainder.",
      funFactZh: "零被认为是偶数！它可以被2整除没有余数。",
      isPublished: true,
      sortOrder: 31,
    },
    {
      titleEn: "Factor Frenzy",
      titleZh: "因数狂欢",
      contentEn: "How many factors does the number 24 have?",
      contentZh: "24有多少个因数？",
      difficulty: "MEDIUM" as const,
      category: "NUMBER_THEORY" as const,
      ageGroup: "AGE_10_12" as const,
      answer: "8",
      answerExplainEn: "Factors of 24: 1, 2, 3, 4, 6, 8, 12, 24. That's 8 factors!",
      answerExplainZh: "24的因数：1, 2, 3, 4, 6, 8, 12, 24。共8个因数！",
      hints: [
        { en: "Factors come in pairs: 1×24, 2×12, ...", zh: "因数成对出现：1×24, 2×12, ..." },
        { en: "Don't forget 3×8 and 4×6", zh: "别忘了3×8和4×6" },
      ],
      animationConfig: { type: "number_journey", range: [1, 25], highlights: [1, 2, 3, 4, 6, 8, 12, 24] },
      funFactEn: "24 is a 'highly composite number' — it has more factors than any smaller number!",
      funFactZh: "24是一个「高合成数」——它比任何更小的数都有更多的因数！",
      isPublished: true,
      sortOrder: 32,
    },
    {
      titleEn: "The Perfect Number",
      titleZh: "完美数字",
      contentEn: "6 is called a 'perfect number' because it equals the sum of its factors (excluding itself): 1+2+3=6. What is the next perfect number?",
      contentZh: "6是一个「完全数」，因为它等于除自身外所有因数之和：1+2+3=6。下一个完全数是什么？",
      difficulty: "CHALLENGE" as const,
      category: "NUMBER_THEORY" as const,
      ageGroup: "AGE_12_14" as const,
      answer: "28",
      answerExplainEn: "28 = 1 + 2 + 4 + 7 + 14. The factors (excluding 28) sum to 28!",
      answerExplainZh: "28 = 1 + 2 + 4 + 7 + 14。除28外所有因数之和等于28！",
      hints: [
        { en: "Try numbers after 6 and check if their factors sum to themselves", zh: "从6之后的数开始，检查因数之和是否等于它自己" },
        { en: "Skip numbers that are clearly too small", zh: "跳过明显太小的数" },
        { en: "Try 28: its factors are 1, 2, 4, 7, 14", zh: "试试28：它的因数是1, 2, 4, 7, 14" },
      ],
      animationConfig: { type: "number_journey", range: [1, 30], highlights: [6, 28] },
      funFactEn: "Only 51 perfect numbers are known! The largest has over 49 million digits!",
      funFactZh: "目前只发现了51个完全数！最大的有超过4900万位数字！",
      isPublished: true,
      sortOrder: 33,
    },
    {
      titleEn: "The Divisibility Trick",
      titleZh: "整除小窍门",
      contentEn: "Is 123456 divisible by 3? (Answer yes or no)",
      contentZh: "123456能被3整除吗？（回答yes或no）",
      difficulty: "EASY" as const,
      category: "NUMBER_THEORY" as const,
      ageGroup: "AGE_8_10" as const,
      answer: "yes",
      answerExplainEn: "Add the digits: 1+2+3+4+5+6 = 21. Since 21 is divisible by 3, so is 123456!",
      answerExplainZh: "把各位数字加起来：1+2+3+4+5+6 = 21。因为21能被3整除，所以123456也能！",
      hints: [
        { en: "There's a trick: add all the digits together", zh: "有个窍门：把所有数字加起来" },
        { en: "1+2+3+4+5+6 = ?", zh: "1+2+3+4+5+6 = ?" },
        { en: "Is that sum divisible by 3?", zh: "这个和能被3整除吗？" },
      ],
      animationConfig: { type: "number_journey", range: [1, 25], highlights: [3, 6, 9, 12, 15, 18, 21] },
      funFactEn: "Divisibility rules were discovered by ancient Indian mathematicians around 500 AD!",
      funFactZh: "整除规则是公元500年左右由古印度数学家发现的！",
      isPublished: true,
      sortOrder: 34,
    },
    {
      titleEn: "The LCM Quest",
      titleZh: "最小公倍数之旅",
      contentEn: "What is the least common multiple (LCM) of 4 and 6?",
      contentZh: "4和6的最小公倍数是多少？",
      difficulty: "MEDIUM" as const,
      category: "NUMBER_THEORY" as const,
      ageGroup: "AGE_10_12" as const,
      answer: "12",
      answerExplainEn: "Multiples of 4: 4, 8, 12, 16... Multiples of 6: 6, 12, 18... The first common one is 12!",
      answerExplainZh: "4的倍数：4, 8, 12, 16... 6的倍数：6, 12, 18... 第一个共同的是12！",
      hints: [
        { en: "List multiples of 4: 4, 8, 12, ...", zh: "列出4的倍数：4, 8, 12, ..." },
        { en: "List multiples of 6: 6, 12, ...", zh: "列出6的倍数：6, 12, ..." },
        { en: "What's the smallest number in both lists?", zh: "两个列表中最小的共同数是什么？" },
      ],
      animationConfig: { type: "number_journey", range: [1, 25], highlights: [4, 6, 8, 12] },
      funFactEn: "LCM is essential for adding fractions with different denominators!",
      funFactZh: "最小公倍数对于不同分母的分数加法至关重要！",
      isPublished: true,
      sortOrder: 35,
    },

    // ─── WORD PROBLEMS (7 questions) ─────────────────────────
    {
      titleEn: "The Cookie Monster",
      titleZh: "饼干怪兽",
      contentEn: "A baker makes 48 cookies. He puts them into bags of 6. How many bags does he need?",
      contentZh: "一个面包师做了48块饼干。他每袋装6块。他需要多少个袋子？",
      difficulty: "EASY" as const,
      category: "WORD_PROBLEMS" as const,
      ageGroup: "AGE_8_10" as const,
      answer: "8",
      answerExplainEn: "48 ÷ 6 = 8 bags!",
      answerExplainZh: "48 ÷ 6 = 8个袋子！",
      hints: [
        { en: "This is a division problem", zh: "这是一道除法题" },
        { en: "48 ÷ 6 = ?", zh: "48 ÷ 6 = ?" },
      ],
      animationConfig: { type: "number_combine", numbers: [6, 6, 6, 6, 6, 6, 6, 6], operation: "add" },
      funFactEn: "The biggest cookie ever made weighed over 18,000 kg — as heavy as 3 elephants!",
      funFactZh: "有史以来最大的饼干重超过18000公斤——相当于3头大象！",
      isPublished: true,
      sortOrder: 36,
    },
    {
      titleEn: "The Train Race",
      titleZh: "火车比赛",
      contentEn: "A train travels 60 km/h. How far does it travel in 2.5 hours?",
      contentZh: "一列火车以60公里/小时的速度行驶。2.5小时后它走了多远？",
      difficulty: "MEDIUM" as const,
      category: "WORD_PROBLEMS" as const,
      ageGroup: "AGE_10_12" as const,
      answer: "150",
      answerExplainEn: "Distance = Speed × Time = 60 × 2.5 = 150 km!",
      answerExplainZh: "距离 = 速度 × 时间 = 60 × 2.5 = 150公里！",
      hints: [
        { en: "Distance = Speed × Time", zh: "距离 = 速度 × 时间" },
        { en: "60 × 2.5 = ?", zh: "60 × 2.5 = ?" },
      ],
      animationConfig: { type: "number_journey", range: [0, 160], highlights: [60, 120, 150] },
      funFactEn: "The fastest train in the world (Japan's Maglev) can go over 600 km/h!",
      funFactZh: "世界上最快的火车（日本磁悬浮列车）时速超过600公里！",
      isPublished: true,
      sortOrder: 37,
    },
    {
      titleEn: "The Money Problem",
      titleZh: "钱的问题",
      contentEn: "You have $20. You buy 3 books at $4.50 each. How much change do you get?",
      contentZh: "你有20元。你买了3本书，每本4.5元。你能找回多少钱？",
      difficulty: "MEDIUM" as const,
      category: "WORD_PROBLEMS" as const,
      ageGroup: "AGE_10_12" as const,
      answer: "6.50",
      answerExplainEn: "3 × $4.50 = $13.50. Change = $20 - $13.50 = $6.50!",
      answerExplainZh: "3 × 4.5 = 13.5元。找零 = 20 - 13.5 = 6.5元！",
      hints: [
        { en: "First calculate the total cost", zh: "先算总价" },
        { en: "3 × 4.50 = ?", zh: "3 × 4.50 = ?" },
        { en: "Then subtract from 20", zh: "然后从20减去" },
      ],
      animationConfig: { type: "number_combine", numbers: [4.5, 4.5, 4.5], operation: "add" },
      funFactEn: "The first coins were made over 2,600 years ago in ancient Lydia (modern Turkey)!",
      funFactZh: "最早的硬币是2600多年前在古吕底亚（现在的土耳其）制造的！",
      isPublished: true,
      sortOrder: 38,
    },
    {
      titleEn: "The Animal Farm",
      titleZh: "动物农场",
      contentEn: "A farm has chickens and cows. There are 10 animals and 28 legs total. How many cows are there?",
      contentZh: "农场里有鸡和牛。共有10只动物，28条腿。有多少头牛？",
      difficulty: "HARD" as const,
      category: "WORD_PROBLEMS" as const,
      ageGroup: "AGE_12_14" as const,
      answer: "4",
      answerExplainEn: "Let cows = c. Chickens = 10-c. Legs: 4c + 2(10-c) = 28. 4c + 20 - 2c = 28. 2c = 8. c = 4!",
      answerExplainZh: "设牛 = c。鸡 = 10-c。腿：4c + 2(10-c) = 28。4c + 20 - 2c = 28。2c = 8。c = 4！",
      hints: [
        { en: "Chickens have 2 legs, cows have 4", zh: "鸡有2条腿，牛有4条" },
        { en: "If all 10 were chickens: 20 legs. But we have 28", zh: "如果10只都是鸡：20条腿。但我们有28条" },
        { en: "Each cow adds 2 extra legs vs a chicken", zh: "每头牛比鸡多2条腿" },
      ],
      animationConfig: { type: "balance_scale", leftSide: { expression: "4c + 2(10-c)" }, rightSide: { value: 28 } },
      funFactEn: "This type of problem is called a 'chickens and rabbits' problem in Chinese math tradition!",
      funFactZh: "这类问题在中国传统数学中叫做「鸡兔同笼」问题，已有上千年历史！",
      isPublished: true,
      sortOrder: 39,
    },
    {
      titleEn: "The Swimming Pool",
      titleZh: "游泳池",
      contentEn: "A pool fills at 3 liters per minute. How many minutes to fill a 180-liter pool?",
      contentZh: "一个水池每分钟注入3升水。注满180升的水池需要多少分钟？",
      difficulty: "EASY" as const,
      category: "WORD_PROBLEMS" as const,
      ageGroup: "AGE_8_10" as const,
      answer: "60",
      answerExplainEn: "180 ÷ 3 = 60 minutes!",
      answerExplainZh: "180 ÷ 3 = 60分钟！",
      hints: [
        { en: "Total ÷ rate = time", zh: "总量 ÷ 速率 = 时间" },
        { en: "180 ÷ 3 = ?", zh: "180 ÷ 3 = ?" },
      ],
      animationConfig: { type: "number_journey", range: [0, 65], highlights: [20, 40, 60] },
      funFactEn: "The largest swimming pool in the world is in Chile — it's over 1 km long!",
      funFactZh: "世界上最大的游泳池在智利——超过1公里长！",
      isPublished: true,
      sortOrder: 40,
    },
    {
      titleEn: "The Paint Problem",
      titleZh: "刷墙问题",
      contentEn: "If 2 painters can paint a room in 6 hours, how long would it take 3 painters?",
      contentZh: "如果2个油漆工能在6小时内刷完一个房间，3个油漆工需要多长时间？",
      difficulty: "HARD" as const,
      category: "WORD_PROBLEMS" as const,
      ageGroup: "AGE_12_14" as const,
      answer: "4",
      answerExplainEn: "Total work = 2 × 6 = 12 painter-hours. With 3 painters: 12 ÷ 3 = 4 hours!",
      answerExplainZh: "总工作量 = 2 × 6 = 12人·小时。3个人：12 ÷ 3 = 4小时！",
      hints: [
        { en: "Think about the total work needed", zh: "想想总共需要多少工作量" },
        { en: "Total work = workers × time", zh: "总工作量 = 工人数 × 时间" },
        { en: "12 painter-hours ÷ 3 painters = ?", zh: "12人·小时 ÷ 3个人 = ?" },
      ],
      animationConfig: { type: "number_combine", numbers: [2, 6, 3], operation: "mixed" },
      funFactEn: "This is called an 'inverse proportion' — more workers means less time!",
      funFactZh: "这叫做「反比例」——人越多，时间越短！",
      isPublished: true,
      sortOrder: 41,
    },
    {
      titleEn: "The Handshake Problem",
      titleZh: "握手问题",
      contentEn: "5 friends meet at a party. If everyone shakes hands with everyone else exactly once, how many handshakes happen?",
      contentZh: "5个朋友在聚会上见面。如果每人和其他人都握一次手，总共有多少次握手？",
      difficulty: "CHALLENGE" as const,
      category: "WORD_PROBLEMS" as const,
      ageGroup: "AGE_12_14" as const,
      answer: "10",
      answerExplainEn: "Person 1 shakes 4 hands, person 2 shakes 3 new hands, etc. 4+3+2+1 = 10! Or use n(n-1)/2 = 5×4/2 = 10!",
      answerExplainZh: "第1个人握4次手，第2个人握3次新的手，以此类推。4+3+2+1 = 10！或用n(n-1)/2 = 5×4/2 = 10！",
      hints: [
        { en: "Each person shakes hands with everyone else", zh: "每个人和其他人都握手" },
        { en: "Person 1: 4 handshakes. Person 2: 3 new ones...", zh: "第1人：4次握手。第2人：3次新的..." },
        { en: "4 + 3 + 2 + 1 = ?", zh: "4 + 3 + 2 + 1 = ?" },
      ],
      animationConfig: { type: "staircase", totalStairs: 4, stepOptions: [1, 2] },
      funFactEn: "This formula n(n-1)/2 is used in networking to calculate possible connections!",
      funFactZh: "这个公式n(n-1)/2在计算机网络中用来计算可能的连接数！",
      isPublished: true,
      sortOrder: 42,
    },

    // ─── LOGIC (7 questions) ─────────────────────────────────
    {
      titleEn: "The Staircase Challenge",
      titleZh: "楼梯挑战",
      contentEn: "You can climb 1 or 2 stairs at a time. How many different ways can you climb 5 stairs?",
      contentZh: "你每次可以爬1级或2级台阶。爬5级台阶有多少种不同的方法？",
      difficulty: "HARD" as const,
      category: "LOGIC" as const,
      ageGroup: "AGE_12_14" as const,
      answer: "8",
      answerExplainEn: "Fibonacci pattern! 1→1, 2→2, 3→3, 4→5, 5→8 ways!",
      answerExplainZh: "斐波那契模式！1→1, 2→2, 3→3, 4→5, 5→8种方法！",
      hints: [
        { en: "Start small: 1 stair = 1 way, 2 stairs = 2 ways", zh: "从小开始：1级 = 1种，2级 = 2种" },
        { en: "3 stairs = 3 ways, 4 stairs = 5 ways", zh: "3级 = 3种，4级 = 5种" },
        { en: "ways(n) = ways(n-1) + ways(n-2)", zh: "ways(n) = ways(n-1) + ways(n-2)" },
      ],
      animationConfig: { type: "staircase", totalStairs: 5, stepOptions: [1, 2] },
      funFactEn: "Fibonacci sequence appears in sunflower seeds, pinecone spirals, and nautilus shells!",
      funFactZh: "斐波那契数列出现在向日葵种子、松果螺旋和鹦鹉螺壳中！",
      isPublished: true,
      sortOrder: 43,
    },
    {
      titleEn: "The Magic Square",
      titleZh: "魔方阵",
      contentEn: "In a 3×3 magic square, every row, column, and diagonal adds up to 15. If the center is 5 and top-left is 2, what is the bottom-right?",
      contentZh: "在3×3魔方阵中，每行、每列和对角线的和都是15。如果中心是5，左上角是2，右下角是多少？",
      difficulty: "HARD" as const,
      category: "LOGIC" as const,
      ageGroup: "AGE_12_14" as const,
      answer: "8",
      answerExplainEn: "Diagonal: 2 + 5 + ? = 15. ? = 8!",
      answerExplainZh: "对角线：2 + 5 + ? = 15。? = 8！",
      hints: [
        { en: "Look at the diagonal from top-left to bottom-right", zh: "看从左上角到右下角的对角线" },
        { en: "2 + 5 + ? = 15", zh: "2 + 5 + ? = 15" },
      ],
      animationConfig: { type: "magic_square", size: 3, targetSum: 15, known: { "0,0": 2, "1,1": 5 } },
      funFactEn: "The Lo Shu magic square was found in China over 4,000 years ago!",
      funFactZh: "洛书魔方阵在中国4000多年前就被发现了！",
      isPublished: true,
      sortOrder: 44,
    },
    {
      titleEn: "The Truth Teller",
      titleZh: "说真话的人",
      contentEn: "Alice says 'I always lie.' Is this statement possible?",
      contentZh: "爱丽丝说「我总是说谎」。这句话可能吗？（回答no）",
      difficulty: "MEDIUM" as const,
      category: "LOGIC" as const,
      ageGroup: "AGE_10_12" as const,
      answer: "no",
      answerExplainEn: "If she always lies, then 'I always lie' would be a lie, meaning she sometimes tells the truth — contradiction!",
      answerExplainZh: "如果她总是说谎，那么「我总是说谎」就是谎话，意味着她有时说真话——矛盾！",
      hints: [
        { en: "If she's lying about always lying...", zh: "如果她在说谎说自己总是说谎..." },
        { en: "Think about what happens in both cases", zh: "想想两种情况会怎样" },
      ],
      animationConfig: { type: "staircase", totalStairs: 2, stepOptions: [1] },
      funFactEn: "This is called the 'Liar's Paradox' and has puzzled philosophers for over 2,000 years!",
      funFactZh: "这叫做「说谎者悖论」，困扰了哲学家2000多年！",
      isPublished: true,
      sortOrder: 45,
    },
    {
      titleEn: "The Number Detective",
      titleZh: "数字侦探",
      contentEn: "I'm a 2-digit number. My digits add up to 9. I'm divisible by 5. What am I?",
      contentZh: "我是一个两位数。我的各位数字之和是9。我能被5整除。我是什么？",
      difficulty: "MEDIUM" as const,
      category: "LOGIC" as const,
      ageGroup: "AGE_10_12" as const,
      answer: "45",
      answerExplainEn: "Divisible by 5 → ends in 0 or 5. Digits sum to 9: 90 (9+0=9) or 45 (4+5=9). Both work, but 45 is the first!",
      answerExplainZh: "能被5整除→末位是0或5。数字之和为9：90或45都可以，45是最小的！",
      hints: [
        { en: "Numbers divisible by 5 end in 0 or 5", zh: "能被5整除的数末位是0或5" },
        { en: "If it ends in 5: _5 where _ + 5 = 9", zh: "如果末位是5：_5，其中_ + 5 = 9" },
      ],
      animationConfig: { type: "number_journey", range: [10, 100], highlights: [45, 90] },
      funFactEn: "Sherlock Holmes used logical deduction just like you to solve mysteries!",
      funFactZh: "福尔摩斯也像你一样用逻辑推理来解谜！",
      isPublished: true,
      sortOrder: 46,
    },
    {
      titleEn: "The Chess Board",
      titleZh: "国际象棋棋盘",
      contentEn: "How many squares (of any size) are on a 2×2 checkerboard?",
      contentZh: "一个2×2的棋盘上总共有多少个正方形（任意大小）？",
      difficulty: "MEDIUM" as const,
      category: "LOGIC" as const,
      ageGroup: "AGE_10_12" as const,
      answer: "5",
      answerExplainEn: "Four 1×1 squares + one 2×2 square = 5 total!",
      answerExplainZh: "四个1×1的正方形 + 一个2×2的正方形 = 总共5个！",
      hints: [
        { en: "Count the small squares first", zh: "先数小正方形" },
        { en: "Can you find a bigger square?", zh: "你能找到更大的正方形吗？" },
      ],
      animationConfig: { type: "magic_square", size: 2, targetSum: 5, known: {} },
      funFactEn: "A standard 8×8 chess board has 204 squares total! Can you figure out why?",
      funFactZh: "标准的8×8国际象棋棋盘总共有204个正方形！你能想出为什么吗？",
      isPublished: true,
      sortOrder: 47,
    },
    {
      titleEn: "The Bridge Crossing",
      titleZh: "过桥问题",
      contentEn: "You have a 3-liter jug and a 5-liter jug. How can you measure exactly 4 liters? How many pours minimum?",
      contentZh: "你有一个3升壶和一个5升壶。最少需要几次倒水才能量出正好4升？",
      difficulty: "CHALLENGE" as const,
      category: "LOGIC" as const,
      ageGroup: "AGE_12_14" as const,
      answer: "6",
      answerExplainEn: "Fill 5L, pour into 3L (leaves 2L in 5L), empty 3L, pour 2L into 3L, fill 5L, pour into 3L (only 1L fits). 5L now has 4L! That's 6 pours.",
      answerExplainZh: "装满5升壶，倒入3升壶（5升壶剩2升），清空3升壶，将2升倒入3升壶，装满5升壶，倒入3升壶（只能再装1升）。5升壶现在有4升！共6次。",
      hints: [
        { en: "Fill the big jug first", zh: "先装满大壶" },
        { en: "5 - 3 = 2 liters remaining", zh: "5 - 3 = 剩2升" },
        { en: "Put that 2L into the empty 3L jug, then fill 5L again", zh: "把2升倒入空的3升壶，再装满5升壶" },
      ],
      animationConfig: { type: "staircase", totalStairs: 6, stepOptions: [1, 2] },
      funFactEn: "This puzzle appeared in the movie Die Hard 3 — Bruce Willis had to solve it to save the day!",
      funFactZh: "这道题出现在电影《虎胆龙威3》中——布鲁斯·威利斯必须解开它才能拯救大家！",
      isPublished: true,
      sortOrder: 48,
    },
    {
      titleEn: "The Coin Puzzle",
      titleZh: "硬币谜题",
      contentEn: "You have 12 coins that look identical. One is fake and lighter. Using a balance scale, what is the minimum weighings to find the fake?",
      contentZh: "你有12枚看起来一样的硬币。其中一枚是假的且较轻。用天平秤，最少称几次能找到假硬币？",
      difficulty: "CHALLENGE" as const,
      category: "LOGIC" as const,
      ageGroup: "AGE_12_14" as const,
      answer: "3",
      answerExplainEn: "Split into 3 groups of 4. Weigh 2 groups. The lighter group (or the unweighed group if equal) contains the fake. Repeat with groups of 1-2. 3 weighings!",
      answerExplainZh: "分成3组，每组4枚。称其中两组。较轻的那组（或如果相等则是没称的那组）有假币。重复分组。3次！",
      hints: [
        { en: "Split the coins into 3 groups", zh: "把硬币分成3组" },
        { en: "Each weighing eliminates 2/3 of possibilities", zh: "每次称量排除2/3的可能性" },
        { en: "12 → 4 → 2 → 1 (found!)", zh: "12 → 4 → 2 → 1（找到了！）" },
      ],
      animationConfig: { type: "balance_scale", leftSide: { expression: "4 coins" }, rightSide: { value: "4 coins" } },
      funFactEn: "This uses the mathematical concept of 'ternary search' — dividing into 3 parts!",
      funFactZh: "这用到了「三分搜索」的数学概念——分成3份！",
      isPublished: true,
      sortOrder: 49,
    },

    // ─── PROBABILITY (7 questions) ───────────────────────────
    {
      titleEn: "The Candy Jar",
      titleZh: "糖果罐",
      contentEn: "A jar has 5 red, 3 blue, and 2 green candies. What is the probability of picking a blue one? (Write as a fraction)",
      contentZh: "罐子里有5颗红糖果、3颗蓝糖果和2颗绿糖果。随机拿一颗是蓝色的概率？（写成分数）",
      difficulty: "MEDIUM" as const,
      category: "PROBABILITY" as const,
      ageGroup: "AGE_10_12" as const,
      answer: "3/10",
      answerExplainEn: "Total: 5+3+2 = 10. Blue: 3. Probability = 3/10!",
      answerExplainZh: "总数：5+3+2 = 10。蓝色：3。概率 = 3/10！",
      hints: [
        { en: "Count the total candies", zh: "数糖果总数" },
        { en: "Probability = favorable / total", zh: "概率 = 有利 / 总数" },
      ],
      animationConfig: { type: "candy_jar", red: 5, blue: 3, green: 2 },
      funFactEn: "Probability theory was born from gambling problems studied by Pascal and Fermat!",
      funFactZh: "概率论诞生于帕斯卡和费马研究的赌博问题！",
      isPublished: true,
      sortOrder: 50,
    },
    {
      titleEn: "The Coin Flip",
      titleZh: "抛硬币",
      contentEn: "You flip a fair coin 3 times. What is the probability of getting all heads? (Write as a fraction)",
      contentZh: "你抛一枚硬币3次。全部正面朝上的概率是多少？（写成分数）",
      difficulty: "MEDIUM" as const,
      category: "PROBABILITY" as const,
      ageGroup: "AGE_10_12" as const,
      answer: "1/8",
      answerExplainEn: "Each flip: 1/2 chance of heads. Three flips: 1/2 × 1/2 × 1/2 = 1/8!",
      answerExplainZh: "每次抛：1/2的概率正面。三次：1/2 × 1/2 × 1/2 = 1/8！",
      hints: [
        { en: "Probability of heads on one flip is 1/2", zh: "一次正面的概率是1/2" },
        { en: "For independent events, multiply the probabilities", zh: "独立事件的概率相乘" },
        { en: "1/2 × 1/2 × 1/2 = ?", zh: "1/2 × 1/2 × 1/2 = ?" },
      ],
      animationConfig: { type: "candy_jar", red: 1, blue: 7, green: 0 },
      funFactEn: "If you flip a coin 10 times, there are 1,024 possible outcomes!",
      funFactZh: "如果你抛硬币10次，有1024种可能的结果！",
      isPublished: true,
      sortOrder: 51,
    },
    {
      titleEn: "The Dice Roll",
      titleZh: "掷骰子",
      contentEn: "You roll a standard die. What is the probability of getting a number greater than 4? (Write as a fraction)",
      contentZh: "你掷一个标准骰子。掷出大于4的数的概率是多少？（写成分数）",
      difficulty: "EASY" as const,
      category: "PROBABILITY" as const,
      ageGroup: "AGE_8_10" as const,
      answer: "1/3",
      answerExplainEn: "Numbers greater than 4: 5 and 6. That's 2 out of 6 = 2/6 = 1/3!",
      answerExplainZh: "大于4的数：5和6。6个中有2个 = 2/6 = 1/3！",
      hints: [
        { en: "A die has numbers 1-6", zh: "骰子有数字1-6" },
        { en: "Which numbers are greater than 4?", zh: "哪些数字大于4？" },
        { en: "2 out of 6, simplify", zh: "6个中有2个，化简" },
      ],
      animationConfig: { type: "candy_jar", red: 2, blue: 4, green: 0 },
      funFactEn: "The oldest known dice are over 5,000 years old, found in Iran!",
      funFactZh: "已知最古老的骰子有5000多年历史，是在伊朗发现的！",
      isPublished: true,
      sortOrder: 52,
    },
    {
      titleEn: "The Sock Drawer",
      titleZh: "袜子抽屉",
      contentEn: "A drawer has 4 red socks and 6 blue socks. You pick 2 randomly. What's the probability both are red? (Write as a fraction)",
      contentZh: "抽屉里有4只红袜子和6只蓝袜子。随机拿2只。两只都是红色的概率？（写成分数）",
      difficulty: "HARD" as const,
      category: "PROBABILITY" as const,
      ageGroup: "AGE_12_14" as const,
      answer: "2/15",
      answerExplainEn: "First red: 4/10. Second red: 3/9. Probability = 4/10 × 3/9 = 12/90 = 2/15!",
      answerExplainZh: "第一只红：4/10。第二只红：3/9。概率 = 4/10 × 3/9 = 12/90 = 2/15！",
      hints: [
        { en: "The first pick changes what's left for the second", zh: "第一次拿改变了第二次的可能性" },
        { en: "First pick: 4 red out of 10", zh: "第一次：10只中有4只红" },
        { en: "Second pick: 3 red out of 9 remaining", zh: "第二次：剩9只中有3只红" },
      ],
      animationConfig: { type: "candy_jar", red: 4, blue: 6, green: 0 },
      funFactEn: "This is called 'probability without replacement' — a key concept in statistics!",
      funFactZh: "这叫做「不放回概率」——统计学中的关键概念！",
      isPublished: true,
      sortOrder: 53,
    },
    {
      titleEn: "The Birthday Surprise",
      titleZh: "生日惊喜",
      contentEn: "In a class of 23 students, what's more likely: at least 2 share a birthday, or all have different birthdays?",
      contentZh: "一个23人的班级里，哪个更可能：至少2人同一天生日，还是所有人生日都不同？",
      difficulty: "CHALLENGE" as const,
      category: "PROBABILITY" as const,
      ageGroup: "AGE_12_14" as const,
      answer: "share",
      answerExplainEn: "Surprisingly, with 23 people there's a >50% chance two share a birthday! This is the famous Birthday Paradox!",
      answerExplainZh: "令人惊讶的是，23个人中有超过50%的概率有两人同天生日！这就是著名的生日悖论！",
      hints: [
        { en: "This is counter-intuitive!", zh: "这是反直觉的！" },
        { en: "There are 365 possible birthdays", zh: "有365个可能的生日" },
        { en: "Think about the number of PAIRS of people", zh: "想想有多少对人" },
      ],
      animationConfig: { type: "candy_jar", red: 23, blue: 342, green: 0 },
      funFactEn: "With just 70 people, there's a 99.9% chance two share a birthday!",
      funFactZh: "只要70个人，就有99.9%的概率有两人同天生日！",
      isPublished: true,
      sortOrder: 54,
    },
    {
      titleEn: "The Card Draw",
      titleZh: "抽牌",
      contentEn: "From a standard deck of 52 cards, what is the probability of drawing a heart? (Write as a fraction)",
      contentZh: "从一副标准的52张扑克牌中，抽到红心的概率是多少？（写成分数）",
      difficulty: "EASY" as const,
      category: "PROBABILITY" as const,
      ageGroup: "AGE_8_10" as const,
      answer: "1/4",
      answerExplainEn: "There are 13 hearts in 52 cards. 13/52 = 1/4!",
      answerExplainZh: "52张牌中有13张红心。13/52 = 1/4！",
      hints: [
        { en: "A deck has 4 suits: hearts, diamonds, clubs, spades", zh: "一副牌有4种花色" },
        { en: "Each suit has 13 cards", zh: "每种花色有13张" },
        { en: "13 out of 52 = ?", zh: "52张中有13张 = ?" },
      ],
      animationConfig: { type: "candy_jar", red: 13, blue: 39, green: 0 },
      funFactEn: "A standard deck has 52 cards — one for each week of the year!",
      funFactZh: "标准扑克牌有52张——正好对应一年中的52周！",
      isPublished: true,
      sortOrder: 55,
    },
    {
      titleEn: "The Double Dice",
      titleZh: "双骰子",
      contentEn: "You roll two dice. What is the probability of getting a sum of 7? (Write as a fraction)",
      contentZh: "你掷两个骰子。两个数之和为7的概率是多少？（写成分数）",
      difficulty: "HARD" as const,
      category: "PROBABILITY" as const,
      ageGroup: "AGE_12_14" as const,
      answer: "1/6",
      answerExplainEn: "Combinations summing to 7: (1,6)(2,5)(3,4)(4,3)(5,2)(6,1) = 6 ways. Total outcomes: 36. P = 6/36 = 1/6!",
      answerExplainZh: "和为7的组合：(1,6)(2,5)(3,4)(4,3)(5,2)(6,1) = 6种。总共36种。P = 6/36 = 1/6！",
      hints: [
        { en: "Total possible outcomes with 2 dice: 6 × 6 = 36", zh: "两个骰子总共的可能结果：6 × 6 = 36" },
        { en: "List the ways to get 7: (1,6), (2,5), ...", zh: "列出得到7的方式：(1,6), (2,5), ..." },
        { en: "Count them: there are 6 ways", zh: "数一数：有6种方式" },
      ],
      animationConfig: { type: "candy_jar", red: 6, blue: 30, green: 0 },
      funFactEn: "7 is the most common sum when rolling two dice — that's why it's so important in board games!",
      funFactZh: "掷两个骰子时7是最常见的和——这就是为什么它在桌游中如此重要！",
      isPublished: true,
      sortOrder: 56,
    },
  ];

  const usK12Questions = buildUSK12QuestionBank(questions.length);
  const allQuestions = [...questions, ...usK12Questions];

  const standardTagNames = Array.from(
    new Set(
      allQuestions.flatMap((q) => {
        const maybeTags = (q as { tags?: string[] }).tags;
        return Array.isArray(maybeTags) ? maybeTags : [];
      })
    )
  );

  for (const standardTag of standardTagNames) {
    await prisma.tag.upsert({
      where: { nameEn: standardTag },
      update: {},
      create: {
        nameEn: standardTag,
        nameZh: `课程标准 ${standardTag}`,
      },
    });
  }

  // Legacy rows upgraded to hero questions are owned by their blueprint from now on
  // (seedHeroQuestions below); re-applying the legacy copy would only be overwritten again.
  const upgradedLegacyTitles = new Set(
    heroBlueprints.flatMap((bp) => (bp.upgradesLegacyTitleEn ? [bp.upgradesLegacyTitleEn] : []))
  );

  for (const q of allQuestions) {
    if (upgradedLegacyTitles.has(q.titleEn)) continue;
    const questionTags = ((q as { tags?: string[] }).tags ?? []).map((tag) => ({
      tag: { connect: { nameEn: tag } },
    }));

    const { tags: _ignoredTags, ...qBase } = q as typeof q & { tags?: string[] };
    const questionData = {
      ...qBase,
      hints: qBase.hints as Prisma.InputJsonValue,
      animationConfig: normalizeAnimationConfig(q) as Prisma.InputJsonValue,
    };

    if (questionsOnly) {
      const existing = await prisma.question.findFirst({
        where: { sortOrder: q.sortOrder },
        select: { id: true },
      });

      if (existing) {
        await prisma.question.update({
          where: { id: existing.id },
          data: {
            ...questionData,
            tags: {
              deleteMany: {},
              create: questionTags,
            },
          },
        });
      } else {
        await prisma.question.create({
          data: {
            ...questionData,
            tags: questionTags.length > 0 ? { create: questionTags } : undefined,
          },
        });
      }
    } else {
      await prisma.question.create({
        data: {
          ...questionData,
          tags: questionTags.length > 0 ? { create: questionTags } : undefined,
        },
      });
    }
  }

  const collectionIds = await seedCollections();
  const heroCounts = await seedHeroQuestions(heroBlueprints, collectionIds);
  console.log(
    `  ✓ ${heroBlueprints.length} hero questions (created ${heroCounts.created}, updated ${heroCounts.updated}, upgraded legacy ${heroCounts.upgraded})`
  );

  // Attach grade-level focus tags so students can directly pick Grade 4-8 challenge tracks.
  const gradeTagRules: Array<{
    tagName: string;
    ageGroups: Array<"AGE_8_10" | "AGE_10_12" | "AGE_12_14" | "AGE_14_16" | "AGE_16_18">;
  }> = [
    { tagName: "GRADE_4", ageGroups: ["AGE_8_10"] },
    { tagName: "GRADE_5", ageGroups: ["AGE_8_10", "AGE_10_12"] },
    { tagName: "GRADE_6", ageGroups: ["AGE_10_12"] },
    { tagName: "GRADE_7", ageGroups: ["AGE_12_14"] },
    { tagName: "GRADE_8", ageGroups: ["AGE_12_14", "AGE_14_16"] },
  ];

  for (const rule of gradeTagRules) {
    const gradeTag = await prisma.tag.findUnique({ where: { nameEn: rule.tagName } });
    if (!gradeTag) continue;

    const targetQuestions = await prisma.question.findMany({
      where: { ageGroup: { in: rule.ageGroups } },
      select: { id: true },
    });

    if (targetQuestions.length === 0) continue;

    await prisma.tagsOnQuestions.createMany({
      data: targetQuestions.map((q) => ({
        questionId: q.id,
        tagId: gradeTag.id,
      })),
      skipDuplicates: true,
    });
  }

  console.log(`✅ Synced ${allQuestions.length - upgradedLegacyTitles.size} legacy + ${heroBlueprints.length} hero questions`);

  if (questionsOnly) {
    await seedCommunityBoost(communityBoostConfig);
    console.log("🎯 Question bank sync complete (users and XP untouched).");
    return;
  }

  // Create sample badges
  const badges = [
    {
      nameEn: "First Steps",
      nameZh: "第一步",
      descEn: "Solve your first math question!",
      descZh: "解决你的第一道数学题！",
      iconUrl: "/images/badges/first-steps.svg",
      criteria: { type: "questions_solved", threshold: 1 },
      xpReward: 10,
      sortOrder: 1,
    },
    {
      nameEn: "Math Explorer",
      nameZh: "数学探索者",
      descEn: "Solve 10 math questions",
      descZh: "解决10道数学题",
      iconUrl: "/images/badges/explorer.svg",
      criteria: { type: "questions_solved", threshold: 10 },
      xpReward: 50,
      sortOrder: 2,
    },
    {
      nameEn: "Streak Master",
      nameZh: "连续挑战大师",
      descEn: "Maintain a 7-day streak",
      descZh: "保持7天连续登录",
      iconUrl: "/images/badges/streak.svg",
      criteria: { type: "streak", threshold: 7 },
      xpReward: 100,
      sortOrder: 3,
    },
    {
      nameEn: "Perfect Score",
      nameZh: "满分达人",
      descEn: "Get 5 questions right in a row without any wrong answers!",
      descZh: "连续答对5道题，没有任何错误！",
      iconUrl: "/images/badges/perfect.svg",
      criteria: { type: "correct_streak", threshold: 5 },
      xpReward: 75,
      sortOrder: 4,
    },
    {
      nameEn: "Speed Demon",
      nameZh: "速度之王",
      descEn: "Solve a question in under 30 seconds",
      descZh: "在30秒内解决一道题",
      iconUrl: "/images/badges/speed.svg",
      criteria: { type: "fast_solve", threshold: 30 },
      xpReward: 25,
      sortOrder: 5,
    },
    {
      nameEn: "Math Champion",
      nameZh: "数学冠军",
      descEn: "Solve 50 math questions",
      descZh: "解决50道数学题",
      iconUrl: "/images/badges/champion.svg",
      criteria: { type: "questions_solved", threshold: 50 },
      xpReward: 200,
      sortOrder: 6,
    },
    {
      nameEn: "Category Master",
      nameZh: "分类大师",
      descEn: "Solve at least one question from every category",
      descZh: "每个分类至少解决一道题",
      iconUrl: "/images/badges/category-master.svg",
      criteria: { type: "all_categories", threshold: 11 },
      xpReward: 150,
      sortOrder: 7,
    },
    {
      nameEn: "Night Owl",
      nameZh: "夜猫子",
      descEn: "Solve a question after 9 PM",
      descZh: "晚上9点后解决一道题",
      iconUrl: "/images/badges/night-owl.svg",
      criteria: { type: "time_based", threshold: 21 },
      xpReward: 15,
      sortOrder: 8,
    },
  ];

  for (const badge of badges) {
    await prisma.badge.create({ data: badge });
  }

  console.log(`✅ Created ${badges.length} badges`);

  // Create sample classrooms
  await prisma.classroom.create({
    data: {
      name: "Mrs. Smith's Math Class",
      classCode: "MATH-2024-ABC",
      teacherName: "Mrs. Smith",
      teacherEmail: "smith@school.edu",
      school: "Donlon Elementary",
    },
  });

  await prisma.classroom.create({
    data: {
      name: "Mr. Chen's Advanced Math",
      classCode: "MATH-2024-XYZ",
      teacherName: "Mr. Chen",
      teacherEmail: "chen@school.edu",
      school: "Hart Middle School",
    },
  });

  console.log("✅ Created sample classrooms");

  // Create demo users
  const hashedPassword = await bcrypt.hash("demo123", 12);

  await prisma.user.create({
    data: {
      username: "demo_student",
      password: hashedPassword,
      displayName: "Eric",
      email: "demo@example.com",
      age: 10,
      parentEmail: "parent@example.com",
      authMethod: "PARENT_EMAIL",
      locale: "en",
      xp: 99999,
      level: 99,
      streak: 999,
    },
  });

  await prisma.user.create({
    data: {
      username: "math_wizard",
      password: hashedPassword,
      displayName: "Math Wizard",
      email: "wizard@example.com",
      age: 12,
      parentEmail: "wizardparent@example.com",
      authMethod: "PARENT_EMAIL",
      locale: "en",
      xp: 500,
      level: 5,
      streak: 7,
    },
  });

  await prisma.user.create({
    data: {
      username: "xiao_ming",
      password: hashedPassword,
      displayName: "小明",
      email: "xiaoming@example.com",
      age: 11,
      parentEmail: "xiaomingparent@example.com",
      authMethod: "PARENT_EMAIL",
      locale: "zh",
      xp: 320,
      level: 3,
      streak: 5,
    },
  });

  console.log("✅ Created demo users");
  console.log("  - eric_student / demo123 (Level 99, 9999 XP)");
  console.log("  - math_wizard / demo123 (Level 5, 500 XP)");
  console.log("  - xiao_ming / demo123 (Level 3, 320 XP)");

  await seedCommunityBoost(communityBoostConfig);
  console.log("\n🎉 Seeding complete!");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
