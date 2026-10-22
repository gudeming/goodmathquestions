/**
 * World D · Number magic (`number-magic`). Catalog: 02-hero-question-catalog.md §D.
 * Batch 1: D1 trick-1089, D2 mind-reading-five (upgrades a legacy row), D3 scramble-and-nine,
 * D4 kaprekar-6174. All four run on `number_trick_stepper`; the scene schema itself proves
 * each trick on 20 seeded inputs plus edge cases (expectFixedPoint / expectDivisibleBy).
 * Batch 3: D5 collatz-hailstone (collatz_path), D6 times-eleven (digit_slide), D8 fibonacci-next
 * (fib_spiral; upgrades the legacy "Sunflower Fibonacci Spiral" row), D9 perfect-28 (divisor_blocks).
 * Editorial pass 1: D1 opens as a magic act (sealed card), D3's reveal no longer shows the
 * 3-digit 1089 table, D4 counts "rounds" like its scene, D6 gained an Act-1 guess, D9 says 52 known.
 * Batch 4: D7 prime-spiral and D10 missing-dollar, `illustration` until the Tier-3 prime_spiral /
 * money_flow scenes land. D3's hook no longer opens with "Write" and D4's fun fact drops the
 * initials, so neither needs a content-lint waiver any more.
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
    en: "Before you even pick your number, I seal my prediction in an envelope. Choose a three-digit number whose first and last digits are at least 2 apart, reverse it, subtract the smaller from the bigger, then add that answer to its own reverse. Open the envelope: how could I have known?",
    zh: "你还没选数，我就把预言封进了信封。你想一个三位数，首位和末位至少差 2；把它倒过来写，大数减小数；再把得数倒过来写，两个数相加。打开信封：我怎么可能提前知道？",
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
    { en: "Type 742 in the scene and press \"Start\", then try 513 (or tap 🎲 for a surprise). Compare how they end.", zh: "在场景里输入 742，点「开始」，再试试 513（或者点 🎲 随机来一个）。比一比最后的结果。" },
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
    en: "Try the trick with four-digit numbers. Do you still always get the same answer? Find two starts that end differently (two common endings are 10890 and 9999) and explain why.",
    zh: "换成四位数试试。还是每次都一样吗？找两个结果不同的起点（最常见的两个结局是 10890 和 9999），说说为什么。",
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
    "19/20 — hook 2, guess 2, hands-on 2, aha 2, floor 2, ceiling 2, paths 1, wrong 2, hints 2, retell 2: the sealed-envelope opening puts the magic before the digit rules; paths are try-and-see or algebra",
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
    en: "Think of a secret number and don't tell anyone. Double it, add 10, cut it in half, then take away the number you first thought of. I can tell you what's left without asking: how could I possibly know?",
    zh: "心里想一个数，别告诉任何人。把它乘 2，加 10，再除以 2，最后减去你一开始想的数。我不用问就知道你剩下多少：我怎么可能知道？",
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
    { en: "Don't just wonder about it. Type a small number like 3 into the scene and press \"Next step\" one step at a time.", zh: "别光想，在场景里输入一个小数，比如 3，再一步一步地点「下一步」。" },
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
    en: "Call your number x, like the scene does. Doubling gives 2x, adding 10 gives 2x + 10, and halving gives x + 5. Taking away x leaves 5, whatever x was.",
    zh: "像场景里那样，把你的数叫作 x。乘 2 得 2x，加 10 得 2x + 10，除以 2 得 x + 5。减去 x，剩下 5，不管 x 是几。",
  },
  aha: {
    en: "Your number gets doubled, halved and then taken away, so none of it is left. Only half of the 10 survives, and that's the 5 I read in your mind.",
    zh: "你的数先翻倍、再减半、最后被减掉，一点都不剩。只剩下 10 的一半，就是我「读」到的 5。",
  },
  extension: {
    en: "What if the trick says add 20 instead of 10? Can you invent a trick where the answer is always 7? Harder: invent one that hands back the number your friend started with.",
    zh: "如果把「加 10」改成「加 20」，答案是多少？你能设计一个答案总是 7 的魔术吗？再难一点：设计一个最后正好变回朋友原来那个数的魔术。",
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
    en: "Take any number with a few digits, scramble its digits to make a new number, and subtract the smaller one from the bigger one. Whatever you started with, the answer always divides exactly by one special number. Which one is it?",
    zh: "写一个几位数，把它的数字打乱顺序变成另一个数，再用大数减小数。不管你一开始写的是什么，结果总能被一个特别的数整除。是哪一个？",
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
    revealExtra: "none",
  },
  prompt: {
    en: "Scramble the digits of a number and subtract the smaller from the bigger. Which is the biggest of these numbers that always divides the answer exactly: 2, 3, 9 or 11?",
    zh: "把一个数的数字打乱，大数减小数。下面哪个数最大，而且总能把结果整除：2、3、9 还是 11？",
  },
  answer: { type: "CHOICE", correctId: "9" },
  hints: [
    { en: "Test it. Type a four-digit number into the scene and press \"Start\": it scrambles the digits and subtracts for you. Do it three times. On paper, try 52 − 25 and 731 − 173 too. What do the answers have in common?", zh: "试一试。在场景里输入一个四位数，点「开始」：它会帮你打乱数字再相减。做三次。再在纸上算算 52 − 25 和 731 − 173。这些得数有什么共同点？" },
    { en: "Add up the digits of each answer: 27 gives 2 + 7 = 9, and 558 gives 5 + 5 + 8 = 18. Try the scene's answers too. What do you notice?", zh: "把每个得数的各位数字加起来：27 是 2 + 7 = 9，558 是 5 + 5 + 8 = 18。场景里的得数也加一加。你发现了什么？" },
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
  difficulty: "MEDIUM",
  category: "NUMBER_THEORY",
  title: { en: "The Black Hole Number", zh: "黑洞数" },
  hook: {
    en: "Pick a four-digit number whose digits aren't all the same, then subtract its digits in smallest-first order from the same digits in biggest-first order. Do the same thing to your answer, again and again, round after round. What do you think will happen?",
    zh: "想一个四位数，只要四个数字不全一样就行；把数字从大到小排成一个数，减去从小到大排成的数。再对得数做同样的事，一轮又一轮。你猜会发生什么？",
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
    en: "Keep repeating the round: digits in biggest-first order minus digits in smallest-first order. Keep zeros as digits, so if you get 999, treat it as 0999. When the number stops changing, what number is it?",
    zh: "一轮一轮地重复：数字从大到小排，减去从小到大排。0 也要当成数字留着，如果得到 999，就写成 0999。数字不再变的时候，它是多少？",
  },
  answer: { type: "NUMERIC", value: 6174 },
  hints: [
    { en: "Just start. Try 3524: biggest-first is 5432 and smallest-first is 2345. Subtract, then do it again with the answer, or type 3524 into the scene and press \"Start\".", zh: "先动手。试试 3524：从大到小是 5432，从小到大是 2345。相减，再对得数做一遍；也可以在场景里输入 3524，点「开始」。" },
    { en: "Watch the \"Round\" lines. From 3524 you get 3087, then 8352, then… Look out for a number that comes back.", zh: "看「第 N 轮」那几行。从 3524 开始会得到 3087，然后 8352，然后……注意有没有重复出现的数。" },
    { en: "When a round gives back the very same number, you're stuck there forever. Check it: does sorting that number's digits and subtracting give the number itself?", zh: "如果做完一轮得到的还是同一个数，就会永远停在那里。验证一下：把这个数的数字重新排、相减，是不是又得到它自己？" },
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
        en: "That number still changes if you do another round. Try it: sort its digits, subtract, and keep going until nothing changes.",
        zh: "这个数再做一轮还会变。试试：把它的数字排一排，相减，一直做到不再变为止。",
      },
    },
    {
      match: "gt:correct",
      feedback: {
        en: "Not stuck yet: that number changes when you do another round. Keep going until the answer comes out the same as the number you started the round with.",
        zh: "还没停下来：这个数再做一轮还会变。一直做下去，直到得数和这一轮开始时的数一模一样。",
      },
    },
  ],
  explanation: {
    en: "6174 is the only four-digit number a round leaves unchanged: 7641 − 1467 = 6174. Every allowed start falls into it (3524 goes 5432 − 2345 = 3087, then 8352, then 6174), and never needs more than 7 rounds. You can check this in the scene, or by trying a few starts by hand.",
    zh: "6174 是唯一一个做完一轮不变的四位数：7641 − 1467 = 6174。每个符合要求的起点都会掉进去（3524 先变成 5432 − 2345 = 3087，再变成 8352，然后就是 6174），而且最多只要 7 轮。你可以在场景里验证，也可以自己多试几个。",
  },
  aha: {
    en: "Every allowed four-digit number falls into 6174 within 7 rounds, like a black hole. There are fewer than 10,000 starts, so a computer can check every one in a blink, and they all end there.",
    zh: "所有符合要求的四位数，最多 7 轮都会掉进 6174，就像掉进黑洞。四位数不到一万个，电脑一眨眼就能全部检查一遍，每一个都掉了进去。",
  },
  extension: {
    en: "Play the same game with three-digit numbers. Where do they get stuck? And what happens with two-digit numbers: do they get stuck at all, or go round in a loop?",
    zh: "用三位数玩同样的游戏，它们会停在哪里？两位数又会怎样：会停下来，还是绕着圈转？",
  },
  discussionPrompt: {
    en: "How many rounds did your starting number take? Can anyone find a start that needs all 7 rounds, and is there anything special about it?",
    zh: "你的起点用了几轮？谁能找到一个正好要 7 轮的数？它有什么特别的地方吗？",
  },
  solutionTags: ["guess_check", "table", "pattern", "simulate"],
  funFact: {
    en: "6174 is named after Kaprekar, a school teacher in India who found it in 1949 while playing with numbers for fun.",
    zh: "6174 以印度的一位中学老师卡普雷卡尔命名。1949 年，他在玩数字游戏时发现了它。",
  },
  sortOrder: 4,
  rubricNotes:
    "18/20 — hook 2, guess 2, hands-on 2, aha 2, floor 2, ceiling 2, paths 1, wrong 1, hints 2, retell 2: wrong-answer rules beyond 0 and 495 are generic 'keep going' nudges; the only real path is iterate-and-list; MEDIUM, not HARD, now that the scene does the subtraction",
};

/**
 * D5. Steps to 1 for starts 1..9: 0, 1, 7, 2, 5, 8, 16, 3, 19. The scene proposes "9" once every
 * start in highlightRange has been tried.
 */
