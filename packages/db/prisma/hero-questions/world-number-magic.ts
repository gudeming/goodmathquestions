/**
 * World D · Number magic (`number-magic`). Catalog: 02-hero-question-catalog.md §D.
 * Batch 1: D1 trick-1089, D2 mind-reading-five (upgrades a legacy row), D3 scramble-and-nine,
 * D4 kaprekar-6174. All four run on `number_trick_stepper`; the scene schema itself proves
 * each trick on 20 seeded inputs plus edge cases (expectFixedPoint / expectDivisibleBy).
 * TODO(phase-3 batch 2): D5 collatz-hailstone and the rest of §D once collatz_path lands.
 */
import type { GuessConfig, HeroQuestionBlueprint } from "./_template";

/** Act 1 for the fixed-answer tricks: "will everyone land on the same number?" */
const SAME_OR_DIFFERENT_GUESS: GuessConfig = {
  type: "choice",
  options: [
    { id: "same", en: "Everyone ends up with the same number", zh: "每个人最后得到的数都一样" },
    { id: "different", en: "Everyone ends up with a different number", zh: "每个人得到的数都不一样" },
  ],
};

/** D1. */
export const trick1089: HeroQuestionBlueprint = {
  slug: "trick-1089",
  collection: "number-magic",
  kind: "MAGIC_TRICK",
  ageGroup: "AGE_10_12",
  difficulty: "MEDIUM",
  category: "NUMBER_THEORY",
  title: { en: "I Know Your Number", zh: "你心里的数我早就知道" },
  hook: {
    en: "Think of a three-digit number whose first and last digits are at least 2 apart. Reverse it, and subtract the smaller number from the bigger one. Reverse that answer and add the two together. I already know what you got. How can I possibly know?",
    zh: "想一个三位数，第一位和最后一位至少差 2。把它倒过来写，用大数减小数。再把得数倒过来写，和得数相加。我早就知道你得到了多少。我是怎么知道的？",
  },
  guess: SAME_OR_DIFFERENT_GUESS,
  scene: {
    type: "number_trick_stepper",
    input: { digits: 3, constraint: "distinct_ends_diff_ge_2" },
    steps: [
      { op: "abs_diff_reverse", label: { en: "Reverse it. Subtract the smaller from the bigger.", zh: "倒过来写，大数减小数。" } },
      { op: "add_reverse", label: { en: "Reverse the result and add the two.", zh: "把结果倒过来写，两数相加。" } },
    ],
    expectFixedPoint: 1089,
    revealExtra: "nines_table",
  },
  prompt: {
    en: "Do the trick with any three-digit number whose first and last digits are at least 2 apart. What number do you end up with?",
    zh: "用任何一个首尾数字至少差 2 的三位数做一遍。你最后得到的是多少？",
  },
  answer: { type: "NUMERIC", value: 1089 },
  hints: [
    { en: "Try the trick with two different numbers, like 742 and 513. Compare how they end.", zh: "用两个不同的数试试，比如 742 和 513。比一比最后的结果。" },
    { en: "Look at the subtraction step. Write down what you got each time: 495, 198, … What do these numbers have in common?", zh: "看相减那一步。把每次的得数写下来：495、198……这些数有什么共同点？" },
    { en: "Every subtraction answer is in the 99 times table, and its middle digit is always 9. Try adding each one to its reverse.", zh: "相减的得数都在 99 的乘法表里，而且中间一位总是 9。把每一个和它倒过来的数相加试试。" },
  ],
  wrongAnswers: [
    {
      match: "regex:^(198|297|396|495|594|693|792|891)$",
      feedback: {
        en: "That's the answer to the subtraction step, and it's a great one to notice. Keep going: reverse it and add the two numbers.",
        zh: "这是相减那一步的得数，能注意到它很棒。还没完：把它倒过来写，再和它相加。",
      },
    },
    {
      match: "lt:correct",
      feedback: {
        en: "Check the subtraction. When the top's last digit is smaller, you have to borrow, and then the middle digit always becomes 9.",
        zh: "检查一下减法。个位上面的数字比较小时要借位，借完以后，中间一位总是 9。",
      },
    },
    {
      match: "gt:correct",
      feedback: {
        en: "Check which two numbers you added. It's the subtraction answer plus that same answer reversed, not your starting number.",
        zh: "检查一下你加的是哪两个数。要加的是相减的得数和它倒过来的数，不是你一开始想的数。",
      },
    },
  ],
  explanation: {
    en: "Write the number as abc, with a bigger than c. The subtraction always gives 99 × (a − c), so it is one of 198, 297, … 891. Each of those has 9 in the middle and outer digits that add up to 9, so adding it to its reverse always makes 1089.",
    zh: "把数写成 abc，a 比 c 大。相减的结果一定是 99 × (a − c)，也就是 198、297……891 中的一个。这些数中间都是 9，两头的数字加起来也是 9，所以和倒过来的数相加，总是 1089。",
  },
  aha: {
    en: "The subtraction squeezes every starting number into the 99 times table. After that, only one ending is possible: 1089.",
    zh: "相减这一步把所有的数都挤进了 99 的乘法表。之后，结局只剩一个：1089。",
  },
  extension: {
    en: "Try the trick with four-digit numbers. Do you still always get the same answer? Find two starts that end differently and explain why.",
    zh: "换成四位数试试。还是每次都一样吗？找两个结果不同的起点，说说为什么。",
  },
  discussionPrompt: {
    en: "Try this trick on someone at home. What did they say when you told them their number before they did?",
    zh: "回家考考家里人。你抢先说出他的答案时，他是什么反应？",
  },
  solutionTags: ["guess_check", "table", "pattern", "algebra"],
  funFact: {
    en: "Bonus: 1089 × 9 = 9801, which is 1089 backwards. The only other four-digit number that flips like that is 2178, because 2178 × 4 = 8712.",
    zh: "彩蛋：1089 × 9 = 9801，正好是 1089 倒过来。另一个能这样翻过来的四位数只有 2178：2178 × 4 = 8712。",
  },
  sortOrder: 1,
  rubricNotes:
    "18/20 — hook 1, guess 2, hands-on 2, aha 2, floor 2, ceiling 2, paths 1, wrong 2, hints 2, retell 2: the trick needs its digit rules up front, so the hook is number-heavy; paths are try-and-see or algebra",
};

