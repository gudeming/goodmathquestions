/**
 * World C · Chance & luck (`chance-and-luck`). Catalog: 02-hero-question-catalog.md §C.
 * Batch 1: C2 monty-hall. Batch 2: C1 birthday-paradox, C3 two-dice-sum, C6 odd-even-game,
 * C8 rolls-until-six, C9 someone-shares-my-birthday (birthday_room / dice_lab).
 * TODO(phase-3 batch 3): C4 (coin_flips), C5 (sock_drawer), C7 (pi_darts), C10 (sequence_lineup).
 */
import type { HeroQuestionBlueprint } from "./_template";

/** C2. The guess is the question: the CHOICE answer reuses the guess options. */
export const montyHall: HeroQuestionBlueprint = {
  slug: "monty-hall",
  collection: "chance-and-luck",
  kind: "PARADOX",
  ageGroup: "AGE_10_12",
  difficulty: "MEDIUM",
  category: "PROBABILITY",
  title: { en: "Switch or Stay?", zh: "换还是不换" },
  hook: {
    en: "There are three closed doors: a new bike behind one, and a goat behind each of the others. You pick a door. The host knows where the bike is, so he opens a different door and shows you a goat. Should you switch to the last closed door?",
    zh: "有三扇关着的门，一扇后面是一辆新自行车，另外两扇后面各是一只山羊。你选了一扇门。主持人知道车在哪儿，他打开另一扇门，里面是山羊。你要不要换到剩下的那扇门？",
  },
  guess: {
    type: "choice",
    options: [
      { id: "switch", en: "Switch", zh: "换" },
      { id: "stay", en: "Stay", zh: "不换" },
      { id: "same", en: "It doesn't matter", zh: "换不换都一样" },
    ],
  },
  scene: { type: "monty_hall", doors: 3, rounds: 20, seed: 7 },
  prompt: {
    en: "To give yourself the best chance of winning the bike, should you switch doors, stay with your first pick, or does it make no difference?",
    zh: "想让赢到自行车的机会最大，你应该换门，坚持原来的门，还是换不换都一样？",
  },
  answer: { type: "CHOICE", correctId: "switch" },
  hints: [
    { en: "Forget the host for a moment. When you first pick a door, what is the chance it hides the bike?", zh: "先别管主持人。你刚选门的时候，选中自行车的机会有多大？" },
    { en: "Play it out: say you always switch. When does switching lose? Only when your first pick was already the bike.", zh: "推一推：假设你每次都换。什么时候换了会输？只有你第一次就选中车的时候。" },
    { en: "Your first pick is wrong 2 times out of 3. Each time it's wrong, the host has to leave the bike behind the last closed door.", zh: "第一次选错的机会是三分之二。每次你选错，主持人只能把车留在剩下那扇关着的门后面。" },
  ],
  wrongAnswers: [
    {
      match: "choice:same",
      feedback: {
        en: "Most people think this: two doors are left, so it must be 50-50. But the host isn't opening doors at random. He knows where the bike is and never opens that door.",
        zh: "大多数人都这么想：剩两扇门，那就是一半对一半。可是主持人不是随便开门的，他知道车在哪儿，绝不会打开那扇门。",
      },
    },
    {
      match: "choice:stay",
      feedback: {
        en: "Sticking with your first pick feels safe. But that door had a 1 in 3 chance when you picked it, and the host showing you a goat doesn't change that.",
        zh: "坚持第一次的选择感觉很稳。可是你选它的时候，它只有三分之一的机会，主持人给你看一只山羊也改变不了这一点。",
      },
    },
  ],
  explanation: {
    en: "Your first pick is right 1 time in 3, so staying wins 1 time in 3. The other 2 times, the bike is behind one of the doors you didn't pick, and the host opens the goat one. So switching wins 2 times in 3.",
    zh: "第一次选中车的机会是三分之一，所以不换只有三分之一的机会赢。另外三分之二的时候，车在你没选的两扇门里，主持人把有山羊的那扇打开了。所以换门赢的机会是三分之二。",
  },
  aha: {
    en: "Your first pick is wrong 2 times out of 3. The host clears away one wrong door for you, so switching catches that whole 2 out of 3.",
    zh: "你第一次选错的机会是三分之二。主持人替你排除了一扇错的门，换过去就把这三分之二全接住了。",
  },
  extension: {
    en: "Now there are 100 doors. You pick one, and the host opens 98 goat doors. Would you switch now? Why do more doors make the answer easier to feel?",
    zh: "现在有 100 扇门。你选一扇，主持人打开 98 扇山羊门。你换不换？为什么门越多，答案反而越好懂？",
  },
  discussionPrompt: {
    en: "How many rounds did you play in the scene before you believed it? If you still don't, what is your best argument?",
    zh: "你在场景里玩了几局才相信？如果还是不信，你最有力的理由是什么？",
  },
  solutionTags: ["simulate", "table", "draw"],
  funFact: {
    en: "When a magazine printed this answer in 1990, thousands of readers wrote in to say it was wrong, including some math professors. The answer was right.",
    zh: "1990 年，一本杂志登出了这道题的答案，几千名读者写信说答案错了，其中还有数学教授。其实答案是对的。",
  },
  sortOrder: 2,
  rubricNotes:
    "19/20 — hook 2, guess 2, hands-on 2, aha 2, floor 1, ceiling 2, paths 2, wrong 2, hints 2, retell 2: the probability argument is a stretch at 10, but playing 20 rounds in the scene gets every kid started",
};