export const collatzHailstone: HeroQuestionBlueprint = {
  slug: "collatz-hailstone",
  collection: "number-magic",
  kind: "PATTERN",
  ageGroup: "AGE_10_12",
  difficulty: "MEDIUM",
  category: "NUMBER_THEORY",
  title: { en: "The Puzzle Nobody Has Solved", zh: "至今没人解开的游戏" },
  hook: {
    en: "Here's a game: if your number is even, halve it; if it's odd, triple it and add 1; then keep going. Starting at 6 you get 6, 3, 10, 5, 16, 8, 4, 2, 1. Does every starting number end up at 1?",
    zh: "一个游戏：偶数就除以 2，奇数就乘 3 再加 1，一直做下去。从 6 开始：6、3、10、5、16、8、4、2、1。每个数最后都会到 1 吗？",
  },
  guess: {
    type: "choice",
    options: [
      { id: "always", en: "Yes, every number gets to 1", zh: "会，每个数都会到 1" },
      { id: "some", en: "No, some numbers never get there", zh: "不会，有的数永远到不了" },
      { id: "unknown", en: "Nobody knows", zh: "没有人知道" },
    ],
  },
  scene: { type: "collatz_path", maxStart: 200, highlightRange: [1, 9] },
  prompt: {
    en: "Play the game from every start from 1 to 9. Which start takes the most steps to reach 1?",
    zh: "从 1 到 9，每个数都当一次起点玩这个游戏。哪个起点要走最多步才到 1？",
  },
  answer: { type: "NUMERIC", value: 9 },
  hints: [
    { en: "Bigger numbers don't always take longer. Type a few starts into the scene and press \"Go\": the table on the side keeps each one's steps.", zh: "大的数不一定走得久。在场景里输入几个起点，点「出发」：旁边的表会记下每个起点的步数。" },
    { en: "8 is quick: 8, 4, 2, 1 is just 3 steps. Odd numbers are the ones that jump UP. Which odd starts from 1 to 9 might climb high?", zh: "8 很快：8、4、2、1，只要 3 步。奇数才会往上跳。1 到 9 里，哪些奇数起点可能爬得很高？" },
    { en: "7 takes 16 steps. Now try 9: it goes 9, 28, 14, 7, … and from there it follows 7's path. How many steps is that altogether?", zh: "7 要走 16 步。再试试 9：9、28、14、7……接下来就沿着 7 的路走。一共几步？" },
  ],
  wrongAnswers: [
    {
      match: "7",
      feedback: {
        en: "So close! 7 takes 16 steps, more than any start from 1 to 8. But 9 jumps to 28, falls to 14 and then lands on 7, so it takes 3 extra steps.",
        zh: "很接近了！7 要走 16 步，比 1 到 8 里的哪个都多。可是 9 先跳到 28，再落到 14，然后正好落在 7 上，所以还要多走 3 步。",
      },
    },
    {
      match: "8",
      feedback: {
        en: "8 is the biggest even start, but it's actually one of the fastest: 8, 4, 2, 1. Halving brings numbers down quickly.",
        zh: "8 是最大的偶数起点，其实却是最快的之一：8、4、2、1。除以 2 会让数很快变小。",
      },
    },
    {
      match: "19",
      feedback: {
        en: "19 is the number of STEPS for the winner. The question asks which starting number takes them.",
        zh: "19 是最多的步数。题目问的是哪个起点要走这么多步。",
      },
    },
    {
      match: "16",
      feedback: {
        en: "16 is how many steps 7 takes. The question asks for the starting number, and 7 isn't the longest anyway.",
        zh: "16 是 7 的步数。题目问的是起点，而且 7 也不是走得最久的。",
      },
    },
    {
      match: "27",
      feedback: {
        en: "27 is the famous long one, taking 111 steps! But it isn't between 1 and 9.",
        zh: "27 确实很有名，要走 111 步！可它不在 1 到 9 之间。",
      },
    },
    {
      match: "gt:9",
      feedback: {
        en: "Pick a start from 1 to 9 only. Bigger starts are great to explore afterwards!",
        zh: "只能从 1 到 9 里选哦。更大的起点可以以后再去探索！",
      },
    },
  ],
  explanation: {
    en: "Count the steps for each start: 1 takes 0, 2 takes 1, 3 takes 7, 4 takes 2, 5 takes 5, 6 takes 8, 7 takes 16, 8 takes 3 and 9 takes 19. Odd numbers climb before they fall, and 9 climbs to 28 and then joins 7's long path. So 9 takes the most steps.",
    zh: "数一数每个起点的步数：1 是 0 步，2 是 1 步，3 是 7 步，4 是 2 步，5 是 5 步，6 是 8 步，7 是 16 步，8 是 3 步，9 是 19 步。奇数会先往上爬再落下来，9 爬到 28 以后就接上了 7 的那条长路。所以 9 走的步数最多。",
  },
  aha: {
    en: "Small numbers can take wild trips: 27 needs 111 steps and climbs as high as 9,232. Computers have checked every start up to about 300 billion billion, and all reach 1, but nobody can prove they always will.",
    zh: "小小的数也会走出疯狂的路线：27 要走 111 步，最高冲到 9,232。计算机已经检查到 3 后面跟 20 个 0 那么大，全都回到了 1，可还是没人能证明所有的数都会。",
  },
  extension: {
    en: "Find a start below 20 that takes even more steps than 9. What do you notice about the numbers that take a long time?",
    zh: "在 20 以内找一个比 9 走得还久的起点。走得久的数有什么共同点？",
  },
  discussionPrompt: {
    en: "Would you believe 'every number reaches 1' after checking a billion numbers? Is checking lots of examples the same as proving it? Why or why not?",
    zh: "检查了十亿个数以后，你会相信「所有的数都会到 1」吗？检查很多例子，和证明它，是一回事吗？为什么？",
  },
  solutionTags: ["table", "pattern", "guess_check"],
  funFact: {
    en: "It's called the Collatz problem, or the hailstone problem because the numbers bounce up and down like hail, after Lothar Collatz, who asked about it in 1937. The great mathematician Paul Erdős said mathematics is not yet ready for problems like this.",
    zh: "这个游戏叫「考拉兹猜想」，也叫「冰雹猜想」，因为数字像冰雹一样忽上忽下。德国数学家考拉兹在 1937 年提出了它；大数学家埃尔德什说过：数学还没有准备好对付这样的问题。",
  },
  sortOrder: 5,
  rubricNotes:
    "18/20 — hook 2, guess 2, hands-on 2, aha 2, floor 2, ceiling 2, paths 1, wrong 2, hints 2, retell 1: a table of steps (by hand or in the scene) is the one path; the open problem gives an unlimited ceiling",
};