/** D2. Upgrades the legacy DRILL row "Math Mind-Reading Trick" in place. */
export const mindReadingFive: HeroQuestionBlueprint = {
  slug: "mind-reading-five",
  collection: "number-magic",
  kind: "MAGIC_TRICK",
  ageGroup: "AGE_8_10",
  difficulty: "EASY",
  category: "ALGEBRA",
  title: { en: "The Mind Reader", zh: "读心术" },
  hook: {
    en: "Think of a secret number and don't tell anyone. Double it, add 10, cut it in half, then take away the number you first thought of. I can tell you what you have left. How could I possibly know?",
    zh: "心里想一个数，别告诉任何人。把它乘 2，加 10，再除以 2，最后减去你一开始想的数。我知道你剩下多少。我怎么可能知道？",
  },
  guess: SAME_OR_DIFFERENT_GUESS,
  scene: {
    type: "number_trick_stepper",
    input: { min: 1, max: 100 },
    steps: [
      { op: "double", label: { en: "Double it.", zh: "乘 2。" } },
      { op: "add", arg: 10, label: { en: "Add 10.", zh: "加 10。" } },
      { op: "halve", label: { en: "Halve it.", zh: "除以 2。" } },
      { op: "subtract_original", label: { en: "Take away the number you started with.", zh: "减去你最开始想的数。" } },
    ],
    expectFixedPoint: 5,
    revealExtra: "algebra",
  },
  prompt: {
    en: "Pick any number and follow the steps: double it, add 10, halve it, then subtract your starting number. What do you get?",
    zh: "随便想一个数，按步骤做：乘 2，加 10，除以 2，再减去你想的数。你得到多少？",
  },
  answer: { type: "NUMERIC", value: 5 },
  hints: [
    { en: "Don't just wonder about it. Try it with a small number, like 3, and write down every step.", zh: "别光想，用一个小数试试，比如 3，每一步都写下来。" },
    { en: "Now try a different number, like 10. Did you end up in the same place? Which step makes your number disappear?", zh: "再换一个数试试，比如 10。结果一样吗？是哪一步让你的数消失了？" },
    { en: "Doubling and then halving brings you back to your number. But the 10 you added got halved too. What is left after you take your number away?", zh: "先乘 2 再除以 2，又回到了你的数。可是你加的 10 也被除以 2 了。减掉你的数以后，还剩多少？" },
  ],
  wrongAnswers: [
    {
      match: "10",
      feedback: {
        en: "You remembered the 10 you added, but it got cut in half along with everything else.",
        zh: "你记得加了 10，可是它也跟着被除以 2 了。",
      },
    },
    {
      match: "0",
      feedback: {
        en: "You think everything cancels out. Your number does vanish, but the 10 leaves a little bit behind. Check the halving step.",
        zh: "你觉得什么都抵消掉了。你的数确实没了，可是加的 10 还留下了一点。检查一下除以 2 那一步。",
      },
    },
    {
      match: "gt:correct",
      feedback: {
        en: "Did you take away the number you started with? That last step is what makes everyone's answer match.",
        zh: "你减去一开始想的数了吗？就是最后这一步，让每个人的答案都一样。",
      },
    },
    {
      match: "lt:correct",
      feedback: {
        en: "You ended up below 5. Check the halving: half of (your number doubled, plus 10) is your number plus 5.",
        zh: "你算得比 5 还小。检查除以 2 那一步：乘 2 再加 10，除以 2 以后是你的数加 5。",
      },
    },
  ],
  explanation: {
    en: "Call your number n. Doubling gives 2n, adding 10 gives 2n + 10, and halving gives n + 5. Taking away n leaves 5, whatever n was.",
    zh: "把你的数叫作 n。乘 2 得 2n，加 10 得 2n + 10，除以 2 得 n + 5。减去 n，剩下 5，不管 n 是几。",
  },
  aha: {
    en: "Your number gets doubled, halved and then taken away, so none of it is left. Only half of the 10 survives, and that's the 5 I read in your mind.",
    zh: "你的数先翻倍、再减半、最后被减掉，一点都不剩。只剩下 10 的一半，就是我「读」到的 5。",
  },
  extension: {
    en: "What if the trick says add 20 instead of 10? Can you invent a trick where the answer is always 7?",
    zh: "如果把「加 10」改成「加 20」，答案是多少？你能设计一个答案总是 7 的魔术吗？",
  },
  discussionPrompt: {
    en: "Post a trick you invented, but keep the answer secret. Can the next person work out the number everyone will end up with?",
    zh: "把你设计的魔术贴出来，先别说答案。下一个人能算出大家最后都会得到几吗？",
  },
  solutionTags: ["guess_check", "algebra", "pattern", "work_backwards"],
  funFact: {
    en: "Magicians call this a self-working trick: the math does the magic, so it works even when you're nervous.",
    zh: "魔术师把这种魔术叫作「自动魔术」：靠数学变魔术，就算你紧张也不会失手。",
  },
  sortOrder: 2,
  rubricNotes:
    "18/20 — hook 2, guess 2, hands-on 2, aha 2, floor 2, ceiling 1, paths 1, wrong 2, hints 2, retell 2: extension only varies the constant; paths are try-numbers vs algebra",
  upgradesLegacyTitleEn: "Math Mind-Reading Trick",
};