/** C1. The 50% point is 23 people (50.7%); 22 gives 47.6%, so the ESTIMATE window is 22-24. */
export const birthdayParadox: HeroQuestionBlueprint = {
  slug: "birthday-paradox",
  collection: "chance-and-luck",
  kind: "ESTIMATION",
  ageGroup: "AGE_12_14",
  difficulty: "MEDIUM",
  category: "PROBABILITY",
  title: { en: "The Birthday Surprise", zh: "要多少人才会撞生日" },
  hook: {
    en: "Picture a room slowly filling up with people. At some point, it becomes more likely than not that two of them share a birthday. How many people do you think that takes?",
    zh: "想象一个房间里的人越来越多。到某个时候，「有两个人同一天生日」会变得比「没有」更可能。你觉得要多少人？",
  },
  guess: {
    type: "slider",
    min: 2,
    max: 365,
    step: 1,
    unit: { en: "people", zh: "人" },
  },
  scene: { type: "birthday_room", mode: "any_pair", maxPeople: 60, trials: 200, seed: 23 },
  prompt: {
    en: "Ignore leap years, so there are 365 possible birthdays. What is the smallest number of people in a room that gives a better than 50% chance that at least two of them share a birthday?",
    zh: "不算闰年，一年有 365 个可能的生日。房间里最少要有多少人，至少两个人同一天生日的机会才会超过 50%？",
  },
  answer: { type: "ESTIMATE", min: 22, max: 24, truth: 23, unit: { en: "people", zh: "人" } },
  hints: [
    { en: "The question isn't about someone matching YOU. Any two people in the room count. How many different pairs of people are in a room?", zh: "题目问的不是有人和「你」同一天，房间里任何两个人都算。一个房间里能配出多少对人？" },
    { en: "Try it the other way round: work out the chance that nobody matches. The second person must miss 1 birthday, the third must miss 2, and so on.", zh: "反过来想：算一算「谁都不撞」的机会。第二个人要避开 1 个生日，第三个人要避开 2 个，依此类推。" },
    { en: "Multiply 364/365 × 363/365 × 362/365 × … one person at a time, and stop when the result drops below one half. Or test room sizes in the scene.", zh: "一个人一个人地乘：364/365 × 363/365 × 362/365 × ……，乘到结果小于一半就停下。也可以在场景里试不同的人数。" },
  ],
  wrongAnswers: [
    {
      match: "183",
      feedback: {
        en: "183 is about half of 365. But you don't need half the days to be taken. Any two people matching counts, and the number of pairs grows really fast.",
        zh: "183 差不多是 365 的一半。可是题目不需要占满一半的日子，只要任何两个人撞上就算，而人和人配成的对数涨得飞快。",
      },
    },
    {
      match: "regex:^36[56]$",
      feedback: {
        en: "That many people makes a match almost certain: with 366 it's guaranteed. But the question only asks for a better than 50% chance, and that comes much, much sooner.",
        zh: "这么多人几乎一定会撞，366 个人就是百分之百。可题目只要机会超过 50%，那来得早得多。",
      },
    },
    {
      match: "gt:correct",
      feedback: {
        en: "Too many. Try the scene with fewer people: the chance passes 50% long before most people expect.",
        zh: "多了。在场景里试试更少的人数：机会超过 50% 比大多数人想的早得多。",
      },
    },
    {
      match: "lt:correct",
      feedback: {
        en: "Too few. With that many people, the chance of a match is still under one half. Add people in the scene and watch the curve.",
        zh: "少了。这么多人时，撞生日的机会还不到一半。在场景里加人，看看曲线怎么走。",
      },
    },
  ],
  explanation: {
    en: "The chance that nobody shares is 364/365 × 363/365 × …, with one fraction for each extra person. With 23 people that product drops to about 49.3%, so the chance of a match is about 50.7%. With 22 people it is only about 47.6%, so 23 is the first room size above one half.",
    zh: "「谁都不撞」的机会是 364/365 × 363/365 × ……，每多一个人就多乘一个分数。23 个人时，这个乘积降到大约 49.3%，所以有人撞生日的机会约 50.7%。22 个人时只有约 47.6%，所以 23 是第一个超过一半的人数。",
  },
  aha: {
    en: "You were thinking about someone matching you, but any two people count. 23 people make 253 different pairs, and every pair is another chance.",
    zh: "你想的是「有人和我同一天」，可是任何两个人都算。23 个人能配成 253 对，每一对都是一次机会。",
  },
  extension: {
    en: "How many people do you need for a 99% chance of a shared birthday? Guess first, then check with the scene.",
    zh: "要有 99% 的机会撞生日，需要多少人？先猜，再用场景验证。",
  },
  discussionPrompt: {
    en: "Find out the birthdays in your class or your family. Did two people share one? Is that what this question predicts for a group that size?",
    zh: "问问你们班或者家里亲戚的生日。有没有两个人同一天？这和这道题对这么多人的预测一样吗？",
  },
  solutionTags: ["simulate", "pair", "table"],
  funFact: {
    en: "At the 2014 football World Cup, every team had 23 players. 16 of the 32 teams had two players with the same birthday: half of them, just as the math predicts.",
    zh: "2014 年足球世界杯，每支球队有 23 名球员。32 支球队里，有 16 支队里有两名球员同一天生日，正好一半，和数学预测的一样。",
  },
  sortOrder: 1,
  rubricNotes:
    "19/20 — hook 2, guess 2, hands-on 2, aha 2, floor 1, ceiling 2, paths 2, wrong 2, hints 2, retell 2: multiplying 22 fractions is out of reach for many, but the scene gives everyone a way in; pairs, the complement product and simulation are all real paths",
};