/**
 * D6. The hook's examples match the scene (its hook card shows 45 and 63; 26 breaks the "always 9"
 * idea), and the Act-1 guess is about where the middle digit comes from. The scene's quick-pick
 * buttons include 85 for the carry case in the extension (935); 123 × 11 = 1353 is paper-only.
 */
export const timesEleven: HeroQuestionBlueprint = {
  slug: "times-eleven",
  collection: "number-magic",
  kind: "MAGIC_TRICK",
  ageGroup: "AGE_8_10",
  difficulty: "EASY",
  category: "ARITHMETIC",
  title: { en: "Times 11 in One Second", zh: "一秒算出乘 11" },
  hook: {
    en: "Your friend says she can multiply any two-digit number by 11 faster than you can type it into a calculator. Her secret hides in these answers: 45 × 11 = 495, 63 × 11 = 693, 26 × 11 = 286. Can you spot it?",
    zh: "你的朋友说，任何两位数乘 11，她都能比你按计算器还快。她的秘密就藏在这些答案里：45 × 11 = 495，63 × 11 = 693，26 × 11 = 286。你能找到吗？",
  },
  guess: {
    type: "choice",
    options: [
      { id: "always-9", en: "The middle digit is always 8 or 9", zh: "中间那位总是 8 或 9" },
      { id: "add", en: "The middle digit is the two digits added", zh: "中间那位是两个数字相加" },
      { id: "multiply", en: "The middle digit is the two digits multiplied", zh: "中间那位是两个数字相乘" },
      { id: "luck", en: "There's no secret, it's luck", zh: "没有秘密，碰巧而已" },
    ],
  },
  scene: { type: "digit_slide", multiplier: 11, examples: [45, 63, 26, 85] },
  prompt: {
    en: "Use the secret to work out 72 × 11 in your head, without long multiplication. Then type 72 into the scene to check. What is 72 × 11?",
    zh: "用这个秘密心算 72 × 11，别列竖式。算完在场景里输入 72 验证一下。72 × 11 等于多少？",
  },
  answer: { type: "NUMERIC", value: 792 },
  hints: [
    { en: "Look at the first and last digits of each answer. In 45 × 11 = 495, where did the 4 and the 5 go? Tap 45 in the scene and watch.", zh: "看看每个答案的第一位和最后一位。45 × 11 = 495 里，4 和 5 跑到哪里去了？在场景里点 45 看一看。" },
    { en: "Now look at the middle digit: it's 9 in 495, 9 in 693 and 8 in 286. How can you make 8 out of the digits 2 and 6?", zh: "再看中间那一位：495 里是 9，693 里是 9，286 里是 8。用 2 和 6 怎么得到 8？" },
    { en: "Slide the two digits apart and drop their SUM in the middle. For 72: 7 on the left, 2 on the right, and 7 + 2 in between.", zh: "把两个数字分开，中间放它们的和。72 就是：左边 7，右边 2，中间放 7 + 2。" },
  ],
  wrongAnswers: [
    {
      match: "772",
      feedback: {
        en: "You kept 7 and 2 on the outside, which is right! But the middle isn't a copy of the 7: it's the SUM of the two digits, 7 + 2.",
        zh: "外面的 7 和 2 放对了！可是中间不是再抄一个 7，而是两个数字的和：7 + 2。",
      },
    },
    {
      match: "782",
      feedback: {
        en: "Nearly! The 7 and the 2 on the outside are right. Check the middle digit again: 7 + 2 is 9, not 8.",
        zh: "差一点！外面的 7 和 2 都对了。再算一次中间：7 + 2 是 9，不是 8。",
      },
    },
    {
      match: "7142",
      feedback: {
        en: "You put 7 × 2 = 14 in the middle. The middle is the two digits ADDED, not multiplied: look at 45 × 11 = 495, where 4 + 5 = 9.",
        zh: "你在中间放的是 7 × 2 = 14。中间是两个数字相加，不是相乘：看 45 × 11 = 495，4 + 5 = 9。",
      },
    },
    {
      match: "144",
      feedback: {
        en: "That's 72 × 2, as if 11 were 1 + 1. But 11 is 10 + 1, so you need 72 × 10 = 720, plus one more 72.",
        zh: "这是 72 × 2，好像把 11 当成了 1 + 1。可 11 是 10 + 1，所以是 72 × 10 = 720，再加一个 72。",
      },
    },
    {
      match: "720",
      feedback: {
        en: "720 is 72 × 10. You need one more 72 on top: 72 × 11 = 72 × 10 + 72.",
        zh: "720 是 72 × 10。还要再加一个 72：72 × 11 = 72 × 10 + 72。",
      },
    },
    {
      match: "7272",
      feedback: {
        en: "Writing 72 twice is a fun idea, but that's 72 × 101. For × 11, the two copies of 72 overlap, shifted by just one place.",
        zh: "把 72 写两遍很好玩，可那是 72 × 101。乘 11 的时候，两个 72 只错开一位，叠在一起。",
      },
    },
  ],
  explanation: {
    en: "Multiplying by 11 means multiplying by 10 and by 1, then adding: 72 × 11 = 720 + 72. When you add them, the 7 and the 2 land in the same column, so the middle digit is 7 + 2 = 9. That gives 792.",
    zh: "乘 11 就是乘 10 再加上乘 1：72 × 11 = 720 + 72。这两个数相加的时候，7 和 2 落在同一列，所以中间一位是 7 + 2 = 9。答案就是 792。",
  },
  aha: {
    en: "× 11 is just × 10 plus × 1, so the two digits slide apart and their sum drops into the middle. When the sum is 10 or more, carry the 1.",
    zh: "乘 11 就是乘 10 再加乘 1，所以两个数字分开，中间落下它们的和。和满 10 的时候，要向前进 1。",
  },
  extension: {
    en: "Now try 85 × 11 (it's one of the scene's buttons). The middle sum is 8 + 5 = 13, which doesn't fit in one digit. What do you do? Can the trick work for a three-digit number like 123 × 11?",
    zh: "再试试 85 × 11（场景里有这个按钮）。中间的和是 8 + 5 = 13，一格放不下。怎么办？这个方法能用在三位数上吗？比如 123 × 11。",
  },
  discussionPrompt: {
    en: "Teach the trick to someone at home, using a number whose two digits add up to more than 9. Did they get the carry right the first time?",
    zh: "把这个方法教给家里人，出一道两个数字加起来超过 9 的题。他第一次就把进位算对了吗？",
  },
  solutionTags: ["pattern", "algebra"],
  funFact: {
    en: "Ones and elevens make pretty patterns: 11 × 11 = 121, 111 × 111 = 12321 and 1111 × 1111 = 1234321.",
    zh: "11、111 这样的数会乘出漂亮的图案：11 × 11 = 121，111 × 111 = 12321，1111 × 1111 = 1234321。",
  },
  sortOrder: 6,
  rubricNotes:
    "18/20 — hook 2, guess 1, hands-on 2, aha 2, floor 2, ceiling 2, paths 1, wrong 2, hints 2, retell 2: the new guess (where does the middle digit come from?) lets a kid commit to 'always 8 or 9' before exploring, though the right option is easy to spot; spotting the pattern is the one path; a trick kids really do show at home",
};