/**
 * D3. 9 always divides the difference, and so does 3 (a factor of 9), so the prompt asks
 * for the BIGGEST option that always works; choosing 3 gets its own feedback.
 */
export const scrambleAndNine: HeroQuestionBlueprint = {
  slug: "scramble-and-nine",
  collection: "number-magic",
  kind: "MAGIC_TRICK",
  ageGroup: "AGE_10_12",
  difficulty: "MEDIUM",
  category: "NUMBER_THEORY",
  title: { en: "Scramble and Subtract", zh: "打乱数字之后" },
  hook: {
    en: "Write down a number with a few digits. Scramble its digits to make a new number, then subtract the smaller one from the bigger one. Whatever you started with, the answer always divides exactly by one special number. Which one?",
    zh: "写一个几位数。把它的数字打乱顺序，变成另一个数，再用大数减小数。不管你一开始写的是什么，结果总能被一个特别的数整除。是哪一个？",
  },
  guess: {
    type: "choice",
    options: [
      { id: "2", en: "2", zh: "2" },
      { id: "3", en: "3", zh: "3" },
      { id: "9", en: "9", zh: "9" },
      { id: "11", en: "11", zh: "11" },
    ],
  },
  scene: {
    type: "number_trick_stepper",
    input: { digits: 4, constraint: "not_all_same" },
    steps: [
      { op: "scramble_minus", label: { en: "Scramble the digits. Subtract the smaller from the bigger.", zh: "打乱数字顺序，大数减小数。" } },
    ],
    expectDivisibleBy: 9,
    revealExtra: "nines_table",
  },
  prompt: {
    en: "Scramble the digits of a number and subtract the smaller from the bigger. Which is the biggest of these numbers that always divides the answer exactly: 2, 3, 9 or 11?",
    zh: "把一个数的数字打乱，大数减小数。下面哪个数最大，而且总能把结果整除：2、3、9 还是 11？",
  },
  answer: { type: "CHOICE", correctId: "9" },
  hints: [
    { en: "Test it. Scramble 52 into 25 and subtract. Then try 731 and 173. What do the answers have in common?", zh: "试一试。把 52 打乱成 25，相减。再试试 731 和 173。这些得数有什么共同点？" },
    { en: "Add up the digits of each answer: 27 gives 2 + 7 = 9, and 558 gives 5 + 5 + 8 = 18. What do you notice?", zh: "把每个得数的各位数字加起来：27 是 2 + 7 = 9，558 是 5 + 5 + 8 = 18。你发现了什么？" },
    { en: "A number and the sum of its digits leave the same remainder when you divide by 9. Scrambling doesn't change the digit sum. So what happens to the remainder when you subtract?", zh: "一个数除以 9 的余数，和它各位数字之和除以 9 的余数一样。打乱顺序不会改变数字之和。那相减以后，余数会怎样？" },
  ],
  wrongAnswers: [
    {
      match: "choice:3",
      feedback: {
        en: "3 really does work every time, good spotting! But a bigger number on the list works every time too. Look at your answers again.",
        zh: "3 确实每次都行，眼光不错！可是选项里还有一个更大的数也每次都行。再看看你的得数。",
      },
    },
    {
      match: "choice:11",
      feedback: {
        en: "11 works for some numbers, like 321 − 123 = 198 = 11 × 18. But 21 − 12 = 9, and 11 doesn't fit that. A rule has to work every time.",
        zh: "11 有时候行，比如 321 − 123 = 198 = 11 × 18。可是 21 − 12 = 9，11 就不行了。规律得每次都成立才算。",
      },
    },
    {
      match: "choice:2",
      feedback: {
        en: "Lots of answers come out even, but not all of them: 21 − 12 = 9 is odd. Try a few more and look for something that never fails.",
        zh: "很多得数是双数，但不是全部：21 − 12 = 9 是单数。多试几个，找一个从来不会失败的。",
      },
    },
  ],
  explanation: {
    en: "A number and its digit sum leave the same remainder when divided by 9. Scrambling keeps the digit sum, so both numbers leave the same remainder. Their difference leaves remainder 0, so it is a multiple of 9. (It's a multiple of 3 as well, but 9 is the biggest on the list.)",
    zh: "一个数除以 9 的余数，和它各位数字之和除以 9 的余数相同。打乱顺序不改变数字之和，所以两个数的余数一样。相减以后余数是 0，也就是 9 的倍数。（它当然也是 3 的倍数，但 9 是选项里最大的。）",
  },
  aha: {
    en: "Scrambling digits never changes their sum, and the digit sum is all that 9 cares about. So the difference always lands in the 9 times table.",
    zh: "打乱数字不会改变它们的和，而 9 只看数字之和。所以差总是落在 9 的乘法表里。",
  },
  extension: {
    en: "Here's a trick to try: tell me every digit of your difference except one, and I'll name the hidden digit. How does that work? When can it fail?",
    zh: "试试这个魔术：把差的各位数字告诉我，只藏起一个，我就能说出你藏的是几。这是怎么做到的？什么时候会失灵？",
  },
  discussionPrompt: {
    en: "Casting out nines is an old way to check multiplication. Try it on 23 × 47 = 1081. Does it agree, and what kind of mistake could it miss?",
    zh: "「弃九法」是检查乘法的老办法。用它检查 23 × 47 = 1081，对得上吗？它会漏掉哪种错误？",
  },
  solutionTags: ["guess_check", "pattern", "algebra"],
  funFact: {
    en: "Long before calculators, bookkeepers used this \"casting out nines\" idea to catch mistakes in long columns of numbers.",
    zh: "在有计算器以前，记账的人就用这个「弃九法」来检查一长串数字有没有算错。",
  },
  sortOrder: 3,
  rubricNotes:
    "18/20 — hook 2, guess 2, hands-on 2, aha 2, floor 2, ceiling 2, paths 1, wrong 2, hints 2, retell 1: proof is digit sums or nothing; the reveal is satisfying but less of a party trick than 1089",
};

