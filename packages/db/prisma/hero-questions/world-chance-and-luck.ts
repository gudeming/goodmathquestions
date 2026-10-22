/**
 * World C · Chance & luck (`chance-and-luck`). Catalog: 02-hero-question-catalog.md §C.
 * Batch 1: C2 monty-hall. Batch 2: C1 birthday-paradox, C3 two-dice-sum, C6 odd-even-game,
 * C8 rolls-until-six, C9 someone-shares-my-birthday (birthday_room / dice_lab).
 * Batch 3: C4 coin-streak (coin_flips), C5 socks-in-the-dark (sock_drawer), C7 pi-from-raindrops (pi_darts).
 * Editorial pass 1: Monty Hall's prize matches the scene (🎁, not a bike); C6 uses 偶数/奇数 like the
 * scene and the names 双双/单单 (双数/单数 mnemonic, as Evan/Otto is in English); C7's guess is a
 * choice so the reveal histogram never marks 3.14 on a "drops inside" slider.
 * Batch 4: C10 spot-the-real-random, `illustration` until the Tier-3 sequence_lineup scene lands.
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
    en: "Three closed doors: a big prize behind one, and a goat behind each of the others. You pick a door, and the host, who knows where the prize is, always opens one of the other doors to show you a goat. Should you switch to the last closed door?",
    zh: "三扇关着的门，一扇后面是大奖，另外两扇后面各是一只山羊。你选了一扇门。主持人知道大奖在哪儿，他每次都会打开另一扇门，给你看一只山羊。你要不要换到剩下的那扇门？",
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
    en: "To give yourself the best chance of winning the prize, should you switch doors, stay with your first pick, or does it make no difference?",
    zh: "想让赢到大奖的机会最大，你应该换门，坚持原来的门，还是换不换都一样？",
  },
  answer: { type: "CHOICE", correctId: "switch" },
  hints: [
    { en: "Forget the host for a moment. When you first pick a door, what is the chance it hides the prize?", zh: "先别管主持人。你刚选门的时候，选中大奖的机会有多大？" },
    { en: "Press \"Auto 100 (always switch)\" and then \"Auto 100 (always stay)\". When does switching lose? Only when your first pick was already the prize.", zh: "按「自动玩 100 局（一直换）」，再按「自动玩 100 局（一直不换）」。什么时候换了会输？只有你第一次就选中大奖的时候。" },
    { en: "Your first pick is wrong 2 times out of 3. Each time it's wrong, the host has to leave the prize behind the last closed door.", zh: "第一次选错的机会是三分之二。每次你选错，主持人只能把大奖留在剩下那扇关着的门后面。" },
  ],
  wrongAnswers: [
    {
      match: "choice:same",
      feedback: {
        en: "Most people think this: two doors are left, so it must be 50-50. But the host isn't opening doors at random. He knows where the prize is and never opens that door.",
        zh: "大多数人都这么想：剩两扇门，那就是一半对一半。可是主持人不是随便开门的，他知道大奖在哪儿，绝不会打开那扇门。",
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
    en: "Your first pick is right 1 time in 3, so staying wins 1 time in 3. The other 2 times, the prize is behind one of the doors you didn't pick, and the host opens the goat one. So switching wins 2 times in 3.",
    zh: "第一次选中大奖的机会是三分之一，所以不换只有三分之一的机会赢。另外三分之二的时候，大奖在你没选的两扇门里，主持人把有山羊的那扇打开了。所以换门赢的机会是三分之二。",
  },
  aha: {
    en: "Your first pick is wrong 2 times out of 3. The host clears away one wrong door for you, so switching catches that whole 2 out of 3.",
    zh: "你第一次选错的机会是三分之二。主持人替你排除了一扇错的门，换过去就把这三分之二全接住了。",
  },
  extension: {
    en: "Now there are 100 doors. You pick one, and the host opens 98 goat doors. Would you switch now, and how often would switching win? Why do more doors make the answer easier to feel?",
    zh: "现在有 100 扇门。你选一扇，主持人打开 98 扇山羊门。你换不换？换了以后赢的机会是多少？为什么门越多，答案反而越好懂？",
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
    { en: "Multiply 364/365 × 363/365 × 362/365 × … one person at a time, and stop when the result drops below one half. Or move the \"people in the room\" slider and press \"Simulate 200 rooms\" for each size.", zh: "一个人一个人地乘：364/365 × 363/365 × 362/365 × ……，乘到结果小于一半就停下。也可以拖动「房间里的人数」滑块，每换一个人数就按一次「模拟 200 个房间」。" },
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
        en: "Too few. With that many people, the chance of a match is still under one half. Add people with the slider, simulate again, and watch your dotted line climb.",
        zh: "少了。这么多人时，撞生日的机会还不到一半。用滑块加人，再模拟一次，看你画出的虚线往上爬。",
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
    { en: "Press \"Roll 300\" in the scene and watch which bar grows tallest. Then ask yourself why.", zh: "在场景里按「掷 300 次」，看哪根柱子长得最高。然后想想为什么。" },
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
 * Names carry the rule in both languages: Evan / even and Otto / odd; 双双 / 双数 and 单单 / 单数.
 * The terms are 偶数 / 奇数 as in the scene, with 双数 / 单数 glossed once in the hook.
 * Option ids stay "xiaoming" / "xiaohong" so stored guesses keep their meaning.
 * Extension answers: the sum game is fair (18 : 18); the product game is fair if odd scores 3 points.
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
    en: "Evan and Otto roll two dice and multiply the numbers. If the answer is even, Evan gets a point; if it's odd, Otto gets a point. If you could choose, whose side would you take?",
    zh: "双双和单单一起掷两个骰子，把点数相乘。乘积是偶数（双数），双双得一分；是奇数（单数），单单得一分。如果让你选，你愿意当谁？",
  },
  guess: {
    type: "choice",
    options: [
      { id: "xiaoming", en: "Evan, who scores on even", zh: "双双（偶数得分）" },
      { id: "xiaohong", en: "Otto, who scores on odd", zh: "单单（奇数得分）" },
      { id: "same", en: "It's fair, so it doesn't matter", zh: "很公平，当谁都一样" },
    ],
  },
  scene: { type: "dice_lab", mode: "product", dice: 2, rolls: 300, seed: 6 },
  prompt: {
    en: "Two dice are rolled and multiplied. An even product scores for Evan, an odd one for Otto. Who is more likely to win a round, or is the game fair?",
    zh: "掷两个骰子相乘，偶数双双得分，奇数单单得分。每一局谁更可能得分？还是这个游戏很公平？",
  },
  answer: { type: "CHOICE", correctId: "xiaoming" },
  hints: [
    { en: "Half the numbers on a die are even and half are odd, but that doesn't mean the products split half and half. Press \"Roll 300\" and compare the \"even\" and \"odd\" bars.", zh: "骰子上一半是偶数一半是奇数，可这不代表乘积也一半一半。按「掷 300 次」，比一比「偶数」和「奇数」两根柱子。" },
    { en: "Work out some products: 2 × 3, 4 × 5, 3 × 5, 6 × 1. When does a product come out odd?", zh: "算几个乘积：2 × 3、4 × 5、3 × 5、6 × 1。什么时候乘积会是奇数？" },
    { en: "A product is odd only when BOTH dice are odd. Each die is odd 3 ways out of 6. How many of the 36 rolls have two odd dice?", zh: "只有两个骰子都是奇数，乘积才是奇数。每个骰子有 3 种奇数。36 种结果里，有多少种两个都是奇数？" },
  ],
  wrongAnswers: [
    {
      match: "choice:same",
      feedback: {
        en: "Half the faces are odd and half are even, so it feels fair. But one even die is enough to make the whole product even. Odd needs both dice to be odd.",
        zh: "骰子上奇数偶数各一半，所以感觉很公平。可是只要有一个骰子是偶数，乘积就是偶数。奇数得两个骰子都是奇数才行。",
      },
    },
    {
      match: "choice:xiaohong",
      feedback: {
        en: "There are plenty of odd numbers on a die, so this is a fair guess. But for an odd product, both dice have to be odd at the same time, and that only happens 9 times out of 36.",
        zh: "骰子上奇数不少，这样猜也有道理。可是乘积要是奇数，两个骰子得同时是奇数，36 种结果里只有 9 种。",
      },
    },
  ],
  explanation: {
    en: "There are 36 equally likely rolls. The product is odd only when both dice are odd, which is 3 × 3 = 9 rolls. The other 36 − 9 = 27 rolls have at least one even die, so their product is even. On average Evan wins 27 rounds out of 36, three times as many as Otto.",
    zh: "两个骰子一共有 36 种同样可能的结果。只有两个都是奇数，乘积才是奇数：3 × 3 = 9 种。剩下 36 − 9 = 27 种至少有一个偶数，乘积就是偶数。平均 36 局里双双赢 27 局，是单单的 3 倍。",
  },
  aha: {
    en: "In multiplication, even is like a drop of ink: one even die colours the whole product even. Odd only survives when both dice are odd, just 1 time in 4.",
    zh: "在乘法里，偶数就像一滴墨水：只要有一个骰子是偶数，整个乘积就被「染」成偶数。奇数要两个骰子都是奇数才能活下来，只有四分之一的机会。",
  },
  extension: {
    en: "What if the game used the sum instead of the product: is that fair? And can you change the points in the product game so that it becomes fair?",
    zh: "如果改成把点数相加呢？公平吗？你能改一改相乘游戏的得分规则，让它变公平吗？",
  },
  discussionPrompt: {
    en: "Invent a dice game that looks unfair but is actually fair. Post the rules and let others check it.",
    zh: "设计一个看起来不公平、其实很公平的骰子游戏。把规则贴出来，让大家来验证。",
  },
  solutionTags: ["simulate", "table", "pattern"],
  funFact: {
    en: "The more dice you multiply, the more even wins: with three dice, the product is even 7 times out of 8.",
    zh: "骰子越多，偶数赢得越多：三个骰子相乘，8 次里有 7 次是偶数。",
  },
  sortOrder: 6,
  rubricNotes:
    "18/20 — hook 2, guess 2, hands-on 2, aha 2, floor 2, ceiling 1, paths 2, wrong 2, hints 2, retell 1: the 'make it fair' extension is good but stays small; simulate, 6 × 6 table and the parity argument are all real paths",
};

/**
 * C8. Geometric distribution, mean 1/p = 6. The scene's seed lands the 300-round average near 6.
 * In this scene "Roll 300" plays 300 ROUNDS, the counter is "average", and the chart stops at "16+";
 * P(16 or more throws) = (5/6)^15 ≈ 6.5%, about 1 round in 15. Extension answer: two sixes in a row
 * take 42 throws on average.
 */
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
  // seed 16: the average after the first 300 rounds is 5.97.
  scene: { type: "dice_lab", mode: "until_target", dice: 1, target: 6, rolls: 300, seed: 16 },
  prompt: {
    en: "Roll one fair die again and again until you get a six, and count the rolls, including the six. If you play many rounds like this, what is the average number of rolls per round?",
    zh: "拿一个公平的骰子一直掷，直到掷出 6 为止，数一数用了几次（掷出 6 的那次也算）。这样玩很多轮，平均每轮要掷几次？",
  },
  answer: { type: "ESTIMATE", min: 5.5, max: 6.5, truth: 6, unit: { en: "rolls", zh: "次" } },
  hints: [
    { en: "Press \"Roll 1\" a few times: each press plays one whole round, and the scene tells you how many throws it took. Then press \"Roll 300\" and watch the \"average\" counter.", zh: "先按几次「掷 1 次」：每按一次就玩完一整轮，场景会告诉你这一轮掷了几次。然后按「掷 300 次」，看「平均」那个数。" },
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
        en: "Maybe you thought 'half of 6'. It's true that about half the time you get a six within 4 rolls. But some rounds take 16 rolls or more, and those long waits pull the average up.",
        zh: "你可能想的是「6 的一半」。确实，大约一半的时候 4 次以内就能掷到 6。可是有些轮要等 16 次甚至更久，这些长长的等待把平均数拉高了。",
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
        en: "A bit low. Long waits happen more often than you'd think, and they count in the average too. Press \"Roll 300\" and look at the \"16+\" bar.",
        zh: "有点少。很长的等待比你想的更常见，它们也要算进平均数。按「掷 300 次」，看看「16+」那根柱子。",
      },
    },
    {
      match: "gt:correct",
      feedback: {
        en: "A bit high. Long waits do happen, but most rounds end sooner. Press \"Roll 300\" a few times and watch where the \"average\" settles.",
        zh: "有点多。确实会有很长的等待，但大多数轮结束得更早。多按几次「掷 300 次」，看「平均」停在哪里。",
      },
    },
  ],
  explanation: {
    en: "Each roll is a six with chance 1/6, so in a long run of rolls about one in every six is a six. Those sixes split the rolls into rounds: 600 rolls hold about 100 sixes, and 600 ÷ 100 = 6 rolls a round. The scene's average settles close to 6 after a few hundred rounds.",
    zh: "每一次掷出 6 的机会是六分之一，所以掷很多很多次的时候，大约每 6 次里有 1 个 6。这些 6 把所有的掷骰分成一轮一轮：600 次里大约有 100 个 6，600 ÷ 100 = 6，平均每轮 6 次。场景里玩几百轮以后，平均数会停在 6 附近。",
  },
  aha: {
    en: "The average wait is 6, yet about half the time you're done within 4 rolls. The rare long waits, 16 rolls or more about 1 round in 15, drag the average up.",
    zh: "平均要等 6 次，可是大约一半的时候 4 次以内就掷到了。少数特别长的等待（大约每 15 轮就有 1 轮要 16 次以上）把平均数拉高了。",
  },
  extension: {
    en: "What if you keep rolling until you get two sixes in a row? Guess first: is the average wait 12 rolls, or much longer?",
    zh: "如果要一直掷到连续两次 6 呢？先猜：平均要等 12 次，还是久得多？",
  },
  discussionPrompt: {
    en: "After 300 rounds, how tall is the \"16+\" bar in your chart, compared with the \"1\" bar? Did long waits happen more or less often than you expected?",
    zh: "玩了 300 轮以后，图里「16+」那根柱子和「1」那根比，有多高？很长的等待，比你想的多还是少？",
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
  title: { en: "Born on Your Birthday", zh: "和你同一天生日的人" },
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
    { en: "Keep multiplying by 364/365 until the result falls below one half. Use a calculator, or move the \"other people besides you\" slider and simulate each room size.", zh: "一直乘 364/365，直到结果小于一半。可以用计算器，也可以拖动「除你以外的人数」滑块，每个人数都模拟一次。" },
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
        en: "Too many. By then a match with you is already more likely than not. Slide to fewer people in the scene and simulate again.",
        zh: "多了。到那时，有人和你同一天已经比没有更可能了。在场景里把人数拖少一点，再模拟一次。",
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

/** C4. The guess is the question: the CHOICE answer reuses the guess options (as monty-hall). */
export const coinStreak: HeroQuestionBlueprint = {
  slug: "coin-streak",
  collection: "chance-and-luck",
  kind: "PARADOX",
  ageGroup: "AGE_10_12",
  difficulty: "EASY",
  category: "PROBABILITY",
  title: { en: "Ten Heads in a Row", zh: "连续十次正面之后" },
  hook: {
    en: "You flip a fair coin and it lands heads, again and again, until you've had ten heads in a row! One friend says tails is 'due' now; another says the coin is 'on a hot streak'. Who is right about the next flip?",
    zh: "你掷一枚公平的硬币：正面，正面，又是正面……一直连续十次正面！一个朋友说下次该轮到反面了，另一个说它手气正旺，还会是正面。下一次到底谁说得对？",
  },
  guess: {
    type: "choice",
    options: [
      { id: "tails", en: "Tails is more likely: it's due", zh: "反面更可能，该轮到它了" },
      { id: "heads", en: "Heads is more likely: it's on a streak", zh: "正面更可能，它手气正旺" },
      { id: "same", en: "Heads and tails are equally likely", zh: "正面反面一样可能" },
    ],
  },
  scene: { type: "coin_flips", streak: 10, seed: 1024 },
  prompt: {
    en: "A fair coin has just landed heads 10 times in a row. On the 11th flip, is heads more likely, tails more likely, or are they equally likely?",
    zh: "一枚公平的硬币刚刚连续 10 次正面朝上。第 11 次，是正面更可能、反面更可能，还是一样可能？",
  },
  answer: { type: "CHOICE", correctId: "same" },
  hints: [
    { en: "Think about the coin itself. Does it have a memory? Can it 'know' what it did the last ten times?", zh: "想想硬币本身。它有记忆吗？它能「知道」自己前十次是什么吗？" },
    { en: "In the scene, press \"⏩ Until 10 heads\", then \"Flip\" once to see what comes right after the streak.", zh: "在场景里按「⏩ 掷到连续 10 个正面」，再按一次「掷一次」，看看紧接着的那一次是什么。" },
    { en: "Now press \"10 more streaks\" a few times and watch the \"flip after 10×H\" bar. After many streaks, what are the heads and tails counts getting close to?", zh: "再多按几次「再找 10 次」，看「10 连正之后」那根条。出现过很多次连正以后，紧接着的正面和反面各有几次？越来越接近什么？" },
  ],
  wrongAnswers: [
    {
      match: "choice:tails",
      feedback: {
        en: "Lots of grown-ups think this too! It feels like the coin owes us some tails to even things out. But the coin has no memory: every flip is a fresh 50-50, whatever happened before.",
        zh: "很多大人也这么想！感觉硬币「欠」我们几次反面，要扯平。可是硬币没有记忆：不管之前发生了什么，每一次都是全新的一半对一半。",
      },
    },
    {
      match: "choice:heads",
      feedback: {
        en: "A streak can make a coin feel 'hot'. But a fair coin has no luck to build up or run out of. Ten heads is rare, yet the next flip doesn't know it happened.",
        zh: "连胜会让人觉得硬币「手气旺」。可是公平的硬币没有运气可以攒，也没有运气会用完。十连正面很少见，但下一次根本不知道它发生过。",
      },
    },
  ],
  explanation: {
    en: "A fair coin has the same chance of heads and tails on every flip, and nothing it did before can change that. Ten heads in a row is rare, about 1 time in 1,024, but it has already happened. The 11th flip is a brand-new flip, so heads and tails are still equally likely.",
    zh: "公平的硬币每一次掷出正面和反面的机会都一样，之前发生了什么都改变不了。连续十次正面很少见，大约 1,024 次里才有 1 次，可它已经发生了。第 11 次是全新的一次，所以正面和反面还是一样可能。",
  },
  aha: {
    en: "The coin has no memory. Ten heads in a row is rare, but once it has happened, the next flip is still just 50-50.",
    zh: "硬币没有记忆。十连正面很少见，可一旦已经发生，下一次还是一半对一半。",
  },
  extension: {
    en: "In four flips, which is more likely: heads, heads, heads, heads, or heads, tails, heads, heads? And a harder one: on average, do you wait longer for two heads in a row, or for a heads followed by a tails?",
    zh: "掷四次，哪个更可能：「正正正正」，还是「正反正正」？再难一点：平均来说，等到「连续两个正面」和等到「一个正面后面跟一个反面」，哪个要等得更久？",
  },
  discussionPrompt: {
    en: "Have you ever heard someone in a game say 'I'm due for a win'? Use what you saw in the scene to explain to them why chance doesn't work like that.",
    zh: "你有没有在游戏里听人说过「下一把该轮到我赢了」？用你在场景里看到的结果，跟他解释为什么运气不是这样的。",
  },
  solutionTags: ["simulate", "table"],
  funFact: {
    en: "Real coins aren't quite perfect: a study of more than 350,000 flips found that a coin lands on the side it started on about 51% of the time.",
    zh: "真实的硬币并不完美：一项掷了 35 万多次的研究发现，硬币落下时朝上的一面和抛起前一样的机会大约是 51%。",
  },
  sortOrder: 4,
  rubricNotes:
    "18/20 — hook 2, guess 2, hands-on 2, aha 2, floor 2, ceiling 2, paths 1, wrong 2, hints 2, retell 1: simulation is the only path at this age; the new extension (HHHH vs HTHH are equally likely; HH takes 6 flips on average, HT only 4) opens real probability",
};

/** C5. Pigeonhole: colours + 1 = 4. The scene proposes "4" from worst-luck mode. */
export const socksInTheDark: HeroQuestionBlueprint = {
  slug: "socks-in-the-dark",
  collection: "chance-and-luck",
  kind: "PUZZLE",
  ageGroup: "AGE_8_10",
  difficulty: "EASY",
  category: "LOGIC",
  title: { en: "Socks in the Dark", zh: "黑暗中摸袜子" },
  hook: {
    en: "Your sock drawer is full of red, blue and green socks, all mixed up, and suddenly the lights go out! You need two socks of the same colour, but you can't see a thing. How many should you grab to be sure?",
    zh: "你的袜子抽屉里塞满了红、蓝、绿三种颜色的袜子，全混在一起，突然停电了！你需要两只同色的袜子，可是什么都看不见。拿几只才能保证一定配成一双？",
  },
  guess: {
    type: "slider",
    min: 2,
    max: 10,
    step: 1,
    unit: { en: "socks", zh: "只" },
  },
  scene: { type: "sock_drawer", colors: 3, seed: 4 },
  prompt: {
    en: "A drawer holds lots of socks in three colours. In the dark, what is the smallest number of socks you must take to be sure you have two of the same colour?",
    zh: "抽屉里有很多三种颜色的袜子。在黑暗中，最少要拿几只，才能保证一定有两只同色的？",
  },
  answer: { type: "NUMERIC", value: 4 },
  hints: [
    { en: "Don't think about good luck. Think about the WORST luck. How could your socks keep refusing to match?", zh: "别想运气好的时候，想想运气最差的时候。你拿的袜子怎样才能一直配不成对？" },
    { en: "Turn on \"😈 Worst luck\" in the scene and press \"Pull a sock\". After 3 socks, what is the unluckiest thing you could be holding?", zh: "在场景里打开「😈 最倒霉模式」，再按「摸一只」。拿了 3 只以后，手里最倒霉会是什么样？" },
    { en: "The unluckiest 3 socks are one red, one blue and one green. Now take one more. What colour can it be, and does it match?", zh: "最倒霉的 3 只是一红、一蓝、一绿。再拿一只，它会是什么颜色？能配上吗？" },
  ],
  wrongAnswers: [
    {
      match: "2",
      feedback: {
        en: "With good luck, 2 socks might match! But the question says 'be sure'. Your 2 socks could be one red and one blue.",
        zh: "运气好的话，2 只可能就配上了！可是题目说要「保证」。你拿的 2 只可能一红一蓝。",
      },
    },
    {
      match: "3",
      feedback: {
        en: "3 is the number of colours. With the worst luck, your 3 socks are one of each colour, and nothing matches yet.",
        zh: "3 是颜色的数量。运气最差的时候，3 只正好每种颜色各一只，还没有配成对。",
      },
    },
    {
      match: "6",
      feedback: {
        en: "6 socks would work, but you can do it with fewer. Think about the worst luck: after 3 socks you hold one of each colour. What does the next sock do?",
        zh: "6 只当然够了，但可以更少。想想最倒霉的情况：拿 3 只时每种颜色各一只。再拿一只会怎样？",
      },
    },
    {
      match: "gt:correct",
      feedback: {
        en: "That's enough socks, but not the fewest. Turn on \"😈 Worst luck\" in the scene and stop the moment a pair is guaranteed.",
        zh: "这么多肯定够，但不是最少的。在场景里试试「最倒霉模式」，一保证有一双就停下。",
      },
    },
    {
      match: "lt:correct",
      feedback: {
        en: "One sock on its own can never make a pair! You need at least two, and with bad luck, more.",
        zh: "一只袜子自己可配不成一双！至少要两只，运气不好的话还要更多。",
      },
    },
  ],
  explanation: {
    en: "Imagine the worst luck: your first three socks are one red, one blue and one green. The fourth sock has to be red, blue or green, so it matches one you already hold. With fewer than 4 you could still be unlucky, so 4 is the smallest number that is sure to work.",
    zh: "想象最倒霉的情况：前三只正好是一红、一蓝、一绿。第四只只能是红、蓝、绿中的一种，所以一定能和手里的一只配上。少于 4 只的话，还是可能倒霉配不上，所以 4 是保证成功的最少只数。",
  },
  aha: {
    en: "Think about the worst luck, not the best: one sock of each colour, and then the next one has to match. Mathematicians call this the pigeonhole principle.",
    zh: "要想最倒霉的情况，而不是最走运的：每种颜色各一只，下一只就一定能配上。数学家把这叫做「鸽巢原理」。",
  },
  extension: {
    en: "How many socks do you need to be sure of TWO matching pairs? And what if the drawer had five colours?",
    zh: "要保证有两双同色的袜子，最少拿几只？如果抽屉里有五种颜色呢？",
  },
  discussionPrompt: {
    en: "How many people must be in a room to be sure that two of them were born in the same month? Explain it with the worst luck, like the socks.",
    zh: "一个房间里至少要有几个人，才能保证有两个人在同一个月出生？像袜子那样，用最倒霉的情况来解释。",
  },
  solutionTags: ["guess_check", "simulate", "draw"],
  funFact: {
    en: "The same idea proves that in a city of a million people, at least two have exactly the same number of hairs on their heads, because nobody has anywhere near a million hairs.",
    zh: "同样的道理可以证明：一座有一百万人的城市里，一定有两个人的头发根数一模一样，因为没有人的头发多到一百万根。",
  },
  sortOrder: 5,
  rubricNotes:
    "18/20 — hook 2, guess 2, hands-on 2, aha 2, floor 2, ceiling 2, paths 1, wrong 2, hints 2, retell 1: worst-case thinking is the one real path (the scene's worst-luck mode shows it); the extension and discussion lead to the general pigeonhole rule",
};

/**
 * C7. pi_darts has no seed on purpose: every child gets a different rain, and the scene proposes
 * its own estimate (toFixed(2)) the first time it has 1,000 dots. At 1,000 dots one standard
 * deviation is about 0.05, so 3.0-3.3 holds roughly 99.5% of runs. The guess is a CHOICE (not a
 * 0-1000 slider) because the reveal histogram marks a slider guess with the answer's truth (3.14).
 * Precision: the error shrinks like 1/√N, so 10× smaller wobble needs 100× the drops
 * (1,000 drops ≈ ±0.05; 100,000 ≈ ±0.005); about a million drops make 3.14 a safe bet.
 */
export const piFromRaindrops: HeroQuestionBlueprint = {
  slug: "pi-from-raindrops",
  collection: "chance-and-luck",
  kind: "ESTIMATION",
  ageGroup: "AGE_12_14",
  difficulty: "MEDIUM",
  category: "PROBABILITY",
  title: { en: "Finding π With Raindrops", zh: "用雨点算出 π" },
  hook: {
    en: "Draw a square and fit the biggest circle you can inside it. Now let a thousand raindrops fall on the square, landing completely at random. About how many of them land inside the circle, and could they tell you something secret about circles?",
    zh: "画一个正方形，在里面画一个尽可能大的圆。让一千个雨点完全随机地落在正方形上。大约有多少个会落在圆里？它们能不能告诉你一个关于圆的秘密？",
  },
  guess: {
    type: "choice",
    options: [
      { id: "500", en: "About 500: half of them", zh: "大约 500 个：一半" },
      { id: "650", en: "About 650", zh: "大约 650 个" },
      { id: "800", en: "About 800", zh: "大约 800 个" },
      { id: "950", en: "About 950: nearly all of them", zh: "大约 950 个：几乎全部" },
    ],
  },
  scene: { type: "pi_darts", maxDrops: 5000 },
  prompt: {
    en: "Drop at least 1,000 dots in the scene. It works out 4 × (dots inside the circle) ÷ (all the dots) for you. What does your estimate come to, rounded to two decimal places?",
    zh: "在场景里撒至少 1,000 个点。场景会帮你算出：4 × 圆里的点数 ÷ 全部点数。你的估计值是多少？保留两位小数。",
  },
  answer: { type: "ESTIMATE", min: 3.0, max: 3.3, truth: 3.14 },
  hints: [
    { en: "Press \"+1,000\". What matters isn't the number of dots but the SHARE that lands inside the circle. Which takes up more of the square: the circle, or the four corners?", zh: "按「+1,000」。关键不是点有多少，而是落在圆里的点占了多少。圆和四个角，哪个占正方形更多？" },
    { en: "If the circle's radius is r, the square's side is 2r. So the square's area is 4r², and the circle's area is πr².", zh: "如果圆的半径是 r，正方形的边长就是 2r。所以正方形的面积是 4r²，圆的面积是 πr²。" },
    { en: "Random dots land in each part in proportion to its area, so the share inside is about πr² ÷ 4r² = π/4. That's why the scene multiplies the share by 4.", zh: "随机的点落在哪一块的多少和面积成比例，所以圆里的比例大约是 πr² ÷ 4r² = π/4。这就是场景要把比例乘 4 的原因。" },
  ],
  wrongAnswers: [
    {
      match: "gt:500",
      feedback: {
        en: "That looks like the number of dots inside the circle. Divide it by the total number of dots, then multiply by 4.",
        zh: "这看起来是圆里的点数。把它除以全部点数，再乘 4。",
      },
    },
    {
      match: "gt:50",
      feedback: {
        en: "Is that a percentage? About 78% of the dots land inside. Turn it into a share (0.78), then multiply by 4.",
        zh: "这是百分比吗？大约 78% 的点落在圆里。把它变成比例（0.78），再乘 4。",
      },
    },
    {
      match: "lt:1",
      feedback: {
        en: "That's the share of dots inside the circle, about 0.78. You're one step away: multiply it by 4.",
        zh: "这是圆里的点所占的比例，大约 0.78。还差一步：乘 4。",
      },
    },
    {
      match: "gt:3.3",
      feedback: {
        en: "Too high. Check that you divided by ALL the dots, not only the ones outside the circle. With more dots the answer settles near 3.14.",
        zh: "太高了。检查一下，你除的是全部点数，而不只是圆外的点吗？点越多，结果越稳定在 3.14 附近。",
      },
    },
    {
      match: "lt:3",
      feedback: {
        en: "A bit low. Random dots wobble, especially when there are few of them. Drop a few thousand and watch where the estimate settles.",
        zh: "有点低。随机的点会有起伏，点少的时候更明显。撒几千个点，看估计值停在哪里。",
      },
    },
  ],
  explanation: {
    en: "The circle's area is πr² and the square's is 4r², so the circle covers π/4 of the square, about 0.785: roughly 785 of 1,000 drops land inside. Four times that share is about 3.14, which is π. With 1,000 dots your answer usually lands between 3.0 and 3.3, and more dots bring it closer.",
    zh: "圆的面积是 πr²，正方形是 4r²，所以圆占正方形的 π/4，大约 0.785：1,000 个雨点里大约有 785 个落在圆里。这个比例乘 4，大约是 3.14，也就是 π。撒 1,000 个点时，结果通常在 3.0 到 3.3 之间，点越多越接近。",
  },
  aha: {
    en: "Pure randomness can find an exact number: the circle covers π/4 of the square, so the raindrops spell out π. It's slow, though: for one more correct digit you need about a hundred times as many drops.",
    zh: "纯粹的随机也能算出一个精确的数：圆占正方形的 π/4，所以雨点拼出了 π。只是很慢：想多算对一位小数，雨点大约要多一百倍。",
  },
  extension: {
    en: "With 1,000 drops, the estimate wobbles by about 0.05. Guess: how many drops would make the wobble ten times smaller? Then compare 1,000 and 5,000 drops in the scene.",
    zh: "撒 1,000 个点时，估计值大约会上下晃 0.05。猜一猜：要撒多少个点，晃动才会小十倍？再在场景里比一比 1,000 个和 5,000 个点。",
  },
  discussionPrompt: {
    en: "What estimate of π did you get, and with how many dots? Why do different people get different answers from the same rule?",
    zh: "你算出的 π 是多少？用了多少个点？为什么同一个办法，每个人的结果都不一样？",
  },
  solutionTags: ["simulate", "algebra", "draw"],
  funFact: {
    en: "π never ends and never repeats. Computers have worked out more than 100 trillion of its digits.",
    zh: "π 的小数永远写不完，也从不重复。计算机已经算出了它的 100 多万亿位。",
  },
  sortOrder: 7,
  rubricNotes:
    "17/20 — hook 2, guess 2, hands-on 2, aha 2, floor 1, ceiling 2, paths 1, wrong 2, hints 2, retell 1: needs the area of a circle; simulation plus the area ratio is one path; the scene does the 4 × share sum, so the work is understanding why; the estimate varies run to run (window 3.0-3.3 is about 3 standard deviations at 1,000 dots)",
};

/**
 * C10. Illustration until the T3 `sequence_lineup` scene lands (待替换为 sequence_lineup). The guess is the
 * question; the four rows are baked into the prompt and the picture. Checked by script:
 *   A HTHHTHTTHTHTHHTHTTHT  10 heads, 15 switches, longest run 2
 *   B THTHHTTHTHTHHTHTTHTH  10 heads, 15 switches, longest run 2
 *   C HTTHHHHHTHTTHTHHTTTH  11 heads, 10 switches, longest run 5 (real)
 *   D HHTHTTHTHTHHTTHTHTTH  10 heads, 14 switches, longest run 2
 * Exact for 20 fair flips: P(run ≥ 3) ≈ 97.9%, P(run ≥ 4) ≈ 76.8%, P(run ≥ 5) ≈ 45.8%.
 */
export const spotTheRealRandom: HeroQuestionBlueprint = {
  slug: "spot-the-real-random",
  collection: "chance-and-luck",
  kind: "WODB",
  ageGroup: "AGE_10_12",
  difficulty: "MEDIUM",
  category: "PROBABILITY",
  title: { en: "Which Coin Was Real?", zh: "哪一串是真随机" },
  hook: {
    en: "Three friends were asked to make up twenty coin flips that look random, and a fourth friend really flipped a coin twenty times. Their four rows of heads and tails are in the picture. Can you spot the one that came from a real coin?",
    zh: "三个朋友被要求编出看起来很随机的 20 次掷硬币记录，第四个朋友真的掷了 20 次硬币。四串正面和反面就在图里。你能找出哪一串是真掷出来的吗？",
  },
  guess: {
    type: "choice",
    options: [
      { id: "A", en: "Row A", zh: "A 串" },
      { id: "B", en: "Row B", zh: "B 串" },
      { id: "C", en: "Row C", zh: "C 串" },
      { id: "D", en: "Row D", zh: "D 串" },
    ],
  },
  scene: {
    type: "illustration",
    asset: "spot-the-real-random",
    caption: { en: "Four rows of twenty flips, A to D. Gold coins are heads, silver coins are tails.", zh: "四串各 20 次的掷硬币记录，A 到 D。金色是正面，银色是反面。" },
    revealAsset: "spot-the-real-random-reveal",
    revealCaption: {
      en: "Row C is the real one: it has five heads in a row. The made-up rows never repeat a face more than twice, and a real coin almost always does.",
      zh: "C 串是真的：它有连续 5 个正面。编出来的三串，同一面从来没有连续超过 2 次，而真硬币几乎总会超过。",
    },
  },
  prompt: {
    en: "Gold is heads (H) and silver is tails (T). A: H T H H T H T T H T H T H H T H T T H T. B: T H T H H T T H T H T H H T H T T H T H. C: H T T H H H H H T H T T H T H H T T T H. D: H H T H T T H T H T H H T T H T H T T H. Which row came from a real coin?",
    zh: "金色是正面（正），银色是反面（反）。A：正反正正反正反反正反正反正正反正反反正反。B：反正反正正反反正反正反正正反正反反正反正。C：正反反正正正正正反正反反正反正正反反反正。D：正正反正反反正反正反正正反反正反正反反正。哪一串是真掷出来的？",
  },
  answer: { type: "CHOICE", correctId: "C" },
  hints: [
    { en: "Real randomness isn't tidy. In each row of the picture, find the longest stretch of the same colour in a row.", zh: "真正的随机并不整齐。在图里的每一串中，找出同一种颜色连在一起最长的那一段。" },
    { en: "Count how many times row A changes colour: there are 19 chances, one between each pair of neighbours. A real coin changes about half the time, so roughly 9 or 10 times. How do the four rows compare?", zh: "数一数 A 串换了几次颜色：相邻两枚之间各有一次机会，一共 19 次。真硬币大约一半时候会换，也就是 9 到 10 次左右。四串比一比怎么样？" },
    { en: "In 20 real flips, the chance of at least four of the same face in a row is about 77%, and the chance that no face ever shows up three times running is only about 2%. Which row has a long run?", zh: "真掷 20 次，至少出现连续 4 个同一面的机会大约是 77%，而同一面从来不连续出现 3 次的机会只有 2% 左右。哪一串有长长的连串？" },
  ],
  wrongAnswers: [
    {
      match: "choice:A",
      feedback: {
        en: "Row A looks nicely mixed, and that's the giveaway: it changes face 15 times out of 19 and never shows the same face three times running. A real coin is lumpier than that.",
        zh: "A 串看起来混得很匀，这恰恰露了馅：19 次机会里换了 15 次面，同一面从来没有连续出现 3 次。真硬币要「扎堆」得多。",
      },
    },
    {
      match: "choice:B",
      feedback: {
        en: "Row B feels random because heads and tails come out exactly 10 and 10 and keep taking turns. Real coins are rarely that polite: B changes face 15 times, where a real coin changes about 9 or 10 times.",
        zh: "B 串让人觉得随机，因为正反面正好各 10 个，还总是轮流出现。真硬币很少这么「讲礼貌」：B 换了 15 次面，真硬币一般只换 9 到 10 次。",
      },
    },
    {
      match: "choice:D",
      feedback: {
        en: "Row D has a few pairs, which looks clever, but it never has three of the same in a row. In 20 real flips, a run of three or more happens about 98 times out of 100.",
        zh: "D 串有几对重复，看起来编得很聪明，可是从来没有连续 3 个一样的。真掷 20 次，大约 100 次里有 98 次会出现连续 3 个或更多。",
      },
    },
  ],
  explanation: {
    en: "People who fake randomness avoid streaks, because five heads in a row feels too neat to be chance. But a real coin makes runs all the time: in 20 flips there's about a 77% chance of four in a row and about a 46% chance of five, while a row with no run longer than two turns up only about 2% of the time. Rows A, B and D never repeat a face more than twice and change face 14 or 15 times; row C changes 10 times and has five heads in a row. So C is the real one.",
    zh: "编随机数的人会躲着连串走，因为连续 5 个正面看起来太整齐，不像是碰巧。可真硬币常常出现连串：掷 20 次，出现连续 4 个的机会约 77%，连续 5 个约 46%，而最长连串不超过 2 的情况只有约 2%。A、B、D 三串同一面从不连续超过 2 次，还换了 14 或 15 次面；C 串只换了 10 次面，还有连续 5 个正面。所以 C 是真的。",
  },
  aha: {
    en: "Real randomness is lumpier than people expect: streaks are normal, and perfect mixing is the fake. That's how you can catch someone who made up their coin flips.",
    zh: "真正的随机比人们想象的更「扎堆」：连串很正常，混得太匀才是假的。靠这一点，你就能揭穿编造掷硬币记录的人。",
  },
  extension: {
    en: "Flip a real coin 20 times and write it down, and ask a friend to make up 20 flips without a coin. Can you tell which is which? How likely is a run of at least four in 20 real flips?",
    zh: "真掷 20 次硬币并记下来，再请朋友不用硬币编 20 次。你能分出哪个是真的吗？真掷 20 次，出现至少连续 4 个同一面的可能性有多大？",
  },
  discussionPrompt: {
    en: "Which clue convinced you: the long run, the number of changes, or the exact 10-and-10 balance? Get a friend to fake 20 flips and see whether your clue catches them.",
    zh: "是哪条线索说服了你：长长的连串、换面的次数，还是正好 10 比 10？请朋友编 20 次，看看你的线索能不能抓住他。",
  },
  solutionTags: ["pattern", "simulate", "table"],
  funFact: {
    en: "Some teachers play this as a magic trick: half the class flips real coins, half makes up their flips, and the teacher spots the fakes in seconds just by looking for long runs.",
    zh: "有些老师把这当成魔术来玩：一半同学真掷硬币，一半同学自己编，老师只要找长长的连串，几秒钟就能认出哪些是编的。",
  },
  sortOrder: 10,
  rubricNotes:
    "18/20 — hook 2, guess 2, hands-on 1, aha 2, floor 2, ceiling 1, paths 2, wrong 2, hints 2, retell 2: illustration only (待替换为 sequence_lineup); longest runs, counting changes of face and flipping a real coin are real paths; the run probabilities behind the extension are beyond most 10-12s, which holds the ceiling back; a trick kids can play on friends",
};

export const CHANCE_AND_LUCK: readonly HeroQuestionBlueprint[] = [
  birthdayParadox,
  montyHall,
  twoDiceSum,
  coinStreak,
  socksInTheDark,
  oddEvenGame,
  piFromRaindrops,
  rollsUntilSix,
  someoneSharesMyBirthday,
  spotTheRealRandom,
];