/**
 * D8. Upgrades the legacy DRILL row "Sunflower Fibonacci Spiral" (same idea, continue the
 * Fibonacci list; it asked for the 9th term, 34, and now asks for the 10th, 55).
 * fib_spiral with 10 terms ends on the 55 square.
 */
export const fibonacciNext: HeroQuestionBlueprint = {
  slug: "fibonacci-next",
  collection: "number-magic",
  kind: "PATTERN",
  ageGroup: "AGE_8_10",
  difficulty: "EASY",
  category: "NUMBER_THEORY",
  title: { en: "Rabbits, Petals, What's Next?", zh: "兔子、花瓣和下一个数" },
  hook: {
    en: "Count the spirals of seeds in a sunflower, or the bumpy rows on a pineapple, and you keep finding the same list of numbers: 1, 1, 2, 3, 5, 8, 13, 21, 34 … What comes next?",
    zh: "数一数向日葵种子排成的螺旋，或者菠萝表面一排排的小格子，你总会碰到同一串数：1、1、2、3、5、8、13、21、34……下一个是几？",
  },
  guess: {
    type: "slider",
    min: 35,
    max: 100,
    step: 1,
  },
  scene: { type: "fib_spiral", terms: 10 },
  prompt: {
    en: "In the list 1, 1, 2, 3, 5, 8, 13, 21, 34 …, what is the next number?",
    zh: "在 1、1、2、3、5、8、13、21、34……这串数里，下一个数是几？",
  },
  answer: { type: "NUMERIC", value: 55 },
  hints: [
    { en: "Don't look for a times table. Press \"Next square\" in the scene: each new square sits along the long side. How is its size made from the squares just before it?", zh: "别去找乘法表。在场景里点「下一个」：新正方形贴着长边放。它的边长是怎么由前面的正方形变出来的？" },
    { en: "Try it on a few: 2 + 3 = 5. 3 + 5 = 8. 5 + 8 = 13. Do the later numbers work the same way?", zh: "试几个：2 + 3 = 5，3 + 5 = 8，5 + 8 = 13。后面的数也是这样吗？" },
    { en: "Every number is the two before it added together. So the next one is 21 + 34.", zh: "每个数都是它前面两个数的和。所以下一个是 21 + 34。" },
  ],
  wrongAnswers: [
    {
      match: "47",
      feedback: {
        en: "You added 34 and 13. Close idea! But use the two numbers right before the gap: 21 and 34.",
        zh: "你算的是 34 + 13，想法很接近！可是要用紧挨着空位的两个数：21 和 34。",
      },
    },
    {
      match: "68",
      feedback: {
        en: "That's 34 doubled. The numbers do grow a bit like doubling, but each one is the sum of the TWO before it, not twice the last one.",
        zh: "这是 34 的两倍。这串数长得确实有点像翻倍，可每个数是前面两个数的和，不是最后一个数的两倍。",
      },
    },
    {
      match: "35",
      feedback: {
        en: "Adding 1 each time is the rule for counting, but this list grows faster and faster. Look at 13, 21, 34: how is each one made?",
        zh: "每次加 1 是数数的规律，这串数却越长越快。看看 13、21、34，每个是怎么来的？",
      },
    },
    {
      match: "89",
      feedback: {
        en: "89 really is in the list, but it's one step too far! It comes right after the number we're looking for.",
        zh: "89 确实在这串数里，可是走过头了一步！它紧跟在我们要找的那个数后面。",
      },
    },
  ],
  explanation: {
    en: "Each number in the list is the sum of the two before it: 1 + 1 = 2, 1 + 2 = 3, 2 + 3 = 5, and so on. The last two numbers are 21 and 34. So the next one is 21 + 34 = 55.",
    zh: "这串数里每个数都是前面两个数的和：1 + 1 = 2，1 + 2 = 3，2 + 3 = 5，依此类推。最后两个数是 21 和 34。所以下一个是 21 + 34 = 55。",
  },
  aha: {
    en: "Each number is just the two before it added together, and that simple rule draws a spiral. Divide each number by the one before it and you get closer and closer to 1.618.",
    zh: "每个数只是前两个数相加，这么简单的规则却能画出一条螺旋。用每个数除以前一个数，结果会越来越接近 1.618。",
  },
  extension: {
    en: "Work out 34 ÷ 21 and 55 ÷ 34 (a calculator is fine). Which number are they getting close to? What do you think 89 ÷ 55 will be?",
    zh: "算一算 34 ÷ 21 和 55 ÷ 34（可以用计算器）。它们越来越接近哪个数？你觉得 89 ÷ 55 会是多少？",
  },
  discussionPrompt: {
    en: "Find a real flower, a pinecone or a pineapple and count its petals or spirals. Did you get a number from the list? Which one?",
    zh: "找一朵真的花、一个松果或者一个菠萝，数数它的花瓣或螺旋。你数到的是这串数里的数吗？是哪一个？",
  },
  solutionTags: ["pattern", "table", "draw"],
  funFact: {
    en: "The list is named after Fibonacci, an Italian who wrote about it in 1202 in a puzzle about rabbits. Many sunflowers have 34 spirals one way and 55 the other.",
    zh: "这串数以意大利人斐波那契命名，他在 1202 年用一道兔子繁殖的题写到了它。很多向日葵一个方向有 34 条螺旋，另一个方向有 55 条。",
  },
  sortOrder: 8,
  rubricNotes:
    "17/20 — hook 2, guess 1, hands-on 2, aha 2, floor 2, ceiling 2, paths 1, wrong 2, hints 2, retell 1: once kids spot the rule most guess 55, so the guess gap is small; upgrades the legacy 'Sunflower Fibonacci Spiral' row (which asked for 34)",
  upgradesLegacyTitleEn: "Sunflower Fibonacci Spiral",
};