/** D4. Leading zeros are kept (999 -> 0999), which is what makes every start reach 6174. */
export const kaprekar6174: HeroQuestionBlueprint = {
  slug: "kaprekar-6174",
  collection: "number-magic",
  kind: "MAGIC_TRICK",
  ageGroup: "AGE_12_14",
  difficulty: "HARD",
  category: "NUMBER_THEORY",
  title: { en: "The Black Hole Number", zh: "黑洞数" },
  hook: {
    en: "Pick a four-digit number, as long as its digits aren't all the same. Arrange its digits from biggest to smallest, then from smallest to biggest, and subtract. Now do the same thing to your answer, again and again. What do you think will happen?",
    zh: "想一个四位数，只要四个数字不全一样就行。把数字从大到小排成一个数，再从小到大排成一个数，大减小。再对得数做同样的事，一遍又一遍。你猜会发生什么？",
  },
  guess: {
    type: "choice",
    options: [
      { id: "zero", en: "It shrinks down to 0", zh: "越变越小，最后变成 0" },
      { id: "stuck", en: "It gets stuck on one number", zh: "停在某一个数上" },
      { id: "forever", en: "It keeps changing forever", zh: "永远变来变去" },
    ],
  },
  scene: {
    type: "number_trick_stepper",
    input: { digits: 4, constraint: "not_all_same" },
    steps: [
      { op: "sort_desc_minus_asc", label: { en: "Biggest order minus smallest order.", zh: "从大到小排减去从小到大排。" } },
    ],
    loopUntilFixed: true,
    maxLoops: 7,
    expectFixedPoint: 6174,
  },
  prompt: {
    en: "Keep repeating the step: digits in biggest-first order minus digits in smallest-first order. Keep zeros, so 999 counts as 0999. When the number stops changing, what number is it?",
    zh: "一直重复这一步：数字从大到小排，减去从小到大排。0 也要算上，999 要写成 0999。数字不再变的时候，它是多少？",
  },
  answer: { type: "NUMERIC", value: 6174 },
  hints: [
    { en: "Just start. Try 3524: biggest-first is 5432 and smallest-first is 2345. Subtract, then do it again with the answer.", zh: "先动手。试试 3524：从大到小是 5432，从小到大是 2345。相减，再对得数做一遍。" },
    { en: "Keep going and write each result in a list. From 3524 you get 3087, then 8352, then… Watch for a number that comes back.", zh: "继续做，把每个结果写成一列。从 3524 开始会得到 3087，然后 8352，然后……注意有没有重复出现的数。" },
    { en: "When the step gives back the very same number, you're stuck there forever. Check it: does sorting that number's digits and subtracting give the number itself?", zh: "如果做完这一步得到的还是同一个数，就会永远停在那里。验证一下：把这个数的数字重新排、相减，是不是又得到它自己？" },
  ],
  wrongAnswers: [
    {
      match: "0",
      feedback: {
        en: "You'd only reach 0 if all four digits were the same, and those numbers aren't allowed. Check your subtraction, and keep any zeros as digits.",
        zh: "只有四个数字全一样才会得到 0，可是这样的数不允许用。检查一下减法，0 也要当成一个数字留着。",
      },
    },
    {
      match: "495",
      feedback: {
        en: "495 is the black hole for three-digit numbers! With four digits, keep the zeros: 999 should be 0999, so the next step is 9990 − 0999.",
        zh: "495 是三位数的黑洞！四位数要把 0 留着：999 要写成 0999，下一步是 9990 − 0999。",
      },
    },
    {
      match: "lt:correct",
      feedback: {
        en: "That number still changes if you do the step again. Try it: sort its digits, subtract, and keep going until nothing changes.",
        zh: "这个数再做一遍还会变。试试：把它的数字排一排，相减，一直做到不再变为止。",
      },
    },
    {
      match: "gt:correct",
      feedback: {
        en: "Not stuck yet: that number changes when you do the step again. Keep going until the answer comes out the same as the number you started the step with.",
        zh: "还没停下来：这个数再做一遍还会变。一直做下去，直到得数和做这一步之前的数一模一样。",
      },
    },
  ],
  explanation: {
    en: "6174 is the only four-digit number the step leaves unchanged: 7641 − 1467 = 6174. Every allowed start falls into it, and never needs more than 7 steps. You can check this in the scene, or by trying a few starts by hand.",
    zh: "6174 是唯一一个做完这一步不变的四位数：7641 − 1467 = 6174。每个符合要求的起点都会掉进去，而且最多只要 7 步。你可以在场景里验证，也可以自己多试几个。",
  },
  aha: {
    en: "Every allowed four-digit number falls into 6174 within 7 steps, like a black hole. Computers have checked every start, but nobody has found a simple reason why it has to be 6174.",
    zh: "所有符合要求的四位数，最多 7 步都会掉进 6174，就像掉进黑洞。电脑检查过每一个起点，可是还没有人找到一个简单的理由，说明为什么偏偏是它。",
  },
  extension: {
    en: "Play the same game with three-digit numbers. Where do they get stuck? And what happens with two-digit numbers?",
    zh: "用三位数玩同样的游戏，它们会停在哪里？两位数又会怎样？",
  },
  discussionPrompt: {
    en: "How many steps did your starting number take? Can anyone find a start that needs all 7 steps?",
    zh: "你的起点用了几步？谁能找到一个正好要 7 步的数？",
  },
  solutionTags: ["guess_check", "table", "pattern", "simulate"],
  funFact: {
    en: "6174 is named after D. R. Kaprekar, a school teacher in India who found it in 1949 while playing with numbers for fun.",
    zh: "6174 以印度的一位中学老师卡普雷卡尔命名。1949 年，他在玩数字游戏时发现了它。",
  },
  sortOrder: 4,
  rubricNotes:
    "18/20 — hook 2, guess 2, hands-on 2, aha 2, floor 2, ceiling 2, paths 1, wrong 1, hints 2, retell 2: wrong-answer rules beyond 0 and 495 are generic 'keep going' nudges; the only real path is iterate-and-list",
};

export const NUMBER_MAGIC: readonly HeroQuestionBlueprint[] = [trick1089, mindReadingFive, scrambleAndNine, kaprekar6174];
