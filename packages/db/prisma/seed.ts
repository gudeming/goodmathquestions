import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

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
  ]);

  // Create sample questions
  const questions = [
    {
      titleEn: "The Pizza Problem",
      titleZh: "披萨问题",
      contentEn:
        "If you cut a pizza into 8 equal slices and eat 3, what fraction of the pizza is left?",
      contentZh:
        "如果你把一个披萨切成8等份，吃了3片，剩下的披萨是多少？",
      difficulty: "EASY" as const,
      category: "FRACTIONS" as const,
      ageGroup: "AGE_8_10" as const,
      answer: "5/8",
      answerExplainEn:
        "You started with 8 slices and ate 3. That leaves 8 - 3 = 5 slices out of 8 total. So the fraction left is 5/8!",
      answerExplainZh:
        "你开始有8片，吃了3片。剩下8 - 3 = 5片，总共8片。所以剩下的分数是5/8！",
      hints: [
        { en: "Think about how many slices you started with", zh: "想想你一开始有多少片" },
        { en: "You had 8 slices and ate 3...", zh: "你有8片，吃了3片..." },
        { en: "8 - 3 = 5 slices left out of 8 total", zh: "8 - 3 = 5片，总共8片" },
      ],
      animationConfig: {
        type: "pizza_slice",
        totalSlices: 8,
        eatenSlices: 3,
      },
      funFactEn:
        "Did you know? The word 'fraction' comes from the Latin word 'fractio' which means 'to break'!",
      funFactZh:
        "你知道吗？分数这个概念最早出现在古埃及，他们用分数来分配尼罗河的土地！",
      isPublished: true,
      sortOrder: 1,
    },
    {
      titleEn: "The Mystery Number",
      titleZh: "神秘数字",
      contentEn:
        "I am a number. When you multiply me by 6 and add 4, you get 40. What am I?",
      contentZh:
        "我是一个数字。当你把我乘以6再加4，你得到40。我是什么？",
      difficulty: "MEDIUM" as const,
      category: "ALGEBRA" as const,
      ageGroup: "AGE_10_12" as const,
      answer: "6",
      answerExplainEn:
        "Let the mystery number be x. We know 6x + 4 = 40. Subtract 4: 6x = 36. Divide by 6: x = 6!",
      answerExplainZh:
        "设神秘数字为x。我们知道6x + 4 = 40。减去4：6x = 36。除以6：x = 6！",
      hints: [
        { en: "Write it as an equation: 6 × ? + 4 = 40", zh: "写成方程：6 × ? + 4 = 40" },
        { en: "First, subtract 4 from both sides", zh: "首先，两边都减4" },
        { en: "6 × ? = 36. Now divide by 6", zh: "6 × ? = 36。现在除以6" },
      ],
      animationConfig: {
        type: "balance_scale",
        leftSide: { expression: "6x + 4" },
        rightSide: { value: 40 },
      },
      funFactEn:
        "Algebra was invented by a Persian mathematician named Al-Khwarizmi around 820 AD. The word 'algorithm' comes from his name!",
      funFactZh:
        "代数是由波斯数学家花拉子米在公元820年左右发明的。'算法'这个词就来源于他的名字！",
      isPublished: true,
      sortOrder: 2,
    },
    {
      titleEn: "Triangle Detective",
      titleZh: "三角形侦探",
      contentEn:
        "A triangle has angles of 60° and 80°. What is the third angle?",
      contentZh:
        "一个三角形有60°和80°的角。第三个角是多少度？",
      difficulty: "EASY" as const,
      category: "GEOMETRY" as const,
      ageGroup: "AGE_8_10" as const,
      answer: "40",
      answerExplainEn:
        "All angles in a triangle add up to 180°. So 60° + 80° + ? = 180°. That means ? = 180° - 60° - 80° = 40°!",
      answerExplainZh:
        "三角形的所有角之和等于180°。所以60° + 80° + ? = 180°。那么? = 180° - 60° - 80° = 40°！",
      hints: [
        { en: "Remember: all angles in a triangle add up to 180°", zh: "记住：三角形的所有角之和等于180°" },
        { en: "60° + 80° = 140°", zh: "60° + 80° = 140°" },
        { en: "180° - 140° = ?", zh: "180° - 140° = ?" },
      ],
      animationConfig: {
        type: "triangle_angles",
        angles: [60, 80, 40],
      },
      funFactEn:
        "The ancient Egyptians used triangles to build the pyramids over 4,500 years ago!",
      funFactZh:
        "古埃及人在4500多年前就用三角形来建造金字塔！",
      isPublished: true,
      sortOrder: 3,
    },
    {
      titleEn: "The Staircase Challenge",
      titleZh: "楼梯挑战",
      contentEn:
        "You can climb 1 or 2 stairs at a time. How many different ways can you climb 5 stairs?",
      contentZh:
        "你每次可以爬1级或2级台阶。爬5级台阶有多少种不同的方法？",
      difficulty: "HARD" as const,
      category: "LOGIC" as const,
      ageGroup: "AGE_12_14" as const,
      answer: "8",
      answerExplainEn:
        "This follows the Fibonacci pattern! For n stairs: 1→1, 2→2, 3→3, 4→5, 5→8 ways. Each step count equals the sum of the previous two!",
      answerExplainZh:
        "这遵循斐波那契模式！对于n级台阶：1→1, 2→2, 3→3, 4→5, 5→8种方法。每一步的数量等于前两步的和！",
      hints: [
        { en: "Start small: How many ways for 1 stair? 2 stairs?", zh: "从小开始：1级台阶有几种方法？2级呢？" },
        { en: "1 stair: 1 way. 2 stairs: 2 ways. 3 stairs: 3 ways.", zh: "1级：1种。2级：2种。3级：3种。" },
        { en: "Notice: ways(n) = ways(n-1) + ways(n-2). It's Fibonacci!", zh: "注意：ways(n) = ways(n-1) + ways(n-2)。这是斐波那契数列！" },
      ],
      animationConfig: {
        type: "staircase",
        totalStairs: 5,
        stepOptions: [1, 2],
      },
      funFactEn:
        "The Fibonacci sequence appears everywhere in nature! From sunflower seeds to pinecone spirals to the shell of a nautilus!",
      funFactZh:
        "斐波那契数列在自然界中无处不在！从向日葵种子到松果螺旋，再到鹦鹉螺的壳！",
      isPublished: true,
      sortOrder: 4,
    },
    {
      titleEn: "Prime Number Hunter",
      titleZh: "质数猎人",
      contentEn: "How many prime numbers are there between 1 and 20?",
      contentZh: "1到20之间有多少个质数？",
      difficulty: "MEDIUM" as const,
      category: "NUMBER_THEORY" as const,
      ageGroup: "AGE_10_12" as const,
      answer: "8",
      answerExplainEn:
        "The primes between 1 and 20 are: 2, 3, 5, 7, 11, 13, 17, 19. That's 8 prime numbers!",
      answerExplainZh:
        "1到20之间的质数是：2, 3, 5, 7, 11, 13, 17, 19。一共8个质数！",
      hints: [
        { en: "A prime number is only divisible by 1 and itself", zh: "质数只能被1和它自己整除" },
        { en: "2 is the smallest (and only even) prime number", zh: "2是最小的（也是唯一的偶数）质数" },
        { en: "Check: 2, 3, 5, 7, 11, 13, 17, 19...", zh: "检查：2, 3, 5, 7, 11, 13, 17, 19..." },
      ],
      animationConfig: {
        type: "number_journey",
        range: [1, 20],
        highlights: [2, 3, 5, 7, 11, 13, 17, 19],
      },
      funFactEn:
        "The largest known prime number has over 24 million digits! It would take you years to write it all out!",
      funFactZh:
        "已知最大的质数有超过2400万位数字！你要写好几年才能写完！",
      isPublished: true,
      sortOrder: 5,
    },
    {
      titleEn: "The Candy Jar",
      titleZh: "糖果罐",
      contentEn:
        "A jar has 5 red, 3 blue, and 2 green candies. If you pick one randomly, what is the probability of getting a blue candy? (Write as a fraction)",
      contentZh:
        "一个罐子里有5颗红糖果、3颗蓝糖果和2颗绿糖果。随机拿一颗，拿到蓝糖果的概率是多少？（写成分数）",
      difficulty: "MEDIUM" as const,
      category: "PROBABILITY" as const,
      ageGroup: "AGE_10_12" as const,
      answer: "3/10",
      answerExplainEn:
        "Total candies: 5 + 3 + 2 = 10. Blue candies: 3. Probability = favorable outcomes / total outcomes = 3/10!",
      answerExplainZh:
        "糖果总数：5 + 3 + 2 = 10。蓝糖果：3颗。概率 = 有利结果 / 总结果 = 3/10！",
      hints: [
        { en: "First, count the total number of candies", zh: "首先，数一下糖果的总数" },
        { en: "Total = 5 + 3 + 2 = 10 candies", zh: "总数 = 5 + 3 + 2 = 10颗糖果" },
        { en: "Probability = blue candies / total candies", zh: "概率 = 蓝糖果数 / 总糖果数" },
      ],
      animationConfig: {
        type: "candy_jar",
        red: 5,
        blue: 3,
        green: 2,
      },
      funFactEn:
        "Probability theory was invented by two French mathematicians, Pascal and Fermat, while trying to solve gambling problems!",
      funFactZh:
        "概率论是由两位法国数学家帕斯卡和费马在试图解决赌博问题时发明的！",
      isPublished: true,
      sortOrder: 6,
    },
    {
      titleEn: "The Magic Square",
      titleZh: "魔方阵",
      contentEn:
        "In a 3×3 magic square, every row, column, and diagonal adds up to 15. If the center number is 5 and the top-left is 2, what is the bottom-right?",
      contentZh:
        "在一个3×3的魔方阵中，每行、每列和每条对角线的和都是15。如果中心数字是5，左上角是2，右下角是多少？",
      difficulty: "HARD" as const,
      category: "LOGIC" as const,
      ageGroup: "AGE_12_14" as const,
      answer: "8",
      answerExplainEn:
        "The diagonal from top-left to bottom-right must sum to 15. So: 2 + 5 + ? = 15, which means ? = 8!",
      answerExplainZh:
        "从左上角到右下角的对角线之和必须是15。所以：2 + 5 + ? = 15，这意味着 ? = 8！",
      hints: [
        { en: "Look at the diagonal from top-left to bottom-right", zh: "看从左上角到右下角的对角线" },
        { en: "The diagonal goes: 2 → 5 → ?", zh: "对角线是：2 → 5 → ?" },
        { en: "2 + 5 + ? = 15", zh: "2 + 5 + ? = 15" },
      ],
      animationConfig: {
        type: "magic_square",
        size: 3,
        targetSum: 15,
        known: { "0,0": 2, "1,1": 5 },
      },
      funFactEn:
        "Magic squares have been studied for over 4,000 years! The oldest one, called Lo Shu, was found in China!",
      funFactZh:
        "魔方阵已经被研究了4000多年！最古老的魔方阵叫洛书，是在中国发现的！",
      isPublished: true,
      sortOrder: 7,
    },
    {
      titleEn: "Speed Math Race",
      titleZh: "速算竞赛",
      contentEn:
        "What is 25 × 4? Tip: Think of a clever shortcut!",
      contentZh:
        "25 × 4 等于多少？提示：想想有没有什么巧妙的方法！",
      difficulty: "EASY" as const,
      category: "ARITHMETIC" as const,
      ageGroup: "AGE_8_10" as const,
      answer: "100",
      answerExplainEn:
        "25 × 4 = 100! A quick way to remember: 4 quarters make $1.00, and 25 cents × 4 = 100 cents!",
      answerExplainZh:
        "25 × 4 = 100！快速记忆法：25分钱 × 4 = 100分钱 = 1元！",
      hints: [
        { en: "Think about money: how many quarters in a dollar?", zh: "想想钱：一元钱有几个25分？" },
        { en: "25 + 25 = 50, and 50 + 50 = ?", zh: "25 + 25 = 50，50 + 50 = ?" },
      ],
      animationConfig: {
        type: "number_combine",
        numbers: [25, 25, 25, 25],
        operation: "add",
      },
      funFactEn:
        "Ancient Egyptian mathematicians only used addition and doubling to multiply! They would double numbers repeatedly!",
      funFactZh:
        "古埃及数学家只用加法和倍增来做乘法！他们会反复将数字翻倍！",
      isPublished: true,
      sortOrder: 8,
    },
  ];

  for (const q of questions) {
    await prisma.question.upsert({
      where: { id: q.titleEn.toLowerCase().replace(/\s+/g, "-") },
      update: {},
      create: {
        ...q,
        hints: q.hints,
        animationConfig: q.animationConfig,
      },
    });
  }

  console.log(`✅ Created ${questions.length} questions`);

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
  ];

  for (const badge of badges) {
    await prisma.badge.create({ data: badge });
  }

  console.log(`✅ Created ${badges.length} badges`);

  // Create a sample classroom
  await prisma.classroom.create({
    data: {
      name: "Mrs. Smith's Math Class",
      classCode: "MATH-2024-ABC",
      teacherName: "Mrs. Smith",
      teacherEmail: "smith@school.edu",
      school: "Maple Elementary",
    },
  });

  console.log("✅ Created sample classroom");

  // Create a demo user
  const hashedPassword = await bcrypt.hash("demo123", 12);
  await prisma.user.create({
    data: {
      username: "demo_student",
      password: hashedPassword,
      displayName: "Demo Student",
      email: "demo@example.com",
      age: 10,
      parentEmail: "parent@example.com",
      authMethod: "PARENT_EMAIL",
      locale: "en",
      xp: 150,
      level: 2,
      streak: 3,
    },
  });

  console.log("✅ Created demo user (username: demo_student, password: demo123)");
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