/** D9. 20..30: aliquot sums 22, 11, 14, 13, 36, 6, 16, 13, 28, 1, 42; only 28 is perfect. The scene proposes "28". */
export const perfect28: HeroQuestionBlueprint = {
  slug: "perfect-28",
  collection: "number-magic",
  kind: "PUZZLE",
  ageGroup: "AGE_10_12",
  difficulty: "MEDIUM",
  category: "NUMBER_THEORY",
  title: { en: "The Perfect Number", zh: "完美的数" },
  hook: {
    en: "Some numbers are 'perfect': add up all the smaller numbers that divide into them evenly, and you get the number back exactly. Six is one, because 1 + 2 + 3 = 6. The next perfect number is hiding somewhere between 20 and 30: can you find it?",
    zh: "有些数是「完美」的：把能整除它的、比它小的数全加起来，正好等于它本身，这样的数叫「完全数」。6 就是一个，因为 1 + 2 + 3 = 6。下一个完全数就藏在 20 到 30 之间，你能找到它吗？",
  },
  guess: {
    type: "choice",
    options: Array.from({ length: 11 }, (_, i) => {
      const n = String(20 + i);
      return { id: n, en: n, zh: n };
    }),
  },
  scene: { type: "divisor_blocks", max: 40, highlight: [6, 28] },
  prompt: {
    en: "Which number between 20 and 30 equals the sum of its divisors, not counting the number itself?",
    zh: "20 到 30 之间，哪个数正好等于它所有因数（不算它自己）的和？",
  },
  answer: { type: "NUMERIC", value: 28 },
  hints: [
    { en: "Don't guess blindly. Drag the slider to 20: its divisors stack up into a bar. Does the stack come out short, exactly equal, or too tall?", zh: "别瞎猜。把滑块拖到 20：它的因数会叠成一根柱子。这根柱子是「不够」「正好相等」还是「超过了」？" },
    { en: "20: 1 + 2 + 4 + 5 + 10 = 22, a bit too big. Odd numbers have few divisors, so their sums come out too small. Try the even ones.", zh: "20：1 + 2 + 4 + 5 + 10 = 22，大了一点。奇数的因数很少，加起来总是太小。试试偶数。" },
    { en: "Find divisors in pairs: 24 = 1 × 24 = 2 × 12 = 3 × 8 = 4 × 6. Do the same for 22, 26 and 28, and add up each list (leave out the number itself).", zh: "因数可以成对地找：24 = 1 × 24 = 2 × 12 = 3 × 8 = 4 × 6。用同样的办法找 22、26、28 的因数，再分别加起来（别算它自己）。" },
  ],
  wrongAnswers: [
    {
      match: "24",
      feedback: {
        en: "Good try: 24 has lots of divisors. Too many, in fact: 1 + 2 + 3 + 4 + 6 + 8 + 12 = 36, so its stack is too tall. Numbers like that are called 'abundant'.",
        zh: "想得不错：24 的因数很多。其实是太多了：1 + 2 + 3 + 4 + 6 + 8 + 12 = 36，柱子超过了 24。这样的数叫「盈数」。",
      },
    },
    {
      match: "27",
      feedback: {
        en: "Only 1, 3 and 9 divide into 27, and 1 + 3 + 9 = 13. That's far too small: odd numbers usually come out short.",
        zh: "能整除 27 的只有 1、3、9，1 + 3 + 9 = 13，差得远。奇数加起来通常都不够。",
      },
    },
    {
      match: "20",
      feedback: {
        en: "Close! 1 + 2 + 4 + 5 + 10 = 22, just a little more than 20. Keep checking the other even numbers.",
        zh: "很接近！1 + 2 + 4 + 5 + 10 = 22，比 20 多一点。继续检查别的偶数。",
      },
    },
    {
      match: "30",
      feedback: {
        en: "30 has lots of divisors: 1 + 2 + 3 + 5 + 6 + 10 + 15 = 42. Too much! Check the even numbers a little below it.",
        zh: "30 的因数很多：1 + 2 + 3 + 5 + 6 + 10 + 15 = 42，太多了！检查一下比它小一点的偶数。",
      },
    },
    {
      match: "regex:^\\s*(21|22|25|26)\\s*$",
      feedback: {
        en: "Its stack comes up short: 21 gives 1 + 3 + 7 = 11, 22 gives 1 + 2 + 11 = 14, 25 gives 1 + 5 = 6 and 26 gives 1 + 2 + 13 = 16. Look for a number with more divisors.",
        zh: "它的柱子不够高：21 是 1 + 3 + 7 = 11，22 是 1 + 2 + 11 = 14，25 是 1 + 5 = 6，26 是 1 + 2 + 13 = 16。找一个因数更多的数。",
      },
    },
    {
      match: "regex:^\\s*(23|29)\\s*$",
      feedback: {
        en: "That's a prime number: apart from itself, only 1 divides into it. So its sum is just 1.",
        zh: "它是质数：除了它自己，只有 1 能整除它。所以加起来只有 1。",
      },
    },
  ],
  explanation: {
    en: "For each number, add up the numbers that divide into it, leaving out the number itself. Most come out too small (27 gives 13) or too big (24 gives 36). Only 28 lands exactly: 1 + 2 + 4 + 7 + 14 = 28.",
    zh: "对每个数，把能整除它的数加起来，不算它自己。大多数不是太小（27 只有 13），就是太大（24 有 36）。只有 28 正好：1 + 2 + 4 + 7 + 14 = 28。",
  },
  aha: {
    en: "Perfect numbers are incredibly rare: 6, 28, 496, 8128, and the next one already has eight digits. Only 52 are known, all of them even, and nobody knows if an odd one exists.",
    zh: "完全数少得惊人：6、28、496、8128，下一个就有 8 位数了。人类目前只知道 52 个，全是偶数，到底有没有奇数的完全数，没人知道。",
  },
  extension: {
    en: "The divisors of 12 add up to 1 + 2 + 3 + 4 + 6 = 16, more than 12, so 12 is 'abundant'. Which numbers from 1 to 30 are abundant? What do they have in common?",
    zh: "12 的因数加起来是 1 + 2 + 3 + 4 + 6 = 16，比 12 大，所以 12 是「盈数」。1 到 30 里，哪些是盈数？它们有什么共同点？",
  },
  discussionPrompt: {
    en: "How did you make sure you didn't miss a divisor? Describe your way of finding them all so a friend could use it.",
    zh: "你是怎么保证没有漏掉因数的？把你的找法说清楚，让朋友也能用。",
  },
  solutionTags: ["table", "pair", "guess_check"],
  funFact: {
    en: "The first four perfect numbers were known in ancient Greece. The fifth, 33,550,336, wasn't written down until the 1400s.",
    zh: "前四个完全数，古希腊人就已经知道了。第五个 33,550,336，直到 15 世纪才被人写下来。",
  },
  sortOrder: 9,
  rubricNotes:
    "17/20 — hook 2, guess 1, hands-on 2, aha 2, floor 2, ceiling 2, paths 1, wrong 2, hints 2, retell 1: the guess is a pick among eleven numbers rather than a real hunch; listing divisors (on paper or as stacks in the scene) is the one path",
};