/**
 * C3. Answered as a CHOICE that reuses the guess options (2..12 plus "all the same"): the
 * child taps a total, and the classic "they're all equally likely" mistake gets its own button.
 */
export const twoDiceSum: HeroQuestionBlueprint = {
  slug: "two-dice-sum",
  collection: "chance-and-luck",
  kind: "THREE_ACT",
  ageGroup: "AGE_8_10",
  difficulty: "EASY",
  category: "PROBABILITY",
  title: { en: "The Lucky Total", zh: "两个骰子最爱哪个和" },
  hook: {
    en: "Roll two dice and add up the dots. You get to pick one total, and you win a sticker every time it comes up. Which total gets you the most stickers?",
    zh: "掷两个骰子，把点数加起来。你可以选一个和，每次掷出这个和，你就得一张贴纸。选哪个和，得到的贴纸最多？",
  },
  guess: {
    type: "choice",
    options: [
      ...["2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"].map((t) => ({ id: t, en: t, zh: t })),
      { id: "same", en: "They're all equally likely", zh: "每个和都一样多" },
    ],
  },
  // seed 6: after the first "Roll 300", 7 is clearly the tallest bar (55 vs 38 for 8).
  scene: { type: "dice_lab", mode: "sum", dice: 2, rolls: 300, seed: 6 },
  prompt: {
    en: "When you roll two dice and add them, which total comes up most often? Or are they all equally likely?",
    zh: "掷两个骰子把点数相加，哪个和出现得最多？还是每个和都一样多？",
  },
  answer: { type: "CHOICE", correctId: "7" },
  hints: [
    { en: "Roll a lot in the scene and watch which bar grows tallest. Then ask yourself why.", zh: "在场景里多掷几次，看哪根柱子长得最高。然后想想为什么。" },
    { en: "Count the ways to make each total. 2 needs a 1 and a 1: just one way. How many ways make 3? Remember 1 + 2 and 2 + 1 are different rolls.", zh: "数一数每个和有几种凑法。2 只能是 1 和 1，只有一种。3 有几种？记住 1 + 2 和 2 + 1 是两种不同的掷法。" },
    { en: "Make a 6 by 6 table: one die across the top, the other down the side, and the total in each box. Which total fills the most boxes?", zh: "画一张 6 × 6 的表：一个骰子写在上面，另一个写在左边，每格填上两数之和。哪个和占的格子最多？" },
  ],
  wrongAnswers: [
    {
      match: "choice:same",
      feedback: {
        en: "Each die is fair, so it feels like every total should be fair too. But totals aren't like faces: 2 can only be made with 1 + 1, while 6 can be made five different ways.",
        zh: "每个骰子都很公平，所以感觉每个和也应该一样多。可是和不一样：2 只能是 1 + 1，6 却有五种凑法。",
      },
    },
    {
      match: "choice:6",
      feedback: {
        en: "6 is a great guess, and it's close! It can be made 5 ways. Is there a total that can be made even more ways?",
        zh: "6 猜得很好，已经很接近了！它有 5 种凑法。有没有凑法更多的和？",
      },
    },
    {
      match: "choice:8",
      feedback: {
        en: "8 is close: like 6, it can be made 5 ways. Is there a total that can be made even more ways?",
        zh: "8 很接近：它和 6 一样有 5 种凑法。有没有凑法更多的和？",
      },
    },
    {
      match: "choice:12",
      feedback: {
        en: "12 is the biggest total, but it's one of the rarest. You need two 6s at once, and that's only 1 roll out of 36.",
        zh: "12 是最大的和，却是最少见的之一。要两个骰子同时是 6，36 种掷法里只有 1 种。",
      },
    },
    {
      match: "choice:2",
      feedback: {
        en: "2 is just as rare as 12: both dice have to show 1. Only 1 roll out of 36 does that.",
        zh: "2 和 12 一样少见：两个骰子都要是 1。36 种掷法里只有 1 种。",
      },
    },
  ],
  explanation: {
    en: "Two dice can land in 6 × 6 = 36 equally likely ways. A total of 7 comes from 1 + 6, 2 + 5, 3 + 4, 4 + 3, 5 + 2 and 6 + 1, which is 6 ways. Every other total has fewer ways, so 7 comes up most often, about 1 roll in 6.",
    zh: "两个骰子一共有 6 × 6 = 36 种同样可能的结果。和是 7 的有 1 + 6、2 + 5、3 + 4、4 + 3、5 + 2、6 + 1，一共 6 种。别的和凑法都比它少，所以 7 出现得最多，大约每 6 次出现 1 次。",
  },
  aha: {
    en: "Every face of a die is equally likely, but totals are not: 7 has six ways to happen and 2 has only one. That's why the bars make a tent shape with 7 at the top.",
    zh: "每个点数一样可能，可是和不一样：7 有六种凑法，2 只有一种。所以柱状图像一顶帐篷，7 在最高处。",
  },
  extension: {
    en: "Roll three dice and add them. Which total comes up most often now? (Careful: there might be a tie.)",
    zh: "掷三个骰子相加，现在哪个和最多？（小心：可能有两个并列。）",
  },
  discussionPrompt: {
    en: "After 300 rolls, what shape did the bars make? Explain why the shape comes out that way.",
    zh: "掷了 300 次以后，柱子排成了什么形状？说说为什么会是这个形状。",
  },
  solutionTags: ["simulate", "table", "pattern"],
  funFact: {
    en: "In the board game Catan, the numbers 6 and 8 are printed in red as a warning: after 7, they are the totals that come up most.",
    zh: "桌游《卡坦岛》里，数字 6 和 8 印成红色，提醒大家：除了 7，就数它们最常出现。",
  },
  sortOrder: 3,
  rubricNotes:
    "18/20 — hook 2, guess 2, hands-on 2, aha 2, floor 2, ceiling 1, paths 2, wrong 2, hints 2, retell 1: the three-dice extension is mostly 'do it again', the bell shape is only hinted at",
};