/**
 * D7. Ulam's spiral. Illustration until the T3 `prime_spiral` scene lands (待替换为 prime_spiral): a 7 × 7
 * numbered start (2, 3, 5, 7 shaded) and a 51 × 51 reveal with the densest diagonals highlighted.
 * Diagonals through the centre are 4k² − 2k + 1 (3, 13, 31) and 4k² + 1 (5, 17, 37). Odd and even
 * numbers sit like chessboard squares, so primes after 2 share one colour and line up diagonally.
 * Extension answer: from 41, the diagonal n² + n + 41 is prime for n = 0..39; n = 40 gives 1681 = 41².
 */
export const primeSpiral: HeroQuestionBlueprint = {
  slug: "prime-spiral",
  collection: "number-magic",
  kind: "PATTERN",
  ageGroup: "AGE_12_14",
  difficulty: "MEDIUM",
  category: "NUMBER_THEORY",
  title: { en: "The Prime Number Spiral", zh: "质数排成的线" },
  hook: {
    en: "Start with a one in the middle of some squared paper and write the counting numbers round and round it in a spiral. Then shade every prime number, the ones that divide only by one and themselves. When the spiral gets really big, what picture do you think the shaded squares make?",
    zh: "在方格纸中间写一个 1，然后把 2、3、4、5……一圈一圈绕着它写成螺旋。再把所有质数（只能被 1 和它自己整除的数）涂黑。螺旋写得很大以后，涂黑的格子会组成什么样的图案？",
  },
  guess: {
    type: "choice",
    options: [
      { id: "random-dots", en: "Random scattered dots, like spilled salt", zh: "乱七八糟的点，像撒了一把盐" },
      { id: "diagonal-streaks", en: "Diagonal lines", zh: "一条条斜线" },
      { id: "circles", en: "Rings around the middle", zh: "围着中心的一圈圈圆环" },
    ],
  },
  scene: {
    type: "illustration",
    asset: "prime-spiral",
    caption: { en: "The numbers 1 to 49 spiral out from the middle. The first primes, 2, 3, 5 and 7, are shaded.", zh: "从中间开始，1 到 49 绕成螺旋。前几个质数 2、3、5、7 已经涂上了颜色。" },
    revealAsset: "prime-spiral-reveal",
    revealCaption: {
      en: "Out to 2,601, every prime is a dot, and lots of them line up in long diagonal streaks.",
      zh: "一直写到 2601，每个质数是一个点，很多点排成了长长的斜线。",
    },
  },
  prompt: {
    en: "In a big number spiral with every prime shaded, what pattern do the shaded squares make?",
    zh: "在一个很大的数字螺旋里，把所有质数涂黑，涂黑的格子会排成什么图案？",
  },
  answer: { type: "CHOICE", correctId: "diagonal-streaks" },
  hints: [
    { en: "Every prime except 2 is odd. In the 7 × 7 picture, colour all the odd numbers: what pattern do they make, and which way do you step to get from one odd square to the next?", zh: "除了 2，质数都是奇数。在 7 × 7 的图里把奇数都涂上颜色：它们排成什么图案？从一个奇数格走到下一个奇数格，要往哪个方向走？" },
    { en: "In the picture, follow the diagonal from 1 through 3, 13 and 31, and the one through 5, 17 and 37. What do you notice about all those numbers?", zh: "在图里，沿着从 1 经过 3、13、31 的斜线看，再看经过 5、17、37 的那条。这些数有什么共同点？" },
    { en: "The numbers on a diagonal follow one squared rule: 5, 17, 37 are 4k² + 1 for k = 1, 2, 3. Some rules like this produce primes again and again, and each rule is a straight diagonal in the spiral. So what will the big picture show?", zh: "同一条斜线上的数遵守同一个平方规律：5、17、37 就是 k = 1、2、3 时的 4k² + 1。有些这样的规律会一次又一次地算出质数，而每个规律在螺旋里都是一条斜线。那么大图里会看到什么？" },
  ],
  wrongAnswers: [
    {
      match: "choice:random-dots",
      feedback: {
        en: "A very sensible guess: primes seem to pop up with no plan at all. Up close they do look scattered, but zoom out and they crowd onto diagonal lines, because the numbers on one diagonal follow one rule, and some rules make lots of primes.",
        zh: "很合理的猜测：质数好像毫无规律地冒出来。凑近看确实很散，可是退远一看，它们挤在一条条斜线上，因为同一条斜线上的数遵守同一个规律，而有些规律能算出很多质数。",
      },
    },
    {
      match: "choice:circles",
      feedback: {
        en: "Rings would mean that being prime depends on how far you are from the middle. It doesn't: every ring of the spiral has primes and non-primes mixed together. The pattern runs along the diagonals instead.",
        zh: "如果是圆环，就说明是不是质数只看离中心有多远。可并不是：螺旋的每一圈里质数和非质数都混在一起。图案是沿着斜线走的。",
      },
    },
  ],
  explanation: {
    en: "In the spiral, odd and even numbers sit like the squares of a chessboard, so every prime except 2 lands on the same colour, and squares of one colour line up diagonally. The numbers along a diagonal follow a single squared rule, like 4k² + 1 (5, 17, 37, 65, …) or 4k² − 2k + 1 (3, 13, 31, 57, …), and some of those rules produce primes unusually often. So the shaded squares crowd onto diagonal streaks, with plenty of scattered dots in between.",
    zh: "在螺旋里，奇数和偶数像国际象棋棋盘的黑白格一样交错排列，所以除了 2 以外的质数都落在同一种颜色上，而同色的格子是沿斜线排的。同一条斜线上的数遵守同一个平方规律，比如 4k² + 1（5、17、37、65……）或 4k² − 2k + 1（3、13、31、57……），有些规律算出质数特别频繁。所以涂黑的格子挤成一条条斜线，中间还夹着不少零散的点。",
  },
  aha: {
    en: "Primes aren't completely random: lay them out in a spiral and they crowd onto diagonal streaks. Yet nobody has proved that the diagonal 5, 17, 37, … keeps finding primes forever.",
    zh: "质数并不是完全随机的：把它们排成螺旋，就会挤成一条条斜线。可是到现在，还没人能证明 5、17、37……这条斜线会永远找到新的质数。",
  },
  extension: {
    en: "Start the spiral at 41 instead of 1. One diagonal then holds n² + n + 41 for n = 0, 1, 2, and so on: check the first few. How long does it keep making primes?",
    zh: "这次从 41 开始写螺旋。有一条斜线上的数正好是 n² + n + 41（n = 0、1、2……）：验证前几个。它能连续算出多少个质数？",
  },
  discussionPrompt: {
    en: "Find the longest streak in the reveal picture. Describe where it is so that a friend could find it too, and say what the whole picture reminds you of.",
    zh: "在揭晓的大图里找出最长的一条斜线。描述它在哪儿，让朋友也能找到；再说说整张图让你想到了什么。",
  },
  solutionTags: ["draw", "pattern"],
  funFact: {
    en: "The story goes that the mathematician Stanisław Ulam found this pattern in 1963, while doodling numbers in a spiral during a boring meeting.",
    zh: "据说，数学家乌拉姆是在 1963 年一次无聊的会议上，在纸上随手把数字写成螺旋时发现这个图案的。",
  },
  sortOrder: 7,
  rubricNotes:
    "17/20 — hook 2, guess 2, hands-on 1, aha 2, floor 1, ceiling 2, paths 1, wrong 2, hints 2, retell 2: illustration only (待替换为 prime_spiral); drawing it on squared paper is the one real path, and the chessboard-parity idea is a partial reason, not a proof; primes and squared rules make it 12+; the open question is real",
};