/**
 * C6. Even product 27/36, odd 9/36. Created new: the legacy "Dice Game Fairness" row asks for
 * P(sum = 7), which is not this question, so it is not upgraded here.
 * English names follow the rule (Evan / even, Otto / odd); Chinese keeps 小明 / 小红.
 */
export const oddEvenGame: HeroQuestionBlueprint = {
  slug: "odd-even-game",
  collection: "chance-and-luck",
  kind: "PUZZLE",
  ageGroup: "AGE_8_10",
  difficulty: "MEDIUM",
  category: "PROBABILITY",
  title: { en: "Is This Game Fair?", zh: "这个游戏公平吗" },
  hook: {
    en: "Evan and Otto roll two dice and multiply the numbers. If the answer is even, Evan gets a point. If it's odd, Otto gets a point. If you could choose, whose side would you take?",
    zh: "小明和小红一起掷两个骰子，把点数相乘。乘积是双数，小明得一分；是单数，小红得一分。如果让你选，你愿意当谁？",
  },
  guess: {
    type: "choice",
    options: [
      { id: "xiaoming", en: "Evan, who scores on even", zh: "小明（双数得分）" },
      { id: "xiaohong", en: "Otto, who scores on odd", zh: "小红（单数得分）" },
      { id: "same", en: "It's fair, so it doesn't matter", zh: "很公平，当谁都一样" },
    ],
  },
  scene: { type: "dice_lab", mode: "product", dice: 2, rolls: 300, seed: 6 },
  prompt: {
    en: "Two dice are rolled and multiplied. An even product scores for Evan, an odd one for Otto. Who is more likely to win a round, or is the game fair?",
    zh: "掷两个骰子相乘，双数小明得分，单数小红得分。每一局谁更可能得分？还是这个游戏很公平？",
  },
  answer: { type: "CHOICE", correctId: "xiaoming" },
  hints: [
    { en: "Half the numbers on a die are even and half are odd, but that doesn't mean the products split half and half. Try some rolls in the scene first.", zh: "骰子上一半是双数一半是单数，可这不代表乘积也一半一半。先在场景里掷几次看看。" },
    { en: "Work out some products: 2 × 3, 4 × 5, 3 × 5, 6 × 1. When does a product come out odd?", zh: "算几个乘积：2 × 3、4 × 5、3 × 5、6 × 1。什么时候乘积会是单数？" },
    { en: "A product is odd only when BOTH dice are odd. Each die is odd 3 ways out of 6. How many of the 36 rolls have two odd dice?", zh: "只有两个骰子都是单数，乘积才是单数。每个骰子有 3 种单数。36 种结果里，有多少种两个都是单数？" },
  ],
  wrongAnswers: [
    {
      match: "choice:same",
      feedback: {
        en: "Half the faces are odd and half are even, so it feels fair. But one even die is enough to make the whole product even. Odd needs both dice to be odd.",
        zh: "骰子上单数双数各一半，所以感觉很公平。可是只要有一个骰子是双数，乘积就是双数。单数得两个骰子都是单数才行。",
      },
    },
    {
      match: "choice:xiaohong",
      feedback: {
        en: "There are plenty of odd numbers on a die, so this is a fair guess. But for an odd product, both dice have to be odd at the same time, and that only happens 9 times out of 36.",
        zh: "骰子上单数不少，这样猜也有道理。可是乘积要是单数，两个骰子得同时是单数，36 种结果里只有 9 种。",
      },
    },
  ],
  explanation: {
    en: "There are 36 equally likely rolls. The product is odd only when both dice are odd, which is 3 × 3 = 9 rolls. The other 27 rolls have at least one even die, so their product is even. On average Evan wins 27 rounds out of 36, three times as many as Otto.",
    zh: "两个骰子一共有 36 种同样可能的结果。只有两个都是单数，乘积才是单数：3 × 3 = 9 种。剩下 27 种至少有一个双数，乘积就是双数。平均 36 局里小明赢 27 局，是小红的 3 倍。",
  },
  aha: {
    en: "Even numbers take over multiplication: one even die makes the whole product even. Odd only survives when both dice are odd, just 1 time in 4.",
    zh: "乘法里双数特别「霸道」：只要有一个骰子是双数，乘积就是双数。单数要两个骰子都是单数才行，只有四分之一的机会。",
  },
  extension: {
    en: "What if the game used the sum instead of the product? Is that fair? Can you change the rules of the product game so that it becomes fair?",
    zh: "如果改成把点数相加呢？公平吗？你能改一改相乘游戏的规则，让它变公平吗？",
  },
  discussionPrompt: {
    en: "Invent a dice game that looks unfair but is actually fair. Post the rules and let others check it.",
    zh: "设计一个看起来不公平、其实很公平的骰子游戏。把规则贴出来，让大家来验证。",
  },
  solutionTags: ["simulate", "table", "pattern"],
  funFact: {
    en: "The more dice you multiply, the more even wins: with three dice, the product is even 7 times out of 8.",
    zh: "骰子越多，双数赢得越多：三个骰子相乘，8 次里有 7 次是双数。",
  },
  sortOrder: 6,
  rubricNotes:
    "18/20 — hook 2, guess 2, hands-on 2, aha 2, floor 2, ceiling 1, paths 2, wrong 2, hints 2, retell 1: the 'make it fair' extension is good but stays small; simulate, 6 × 6 table and the parity argument are all real paths",
};

/** C8. Geometric distribution, mean 1/p = 6. The scene's seed lands the 300-round average near 6. */
export const rollsUntilSix: HeroQuestionBlueprint = {
  slug: "rolls-until-six",
  collection: "chance-and-luck",
  kind: "ESTIMATION",
  ageGroup: "AGE_10_12",
  difficulty: "MEDIUM",
  category: "PROBABILITY",
  title: { en: "Waiting for a Six", zh: "等一个 6 要多久" },
  hook: {
    en: "In some board games you can't start moving until you roll a six. Some days it comes right away, and some days it takes forever. On average, how many rolls does it take?",
    zh: "有些棋类游戏要掷出 6 才能出发。有时候一下就掷到了，有时候怎么也掷不出来。平均要掷几次？",
  },
  guess: {
    type: "slider",
    min: 1,
    max: 20,
    step: 1,
    unit: { en: "rolls", zh: "次" },
  },
  // seed 16: the average after the first 300 rounds is 5.97 (and the longest wait is a whopping 53).
  scene: { type: "dice_lab", mode: "until_target", dice: 1, target: 6, rolls: 300, seed: 16 },
  prompt: {
    en: "Roll one fair die again and again until you get a six, and count the rolls, including the six. If you play many rounds like this, what is the average number of rolls per round?",
    zh: "拿一个公平的骰子一直掷，直到掷出 6 为止，数一数用了几次（掷出 6 的那次也算）。这样玩很多轮，平均每轮要掷几次？",
  },
  answer: { type: "ESTIMATE", min: 5.5, max: 6.5, truth: 6, unit: { en: "rolls", zh: "次" } },
  hints: [
    { en: "Play a few rounds in the scene and write down how many rolls each one took. Then press the big button and watch the average.", zh: "在场景里玩几轮，记下每轮用了几次。然后按大按钮，看平均数怎么变。" },
    { en: "Each roll has a 1 in 6 chance of being a six. If you rolled 600 times in a row, about how many sixes would you get?", zh: "每掷一次，掷出 6 的机会是六分之一。如果连着掷 600 次，大约会掷出几个 6？" },
    { en: "About 100 sixes in 600 rolls means the rolls split into about 100 rounds. How many rolls is that per round, on average?", zh: "600 次里大约有 100 个 6，也就是大约分成了 100 轮。平均每轮是几次？" },
  ],
  wrongAnswers: [
    {
      match: "3.5",
      feedback: {
        en: "3.5 is the average number of DOTS on a die. This question is about how many rolls you wait, which is a different thing.",
        zh: "3.5 是骰子平均的点数。这道题问的是要等几次，不是一回事。",
      },
    },
    {
      match: "3",
      feedback: {
        en: "Maybe you thought 'half of 6'. It's true that about half the time you get a six within 4 rolls. But some rounds take 15 or 20 rolls, and those long waits pull the average up.",
        zh: "你可能想的是「6 的一半」。确实，大约一半的时候 4 次以内就能掷到 6。可是有些轮要等 15 次、20 次，这些长长的等待把平均数拉高了。",
      },
    },
    {
      match: "1",
      feedback: {
        en: "Sometimes you get it on the very first roll, but that only happens 1 time in 6. Most rounds take longer.",
        zh: "有时候第一次就掷到 6，可那只有六分之一的机会。大多数轮都要更久。",
      },
    },
    {
      match: "lt:correct",
      feedback: {
        en: "A bit low. Long waits happen more often than you'd think, and they count in the average too. Try 300 rounds in the scene.",
        zh: "有点少。很长的等待比你想的更常见，它们也要算进平均数。在场景里试试 300 轮。",
      },
    },
    {
      match: "gt:correct",
      feedback: {
        en: "A bit high. Long waits do happen, but most rounds end sooner. Try 300 rounds in the scene and watch where the average settles.",
        zh: "有点多。确实会有很长的等待，但大多数轮结束得更早。在场景里试 300 轮，看平均数停在哪里。",
      },
    },
  ],
  explanation: {
    en: "Each roll is a six with chance 1/6, so in a long run of rolls about one in every six is a six. Those sixes split the rolls into rounds, and the rounds average 6 rolls each. The scene's running average settles close to 6 after a few hundred rounds.",
    zh: "每一次掷出 6 的机会是六分之一，所以掷很多很多次的时候，大约每 6 次里有 1 个 6。这些 6 把所有的掷骰分成一轮一轮，平均每轮 6 次。场景里玩几百轮以后，平均数会停在 6 附近。",
  },
  aha: {
    en: "The average wait is 6, yet half the time you're done within 4 rolls. A few very long waits, sometimes more than 20 rolls, pull the average up.",
    zh: "平均要等 6 次，可是一半的时候 4 次以内就掷到了。少数特别长的等待，有时超过 20 次，把平均数拉高了。",
  },
  extension: {
    en: "What if you keep rolling until you get two sixes in a row? Guess first: is the average wait 12 rolls, or much longer?",
    zh: "如果要一直掷到连续两次 6 呢？先猜：平均要等 12 次，还是久得多？",
  },
  discussionPrompt: {
    en: "What was the longest round in your simulation? Did it surprise you, and does it change how you feel about 'waiting for a six'?",
    zh: "你模拟的时候，最长的一轮等了几次？吓到你了吗？它会不会改变你对「等一个 6」的感觉？",
  },
  solutionTags: ["simulate", "table"],
  funFact: {
    en: "The same rule works for any chance: if something happens 1 time in 10, you wait 10 tries on average. Getting all six faces of a die at least once takes about 14.7 rolls.",
    zh: "这个道理对任何机会都成立：一件事每 10 次发生 1 次，平均就要等 10 次。想把骰子的六个面都掷到一遍，平均大约要掷 14.7 次。",
  },
  sortOrder: 8,
  rubricNotes:
    "18/20 — hook 2, guess 2, hands-on 2, aha 2, floor 2, ceiling 2, paths 1, wrong 2, hints 2, retell 1: simulation is the main path (the '600 rolls' argument is the only other); the median-vs-mean surprise carries the aha",
};