/**
 * D10. The missing-dollar riddle. Illustration until the T3 `money_flow` scene lands (待替换为 money_flow);
 * the picture's numbers are 30, 25, 5, 2, 1, 27 and 29. The guess is the question.
 * Extension answer (open): any "vanishing money" story adds an amount that is already inside the total
 * (or adds what should be subtracted); the honest check is to follow every coin to where it ends up.
 */
export const missingDollar: HeroQuestionBlueprint = {
  slug: "missing-dollar",
  collection: "number-magic",
  kind: "PARADOX",
  ageGroup: "AGE_10_12",
  difficulty: "MEDIUM",
  category: "ARITHMETIC",
  title: { en: "The Missing Dollar", zh: "消失的一块钱" },
  hook: {
    en: "Three friends share a hotel room and pay 30 dollars between them. The clerk realises the room costs only 25 and sends the bellboy back with 5, but the bellboy quietly keeps 2 and gives each friend 1 back. So each friend paid 9, and 3 × 9 = 27, plus the bellboy's 2 makes 29: where did the missing dollar go?",
    zh: "三个朋友合住一间旅馆，一共付了 30 元。前台发现房费只要 25 元，就让服务员退回 5 元；服务员偷偷留下 2 元，给每人退了 1 元。这样每人付了 9 元，3 × 9 = 27，再加上服务员的 2 元是 29 元。还有 1 元去哪儿了？",
  },
  guess: {
    type: "choice",
    options: [
      { id: "bellboy", en: "The bellboy has it", zh: "服务员拿走了" },
      { id: "clerk", en: "The clerk kept it", zh: "前台拿走了" },
      { id: "nothing-missing", en: "Nothing is missing: the sum is the trick", zh: "根本没少，是算式在骗人" },
    ],
  },
  scene: {
    type: "illustration",
    asset: "missing-dollar",
    caption: {
      en: "Follow the arrows: 30 to the desk, 5 to the bellboy, 2 into his pocket, 1 back to each friend.",
      zh: "顺着箭头看：30 元交给前台，5 元交给服务员，2 元进了他的口袋，每人退回 1 元。",
    },
    revealAsset: "missing-dollar-reveal",
    revealCaption: {
      en: "30 = 25 at the desk + 2 with the bellboy + 3 back to the friends. The friends' 27 already includes the bellboy's 2.",
      zh: "30 = 前台的 25 + 服务员的 2 + 退给三人的 3。三人付的 27 里，已经包含了服务员的 2。",
    },
  },
  prompt: {
    en: "In the end the friends paid 27 and the bellboy has 2. Why doesn't 27 + 2 make 30, and where is the missing dollar?",
    zh: "三个朋友最后一共付了 27 元，服务员手里有 2 元。为什么 27 + 2 不等于 30？少的那 1 元去哪儿了？",
  },
  answer: { type: "CHOICE", correctId: "nothing-missing" },
  hints: [
    { en: "Forget the story's sum for a moment. Follow the arrows in the picture and write down where each of the 30 dollars is at the end.", zh: "先别管故事里的算式。顺着图里的箭头，写下最后这 30 元分别在谁手里。" },
    { en: "At the end the desk has 25, the bellboy has 2 and the friends have 3 back. Add those up. Has any money vanished?", zh: "最后前台有 25 元，服务员有 2 元，三个朋友拿回 3 元。加起来是多少？有钱消失了吗？" },
    { en: "Now look at the 27 the friends paid. Where did those 27 dollars go? Part is at the desk and part is in the bellboy's pocket. So should the bellboy's 2 be added to 27, or is it already inside it?", zh: "再看三个朋友付的 27 元。这 27 元去了哪儿？一部分在前台，一部分在服务员口袋里。那么服务员的 2 元应该加到 27 上，还是本来就在 27 里面？" },
  ],
  wrongAnswers: [
    {
      match: "choice:bellboy",
      feedback: {
        en: "The bellboy did keep 2, but that isn't an extra dollar: those 2 are already inside the 27 the friends paid. Count where all 30 dollars end up: 25 + 2 + 3.",
        zh: "服务员确实留了 2 元，但那不是多出来的钱：这 2 元已经包含在三人付的 27 元里了。数一数 30 元最后都在哪儿：25 + 2 + 3。",
      },
    },
    {
      match: "choice:clerk",
      feedback: {
        en: "The clerk keeps 25, exactly the price of the room, and not a dollar more. The story's sum makes it feel as if a dollar slipped away, but every one is accounted for: 25 + 2 + 3 = 30.",
        zh: "前台留下 25 元，正好是房费，一元也没多拿。故事里的算式让人觉得少了一块钱，其实每一元都有着落：25 + 2 + 3 = 30。",
      },
    },
  ],
  explanation: {
    en: "Follow the money: of the 30 dollars, 25 stay at the desk, 2 go into the bellboy's pocket and 3 go back to the friends, and 25 + 2 + 3 = 30. The friends paid 27 in the end, and that 27 is exactly the desk's 25 plus the bellboy's 2. Adding the bellboy's 2 to 27 counts the same 2 dollars twice, so the 29 means nothing. The honest sums are 27 = 25 + 2 and 27 + 3 = 30.",
    zh: "跟着钱走：30 元里，25 元留在前台，2 元进了服务员的口袋，3 元退给了三个朋友，25 + 2 + 3 = 30。三个朋友最后付的 27 元，正好是前台的 25 元加上服务员的 2 元。把服务员的 2 元再加到 27 上，就把同一笔 2 元算了两遍，所以 29 这个数毫无意义。正确的算式是 27 = 25 + 2，以及 27 + 3 = 30。",
  },
  aha: {
    en: "Nothing is missing: the story adds the bellboy's 2 to a total that already contains it. The money is fine; it's the sum that's crooked.",
    zh: "什么都没少：故事把服务员的 2 元加到了一个已经包含它的总数上。钱没问题，有问题的是那道算式。",
  },
  extension: {
    en: "Make up your own \"vanishing money\" story to try on a friend. What rule does the fake sum have to break so that it sounds right but isn't?",
    zh: "自己编一个「钱不见了」的故事，考考朋友。那道假算式要违反什么规则，才能听起来对、其实不对？",
  },
  discussionPrompt: {
    en: "The first time you heard it, which step fooled you? Copy out the sentence of the story where the trick really happens.",
    zh: "第一次听到这道题时，你是在哪一步被骗的？写出故事里真正「做手脚」的那一句。",
  },
  solutionTags: ["draw", "table", "work_backwards"],
  funFact: {
    en: "This riddle has been fooling people for nearly a hundred years, told in many languages and with many different coins.",
    zh: "这个谜题已经骗了人快一百年，换了好多种语言、好多种钱，照样管用。",
  },
  sortOrder: 10,
  rubricNotes:
    "18/20 — hook 2, guess 2, hands-on 1, aha 2, floor 2, ceiling 1, paths 2, wrong 2, hints 2, retell 2: illustration only (待替换为 money_flow); following every coin and asking what the 27 is made of are two real paths; the extension is open-ended rather than a general law; a classic to try on parents",
};

export const NUMBER_MAGIC: readonly HeroQuestionBlueprint[] = [
  trick1089,
  mindReadingFive,
  scrambleAndNine,
  kaprekar6174,
  collatzHailstone,
  timesEleven,
  fibonacciNext,
  perfect28,
  primeSpiral,
  missingDollar,
];