/**
 * C9. P(someone among n others shares my birthday) = 1 − (364/365)^n first passes 50% at n = 253,
 * the same number as the pairs among C1's 23 people.
 */
export const someoneSharesMyBirthday: HeroQuestionBlueprint = {
  slug: "someone-shares-my-birthday",
  collection: "chance-and-luck",
  kind: "ESTIMATION",
  ageGroup: "AGE_12_14",
  difficulty: "HARD",
  category: "PROBABILITY",
  title: { en: "Someone Born on My Birthday", zh: "和「我」同一天生日" },
  hook: {
    en: "A fairly small class is often enough for two people to share a birthday. But what about someone sharing YOUR birthday? How many other people would you need before that's more likely than not?",
    zh: "一个不大的班级里，常常就有两个人同一天生日。可如果要有人和「你」同一天生日呢？身边要有多少人，这件事才会比不发生更可能？",
  },
  guess: {
    type: "slider",
    min: 2,
    max: 500,
    step: 1,
    unit: { en: "people", zh: "人" },
  },
  scene: { type: "birthday_room", mode: "match_me", maxPeople: 500, trials: 200, seed: 253 },
  prompt: {
    en: "Ignore leap years. Besides you, how many other people must be in the room for a better than 50% chance that at least one of them has the same birthday as you?",
    zh: "不算闰年。除了你以外，房间里至少要有多少人，其中有人和你同一天生日的机会才会超过 50%？",
  },
  answer: { type: "ESTIMATE", min: 240, max: 260, truth: 253, unit: { en: "people", zh: "人" } },
  hints: [
    { en: "This time only pairs that include YOU count. Each other person is one chance, and each chance is small. How small?", zh: "这次只有包括「你」的那些对才算。每多一个人就多一次机会，可每次机会都很小。有多小？" },
    { en: "Work out the chance that nobody matches you. Each person misses your birthday with chance 364/365, and you multiply one 364/365 for every person.", zh: "先算「没有人和你撞」的机会。每个人避开你生日的机会是 364/365，有几个人就乘几个 364/365。" },
    { en: "Keep multiplying by 364/365 until the result falls below one half. Use a calculator, or try room sizes in the scene.", zh: "一直乘 364/365，直到结果小于一半。可以用计算器，也可以在场景里试不同的人数。" },
  ],
  wrongAnswers: [
    {
      match: "183",
      feedback: {
        en: "Half of 365 is the natural guess, and it would be right if everyone had a different birthday. But the other people can share birthdays with each other, so 183 people cover fewer than 183 days.",
        zh: "365 的一半是很自然的猜法。如果大家的生日都不一样，那就对了。可是其他人之间也会撞生日，所以 183 个人占不满 183 天。",
      },
    },
    {
      match: "23",
      feedback: {
        en: "23 is the answer for ANY two people matching. Here only matches with you count, so far fewer pairs are useful.",
        zh: "23 是「任何两个人撞生日」的答案。这里只有和你撞才算，有用的对就少多了。",
      },
    },
    {
      match: "regex:^36[456]$",
      feedback: {
        en: "Even that many people doesn't guarantee a match with you: two of them can land on the same day and leave yours empty. And the 50% point comes earlier than that.",
        zh: "就算这么多人，也不能保证有人和你同一天：他们之间可能撞在同一天，把你的生日空出来。而且 50% 的那个点来得更早。",
      },
    },
    {
      match: "lt:correct",
      feedback: {
        en: "Too few. With that many people, it's still more likely that nobody shares your birthday.",
        zh: "少了。这么多人的时候，还是「没人和你同一天」更可能。",
      },
    },
    {
      match: "gt:correct",
      feedback: {
        en: "Too many. By then a match with you is already more likely than not. Try a smaller room in the scene.",
        zh: "多了。到那时，有人和你同一天已经比没有更可能了。在场景里试试少一点的人。",
      },
    },
  ],
  explanation: {
    en: "Each other person misses your birthday with chance 364/365. For nobody to match, all of them have to miss, so you multiply 364/365 once for each person. That product first falls below one half at 253 people. So 253 is the answer, exactly 11 times as many as for any two people.",
    zh: "每个人避开你生日的机会是 364/365。要没有一个人和你撞，就得每个人都避开，所以有几个人就乘几个 364/365。乘到 253 个人时，结果第一次小于一半。所以答案是 253，正好是「任意两人」那道题的 11 倍。",
  },
  aha: {
    en: "23 people make 253 pairs, but here only the pairs that include you count. To get 253 chances that include you, you need 253 other people.",
    zh: "23 个人能配成 253 对，可这里只有带上「你」的对才算。想要 253 次和你有关的机会，就得有 253 个别人。",
  },
  extension: {
    en: "Explain what goes wrong with the 'half of 365' idea. Then work out how many people make a match with you 90% likely.",
    zh: "说说「365 的一半」这个想法错在哪里。再算算：要有 90% 的机会有人和你同一天生日，需要多少人？",
  },
  discussionPrompt: {
    en: "Did doing the 'any two people' birthday question first make your guess here better or worse? Why?",
    zh: "先做过「任意两人撞生日」那道题，这次你猜得更准了还是更离谱了？为什么？",
  },
  solutionTags: ["simulate", "algebra", "pair"],
  funFact: {
    en: "So in a school of about 250 kids, it's roughly a coin toss whether anyone shares your birthday, but two kids sharing a birthday with each other is almost certain.",
    zh: "所以在一所大约 250 人的学校里，有没有人和你同一天生日差不多是一半对一半；可是有两个人彼此同一天生日，几乎是肯定的。",
  },
  sortOrder: 9,
  rubricNotes:
    "17/20 — hook 2, guess 2, hands-on 2, aha 2, floor 1, ceiling 2, paths 1, wrong 2, hints 2, retell 1: needs repeated multiplication or the scene; best right after birthday-paradox, which the hook leans on",
};

export const CHANCE_AND_LUCK: readonly HeroQuestionBlueprint[] = [
  birthdayParadox,
  montyHall,
  twoDiceSum,
  oddEvenGame,
  rollsUntilSix,
  someoneSharesMyBirthday,
];
