/**
 * World F · Impossible puzzles (`impossible-puzzles`). Catalog: 02-hero-question-catalog.md §F.
 * Batch 2: F1 river-crossing, F2 nine-balls-balance, F3 three-switches, F8 knights-and-knaves.
 * F3 and F8 use `illustration` until the T3 switch_room / dialogue_cards scenes exist.
 * Batch 4: F4 bridge-and-torch and F9 nine-dots-four-lines (illustration until bridge_torch /
 * dot_connect exist), F5 four-fours (expression_builder, EXPRESSION), F6 water-jugs, F7 four-queens,
 * F10 blindfold-coins, F11 fly-between-trains, F12 guess-my-number (this world's second AGE_8_10).
 * Editorial pass 1: hints name the scenes' buttons; the two illustration scenes now carry a
 * revealCaption so Act 3 says something new; F8 got a story hook and a four-case table path.
 * Editorial pass 2 (editorial-pass-2.md): batch-4 copy re-read; F4's aha is the 'hide the 5 inside
 * the 10' picture, F11 names von Neumann as a legend, F12's Chinese matches the scene's 「比 g 大 / 小」.
 */
import { JUG_ACTIONS, applyJugAction, binarySearchSteps, isJugsSolved, jugsShortestSolution, queensSolutions, type JugAction, type JugState } from "@gmq/animation-engine";
import { defineVariants, type HeroQuestionBlueprint, type WrongAnswerRule } from "./_template";

/** Drops rules whose match repeats an earlier one or names the correct value (variant copy is generated, so slips can coincide). */
/** English article for a number said aloud: "an 8-litre jug", "an 11-year cycle", "a 5-litre jug". */
const an = (n: number): "a" | "an" => (/^8/.test(String(n)) || n === 11 || n === 18 ? "an" : "a");
const litres = (n: number): string => `${n} ${n === 1 ? "litre" : "litres"}`;

function distinctRules(rules: WrongAnswerRule[], correct: number): WrongAnswerRule[] {
  const seen = new Set<string>([String(correct)]);
  return rules.filter((r) => (seen.has(r.match) ? false : (seen.add(r.match), true)));
}

/** Suspects left after each weighing when you keep splitting into thirds (rounded up): 18 → 6 → 2 → 1. */
function thirdsChain(n: number): number[] {
  const out = [n];
  while (out[out.length - 1] > 1) out.push(Math.ceil(out[out.length - 1] / 3));
  return out;
}

/** The water_jugs scene's button labels. */
function jugLabel(a: JugAction, caps: readonly [number, number]): { en: string; zh: string } {
  if (a.kind === "fill") return { en: `Fill ${caps[a.jug]} L`, zh: `装满 ${caps[a.jug]} 升` };
  if (a.kind === "empty") return { en: `Empty ${caps[a.jug]} L`, zh: `倒空 ${caps[a.jug]} 升` };
  return { en: `Pour ${caps[a.from]} → ${caps[a.to]}`, zh: `${caps[a.from]} 倒入 ${caps[a.to]}` };
}

/** Fewest steps when the first step must be filling jug `first` (the "started with the other jug" slip). */
function jugsStepsStartingWith(caps: readonly [number, number], target: number, first: 0 | 1): number | null {
  const start = applyJugAction([0, 0], { kind: "fill", jug: first }, caps);
  const dist = new Map<string, number>([[start.join(), 1]]);
  const queue: JugState[] = [start];
  while (queue.length) {
    const cur = queue.shift()!;
    const d = dist.get(cur.join())!;
    if (isJugsSolved(cur, target)) return d;
    for (const action of JUG_ACTIONS) {
      const next = applyJugAction(cur, action, caps);
      if (!dist.has(next.join())) {
        dist.set(next.join(), d + 1);
        queue.push(next);
      }
    }
  }
  return null;
}


/**
 * F1. Answered as NUMERIC 7 (fewest crossings) rather than SCENE_COMPLETION: the scene counts
 * crossings and reports `completed { crossings }`, and the number is what the guess was about.
 */
export const riverCrossing: HeroQuestionBlueprint = {
  slug: "river-crossing",
  collection: "impossible-puzzles",
  kind: "PUZZLE",
  ageGroup: "AGE_8_10",
  difficulty: "EASY",
  category: "LOGIC",
  title: { en: "Wolf, Goat and Cabbage", zh: "狼、羊、白菜过河" },
  hook: {
    en: "A farmer has to row a wolf, a goat and a cabbage across a river, in a little boat that holds him and just one of them. Left alone without him, the wolf will eat the goat, and the goat will gobble up the cabbage. How can he get everything across safely, and in how few trips?",
    zh: "农夫要划一条小船，把一只狼、一只羊和一棵白菜运过河，船上除了他只能再放一样。农夫不在的时候，狼会吃羊，羊会吃白菜。他该怎么把它们都安全运过去？最少要划几趟？",
  },
  guess: {
    type: "slider",
    min: 3,
    max: 12,
    step: 1,
    unit: { en: "crossings", zh: "次" },
  },
  scene: {
    type: "river_crossing",
    items: [
      { id: "wolf", emoji: "🐺", label: { en: "wolf", zh: "狼" } },
      { id: "goat", emoji: "🐐", label: { en: "goat", zh: "羊" } },
      { id: "cabbage", emoji: "🥬", label: { en: "cabbage", zh: "白菜" } },
    ],
    conflicts: [
      ["wolf", "goat"],
      ["goat", "cabbage"],
    ],
    boatCapacity: 1,
  },
  prompt: {
    en: "Every trip across the river, in either direction, counts as one crossing. What is the fewest number of crossings that gets the wolf, the goat and the cabbage safely to the other side?",
    zh: "每划过河一趟（不管是去还是回）算一次过河。最少要过河几次，才能把狼、羊和白菜都安全运到对岸？",
  },
  answer: { type: "NUMERIC", value: 7 },
  hints: [
    { en: "Which one can't be left alone with anything? Tap it to put it in the boat, then press the cross button. Think about why it has to go first.", zh: "哪一样跟谁都不能单独待在一起？点它放上船，再按过河的按钮。想想为什么第一趟非带它不可。" },
    { en: "The goat goes first. Next the farmer takes the wolf over, but now the wolf and the goat are together on the far bank. What could he carry on the way back?", zh: "先带羊过去。接着农夫带狼过去，可现在狼和羊在对岸待在一起了。回来的时候他能带点什么？" },
    { en: "Bring the goat back! Leave it, take the cabbage across to the wolf, row back alone, and fetch the goat. Count every trip.", zh: "把羊带回来！把羊放下，带白菜过去和狼待在一起，自己空船回来，再去接羊。每一趟都数上。" },
  ],
  wrongAnswers: [
    {
      match: "3",
      feedback: {
        en: "Three trips would work if nobody ate anybody. But the farmer has to row back between trips, and those trips count too.",
        zh: "如果谁都不吃谁，三趟就够了。可是农夫每次还得划回来，回来的那几趟也要算。",
      },
    },
    {
      match: "4",
      feedback: {
        en: "Four is the number of trips going TO the far bank. Count the trips coming back as well.",
        zh: "4 是往对岸去的趟数。回来的趟数也要算上。",
      },
    },
    {
      match: "5",
      feedback: {
        en: "You counted the trips with something in the boat, and there are 5 of those. The farmer also rows back alone twice, and those are crossings too.",
        zh: "你数的是船上带了东西的几趟，一共 5 趟。农夫还有两趟是空船划回来的，那也算过河。",
      },
    },
    {
      match: "lt:correct",
      feedback: {
        en: "That's too few. With fewer crossings, the goat always ends up alone with the wolf or the cabbage. Try it in the scene.",
        zh: "太少了。比这更少的话，羊总会和狼或白菜单独待在一起。在场景里试试。",
      },
    },
    {
      match: "gt:correct",
      feedback: {
        en: "That works, but there's a shorter way. Try bringing something back only once.",
        zh: "这样也能过河，但还有更短的办法。试试只往回带一次东西。",
      },
    },
  ],
  explanation: {
    en: "Take the goat over, come back alone, and take the wolf over. Bring the goat back, take the cabbage over, come back alone, and take the goat over. That's 7 crossings, and there is no shorter way, because the goat can never be left with the wolf or the cabbage.",
    zh: "先带羊过去，空船回来，再带狼过去。把羊带回来，带白菜过去，空船回来，最后再带羊过去。一共 7 次过河，没有更短的办法，因为羊不能和狼或白菜单独待在一起。",
  },
  aha: {
    en: "The key move is bringing the goat BACK. Sometimes going backwards is the way forward.",
    zh: "关键一步是把羊带回来。有时候往回走，才是在往前走。",
  },
  extension: {
    en: "Can you find a second way that also takes 7 crossings? What changes if the boat could carry two things besides the farmer?",
    zh: "你能找到另一种也是 7 次的过法吗？如果船上除了农夫还能放两样东西，会有什么不同？",
  },
  discussionPrompt: {
    en: "At which moment did you think of bringing the goat back? What were you trying before that?",
    zh: "你是在哪一步想到要把羊带回来的？在那之前你试过什么？",
  },
  solutionTags: ["simulate", "guess_check", "draw", "work_backwards"],
  funFact: {
    en: "This puzzle is more than 1,200 years old. It appears in a book of puzzles for young students from around the year 800, usually credited to the scholar Alcuin of York.",
    zh: "这道谜题已经有 1200 多年了。它出现在大约公元 800 年一本给年轻学生的趣题书里，一般认为编书的是英国学者阿尔昆。",
  },
  sortOrder: 1,
  rubricNotes:
    "18/20 — hook 2, guess 2, hands-on 2, aha 2, floor 2, ceiling 1, paths 1, wrong 2, hints 2, retell 2: one real path (try it in the scene); extensions stay close to the original puzzle",
};

/** F2. Three outcomes per weighing: 9 -> 3 -> 1, so 2 weighings (27 balls need 3). */
export const nineBallsBalance: HeroQuestionBlueprint = {
  slug: "nine-balls-balance",
  collection: "impossible-puzzles",
  kind: "PUZZLE",
  ageGroup: "AGE_10_12",
  difficulty: "MEDIUM",
  category: "LOGIC",
  title: { en: "Find the Heavy Ball", zh: "九个球里找重的" },
  hook: {
    en: "You have nine balls that look exactly the same, but one of them is a tiny bit heavier. You have a balance scale but no weights. How few times can you use the scale and still be sure to find the heavy one?",
    zh: "九个球看起来一模一样，可其中一个稍微重一点。你有一架天平，但是没有砝码。最少称几次，就一定能找出那个重球？",
  },
  guess: {
    type: "slider",
    min: 1,
    max: 8,
    step: 1,
    unit: { en: "weighings", zh: "次" },
  },
  scene: { type: "balance_lab", mode: "find_heavy", items: 9, seed: 5 },
  prompt: {
    en: "One of 9 balls is heavier. What is the fewest number of weighings that is guaranteed to find it, even if you are unlucky?",
    zh: "9 个球里有一个重球。最少称几次，就算运气最差，也一定能把它找出来？",
  },
  answer: { type: "NUMERIC", value: 2 },
  hints: [
    { en: "A weighing has three possible results, not two: left side down, right side down, or balanced. How could 'balanced' help you?", zh: "称一次有三种结果，不是两种：左边沉、右边沉、一样平。「一样平」能告诉你什么？" },
    { en: "Imagine just 3 balls. Put one on each pan and keep one off, then press \"Weigh\". Can one weighing always find the heavy ball, even if the scale balances?", zh: "先想象只有 3 个球。左右各放一个，留一个在外面，再按「称一称」。称一次能不能一定找出重球，就算天平是平的也行？" },
    { en: "Now split the 9 balls into three groups of 3. Weigh one group against another. Whichever way it goes, which group must hold the heavy ball?", zh: "现在把 9 个球分成三组，每组 3 个。拿两组上去称。不管结果怎样，重球一定在哪一组？" },
  ],
  wrongAnswers: [
    {
      match: "3",
      feedback: {
        en: "You split the balls in half each time: 4 against 4, then 2 against 2, then 1 against 1. That works, but splitting into THREE groups is faster, because 'balanced' tells you something too.",
        zh: "你每次都分成两半：4 对 4，再 2 对 2，再 1 对 1。这样能找到，可是分成三组更快，因为「一样平」也能告诉你答案在哪儿。",
      },
    },
    {
      match: "4",
      feedback: {
        en: "Comparing two balls at a time, an unlucky search takes 4 weighings. Try putting more balls on the scale at once.",
        zh: "一次比两个球，运气差的时候要称 4 次。试试一次多放几个球上去。",
      },
    },
    {
      match: "8",
      feedback: {
        en: "Checking the balls one by one could take 8 weighings. But you can put several balls on each pan and learn about all of them in one go.",
        zh: "一个一个地比，可能要称 8 次。可是你可以在每边一次放好几个球，一下子知道好多球的情况。",
      },
    },
    {
      match: "1",
      feedback: {
        en: "One weighing can find it if you're lucky, but the question says 'guaranteed'. With 9 balls, one weighing only narrows it down to a group of 3.",
        zh: "运气好的话称一次就能找到，可题目说的是「一定」。9 个球称一次，最多只能缩小到 3 个一组。",
      },
    },
    {
      match: "gt:correct",
      feedback: {
        en: "That works, but you can do it in fewer. Think about how to use all three results of a weighing.",
        zh: "这样能找到，但还能更少。想想怎么把称一次的三种结果都用上。",
      },
    },
  ],
  explanation: {
    en: "Split the 9 balls into three groups of 3 and weigh two groups against each other. If one side drops, the heavy ball is in that group; if they balance, it's in the group you left off. Then do the same with those 3 balls: one on each pan, one off. Two weighings always find it, and one can't, because one weighing only tells three groups apart.",
    zh: "把 9 个球分成三组，每组 3 个，拿两组上去称。哪边沉，重球就在哪组；一样平，就在没上秤的那组。再用同样的办法称这 3 个球：左右各一个，留一个。所以 2 次一定能找到，而 1 次只能分出是哪一组。",
  },
  aha: {
    en: "Every weighing has three answers, so each one can cut the suspects to a third: 9, then 3, then 1. That's why 2 weighings handle 9 balls and 3 weighings handle 27.",
    zh: "称一次有三种答案，所以每次都能把嫌疑球减到三分之一：9 个、3 个、1 个。所以称 2 次能管 9 个球，称 3 次能管 27 个。",
  },
  extension: {
    en: "How many weighings for 27 balls? For 100? A much harder one: 12 balls where one is different, but you don't know whether it's heavier or lighter.",
    zh: "27 个球要称几次？100 个呢？更难的一题：12 个球里有一个不一样，但你不知道它是重还是轻。",
  },
  discussionPrompt: {
    en: "On your first weighing, how many piles did you make, and why? Did anyone find a way to use the 'balanced' result?",
    zh: "第一次称的时候，你把球分成了几堆？为什么？有没有人用上了「一样平」这个结果？",
  },
  solutionTags: ["simulate", "guess_check", "work_backwards", "pattern"],
  funFact: {
    en: "Computers search a sorted list by cutting it in half again and again. A balance does even better: it cuts the choices into thirds.",
    zh: "电脑在排好序的名单里找东西，每次能把范围砍掉一半。天平更厉害，每次能把范围缩小到三分之一。",
  },
  sortOrder: 2,
  rubricNotes:
    "18/20 — hook 2, guess 2, hands-on 2, aha 2, floor 2, ceiling 2, paths 1, wrong 2, hints 2, retell 1: the halving strategy is the natural first try, and the three-group split is the only real path to 2",
  // balance_lab draws 3-27 balls. From 4 up the split into thirds still needs at least two weighings, so the copy holds.
  variants: defineVariants({
    standard: { balls: 9 },
    params: [{ balls: 4 }, { balls: 6 }, { balls: 18 }, { balls: 27 }],
    build: ({ balls: n }) => {
      const chain = thirdsChain(n);
      const w = chain.length - 1;
      const side = Math.ceil(n / 3);
      const off = n - 2 * side;
      const fewer = w - 1;
      const fewerMax = 3 ** fewer;
      const pans = off > 0
        ? { en: `${side} on the left pan, ${side} on the right and ${off} kept off`, zh: `左盘 ${side} 个、右盘 ${side} 个、留 ${off} 个在外面` }
        : { en: `${side} on each pan`, zh: `左右各放 ${side} 个` };
      const outcome = off > 0
        ? { en: "If one side drops, the heavy ball is there; if they balance, it's among the balls kept off.", zh: "哪边沉，重球就在哪边；一样平，就在没上秤的球里。" }
        : { en: "The side that drops holds the heavy ball.", zh: "哪边沉，重球就在哪边。" };
      const plural = (k: number) => (k === 1 ? "weighing" : "weighings");
      return {
        prompt: {
          en: `One of ${n} balls is heavier. What is the fewest number of weighings that is guaranteed to find it, even if you are unlucky?`,
          zh: `${n} 个球里有一个重球。最少称几次，就算运气最差，也一定能把它找出来？`,
        },
        scene: { type: "balance_lab", mode: "find_heavy", items: n, seed: 5 },
        answer: { type: "NUMERIC", value: w },
        hints: [
          { en: `A weighing has three possible results: left side down, right side down, or balanced. With ${n} balls, how can each result point to a different group?`, zh: `称一次有三种结果：左边沉、右边沉、一样平。${n} 个球的时候，怎么让每种结果各指向一组球？` },
          { en: `Put ${pans.en}, then press "Weigh". Whatever happens, how many balls could still be the heavy one?`, zh: `${pans.zh}，再按「称一称」。不管结果怎样，还有几个球可能是重球？` },
          { en: `Each weighing leaves at most a third of the suspects, rounded up: ${chain.join(" → ")}. Count the arrows.`, zh: `每称一次，嫌疑球最多剩下三分之一（不够就往上取整）：${chain.join(" → ")}。数一数有几个箭头。` },
        ],
        wrongAnswers: distinctRules(
          [
            { match: String(Math.ceil(Math.log2(n) - 1e-9)), feedback: { en: `That's splitting the balls in half each time. It works, but THREE groups are faster, because "balanced" tells you something too.`, zh: `这是每次都分成两半。能找到，可是分成三组更快，因为「一样平」也能告诉你答案在哪儿。` } },
            { match: String(Math.floor(n / 2)), feedback: { en: `Comparing two balls at a time, an unlucky search takes ${Math.floor(n / 2)} weighings. Put more balls on the scale at once.`, zh: `一次比两个球，运气差的时候要称 ${Math.floor(n / 2)} 次。试试一次多放几个球上去。` } },
            { match: String(n - 1), feedback: { en: `Checking the balls one by one could take ${n - 1} weighings. Put several balls on each pan and learn about all of them in one go.`, zh: `一个一个地比，可能要称 ${n - 1} 次。每边一次放好几个球，一下子就知道好多球的情况。` } },
            { match: "gt:correct", feedback: { en: "That works, but you can do it in fewer. Use all three results of every weighing.", zh: "这样能找到，但还能更少。把每次称的三种结果都用上。" } },
            { match: "lt:correct", feedback: { en: `You might get lucky, but the question says "guaranteed". Each weighing can only tell three groups apart.`, zh: "运气好也许能行，可题目说的是「一定」。称一次最多只能分出三组。" } },
          ],
          w
        ),
        explanation: {
          en: `Weigh with ${pans.en}. ${outcome.en} Each weighing shrinks the suspects like this: ${chain.join(" → ")}, so ${w} ${plural(w)} always find it. ${fewer} ${plural(fewer)} can't, because ${fewer} ${plural(fewer)} can tell apart at most ${fewerMax} balls.`,
          zh: `称的时候${pans.zh}。${outcome.zh}每称一次，嫌疑球这样变少：${chain.join(" → ")}，所以 ${w} 次一定能找到。${fewer} 次不够，因为 ${fewer} 次最多只能分辨 ${fewerMax} 个球。`,
        },
        aha: {
          en: `Three answers per weighing means each one cuts the suspects to a third: ${chain.join(", ")}. ${w} ${plural(w)} can handle up to ${3 ** w} balls.`,
          zh: `称一次有三种答案，所以每次都把嫌疑球减到三分之一：${chain.join("、")}。称 ${w} 次最多能管 ${3 ** w} 个球。`,
        },
      };
    },
  }),
};

/** F3. Illustration until the T3 `switch_room` scene lands (待替换为 switch_room). The guess is the question. */
export const threeSwitches: HeroQuestionBlueprint = {
  slug: "three-switches",
  collection: "impossible-puzzles",
  kind: "PUZZLE",
  ageGroup: "AGE_10_12",
  difficulty: "MEDIUM",
  category: "LOGIC",
  title: { en: "Three Switches, One Bulb", zh: "三个开关一盏灯" },
  hook: {
    en: "Downstairs there are three light switches, and only one of them works the lamp upstairs, which you can't see from down there. You're allowed to walk upstairs just once. Can you work out which switch it is?",
    zh: "楼下有三个开关，只有一个控制楼上的灯，在楼下看不见那盏灯。你只能上楼一次。你能确定是哪个开关吗？",
  },
  guess: {
    type: "choice",
    options: [
      { id: "impossible", en: "No, you'd have to go up at least twice", zh: "不可能，至少要上楼两次" },
      { id: "other-sense", en: "Yes, but you need more than your eyes", zh: "可以，但要用眼睛以外的办法" },
      { id: "positions", en: "Yes, just look at which way the switches point", zh: "可以，看开关的位置就行" },
    ],
  },
  scene: {
    type: "illustration",
    asset: "three-switches",
    caption: { en: "Three switches downstairs, one bulb upstairs. You may go up only once.", zh: "楼下三个开关，楼上一盏灯。你只能上楼一次。" },
    revealCaption: {
      en: "Switch 1 on for ten minutes, then off; switch 2 on. Upstairs: lit = 2, dark but warm = 1, dark and cold = 3.",
      zh: "1 号开十分钟再关，然后开 2 号。上楼：亮着是 2 号，不亮但温热是 1 号，不亮也凉是 3 号。",
    },
  },
  prompt: {
    en: "You can flip the switches as often as you like, but you can go upstairs only once. Is there a way to be sure which switch controls the bulb?",
    zh: "开关想怎么拨都行，但只能上楼一次。有没有办法确定是哪个开关控制这盏灯？",
  },
  answer: { type: "CHOICE", correctId: "other-sense" },
  hints: [
    { en: "If you only use your eyes, one visit tells you on or off: two answers, but there are three switches. You need a third kind of clue.", zh: "只用眼睛的话，上楼一次只能看到亮或不亮，只有两种答案，可是有三个开关。你需要第三种线索。" },
    { en: "What does an old-style light bulb do when it has been on for a while, besides giving light?", zh: "一个老式灯泡开了一会儿以后，除了发光，还会怎么样？" },
    { en: "Turn one switch on for ten minutes, then off. Turn a second switch on and go upstairs. What could you check, besides whether the bulb is lit?", zh: "先把一个开关打开十分钟，再关掉。然后打开第二个开关，上楼。除了看灯亮不亮，你还能检查什么？" },
  ],
  wrongAnswers: [
    {
      match: "choice:impossible",
      feedback: {
        en: "With eyes alone, you're right: one look gives only two answers, on or off. But a bulb can tell you something else. Think about what happens to it after it has been on for a while.",
        zh: "如果只靠眼睛，你说得对：看一眼只有亮和不亮两种答案。可是灯泡还能告诉你别的事。想想它开了一会儿以后会怎样。",
      },
    },
    {
      match: "choice:positions",
      feedback: {
        en: "Up or down only shows how a switch is set, not which lamp it's wired to. You still need a clue from upstairs.",
        zh: "开关朝上朝下只说明它现在是开是关，说明不了它连着哪盏灯。你还是需要楼上的线索。",
      },
    },
  ],
  explanation: {
    en: "Turn switch 1 on for ten minutes, then turn it off and turn switch 2 on. Go upstairs. If the bulb is lit, it's switch 2; if it's off but warm, it's switch 1; if it's off and cold, it's switch 3. Careful: a bulb that has been on can be hot, so hold your hand near it before you touch it.",
    zh: "先打开 1 号开关十分钟，然后关掉它，再打开 2 号开关，上楼。灯亮着，就是 2 号；灯不亮但是热的，就是 1 号；不亮也不热，就是 3 号。小心别烫着：先把手靠近灯泡感觉一下，再去摸。",
  },
  aha: {
    en: "Light isn't the only clue a bulb gives you: it also gets warm. Using a second sense turns two possible answers into three.",
    zh: "灯泡给你的线索不只有光，它还会发热。多用一种感觉，两种答案就变成了三种。",
  },
  extension: {
    en: "What if there are four switches and you can still go up only once? (Hint: a bulb can be hot, warm or cold.)",
    zh: "如果有四个开关，还是只能上楼一次呢？（提示：灯泡可以是烫的、温的，或者凉的。）",
  },
  discussionPrompt: {
    en: "Would this trick work with an LED bulb that hardly warms up? Can you think of a different clue you could use instead?",
    zh: "如果是几乎不发热的 LED 灯泡，这个办法还管用吗？你能想出别的线索来代替吗？",
  },
  solutionTags: ["other", "guess_check"],
  funFact: {
    en: "Old-style bulbs turn most of their electricity into heat instead of light. That's why they got so hot, and why LED bulbs, which waste much less, have mostly replaced them.",
    zh: "老式灯泡把大部分电都变成了热，而不是光。所以它们会发烫；也正因为这样，省电得多的 LED 灯泡几乎把它们都取代了。",
  },
  sortOrder: 3,
  rubricNotes:
    "17/20 — hook 2, guess 2, hands-on 1, aha 2, floor 2, ceiling 1, paths 1, wrong 2, hints 2, retell 2: illustration only (待替换为 switch_room); one lateral-thinking path; great one to try on parents",
};

/**
 * F8. Illustration until the T3 `dialogue_cards` scene lands (待替换为 dialogue_cards). The guess is
 * the question. A table of the four knight/knave cases is the second path (hint 1).
 * Extension answer ("at least one of us is a knave"): A is a knight and B is a knave.
 */
export const knightsAndKnaves: HeroQuestionBlueprint = {
  slug: "knights-and-knaves",
  collection: "impossible-puzzles",
  kind: "PUZZLE",
  ageGroup: "AGE_10_12",
  difficulty: "MEDIUM",
  category: "LOGIC",
  title: { en: "Knights and Knaves", zh: "骑士与骗子" },
  hook: {
    en: "On a strange island, knights always tell the truth, knaves always lie, and you can't tell them apart by looking. Two islanders, A and B, stand on the path to the treasure, and A grins: \"We are both knaves.\" B says nothing at all, so can you still work out who is who?",
    zh: "在一座奇怪的岛上，骑士永远说真话，骗子永远说假话，光看样子分不出来。两个岛民 A 和 B 挡在去宝藏的路上，A 笑着说：「我们两个都是骗子。」B 一句话也不说。你能分出谁是谁吗？",
  },
  guess: {
    type: "choice",
    options: [
      { id: "both-knaves", en: "Both are knaves", zh: "两个都是骗子" },
      { id: "a-knave-b-knight", en: "A is a knave, B is a knight", zh: "A 是骗子，B 是骑士" },
      { id: "a-knight-b-knave", en: "A is a knight, B is a knave", zh: "A 是骑士，B 是骗子" },
      { id: "cannot-tell", en: "There's no way to tell", zh: "没法判断" },
    ],
  },
  scene: {
    type: "illustration",
    asset: "knights-and-knaves",
    caption: { en: "A says: “We are both knaves.”", zh: "A 说：「我们两个都是骗子。」" },
    revealCaption: {
      en: "A knight would never say it, so A is a knave and the sentence is false: B must be a knight.",
      zh: "骑士不会说这句话，所以 A 是骗子，这句话是假的：B 一定是骑士。",
    },
  },
  prompt: {
    en: "Every islander is either a knight or a knave. A says: \"We are both knaves.\" What is A, and what is B?",
    zh: "每个岛民不是骑士就是骗子。A 说：「我们两个都是骗子。」A 是什么人？B 呢？",
  },
  answer: { type: "CHOICE", correctId: "a-knave-b-knight" },
  hints: [
    { en: "There are only four possibilities: knight-knight, knight-knave, knave-knight, knave-knave. Make a little table and test each one: is A's sentence true or false, and is A allowed to say it?", zh: "一共只有四种可能：骑士-骑士、骑士-骗子、骗子-骑士、骗子-骗子。列个小表，一种一种地试：A 这句话是真是假？A 能说这句话吗？" },
    { en: "Shortcut: a knight could never say \"I am a knave\", because that would be a lie. So what must A be?", zh: "捷径：骑士不可能说「我是骗子」，因为那是假话。那 A 一定是什么人？" },
    { en: "A is a knave, so \"we are both knaves\" is false. A really is a knave, yet the sentence is still false. What does that tell you about B?", zh: "A 是骗子，所以「我们两个都是骗子」是假的。A 确实是骗子，这句话却还是假的，那 B 是什么人？" },
  ],
  wrongAnswers: [
    {
      match: "choice:both-knaves",
      feedback: {
        en: "That's what A says, but A's words can't be trusted. If both really were knaves, A's sentence would be true, and a knave can't say something true.",
        zh: "这是 A 说的，可 A 的话不能信。如果真的两个都是骗子，A 这句话就是真话了，而骗子不会说真话。",
      },
    },
    {
      match: "choice:a-knight-b-knave",
      feedback: {
        en: "A knight always tells the truth, so a knight would never call himself a knave. A can't be a knight.",
        zh: "骑士永远说真话，他不会说自己是骗子。所以 A 不可能是骑士。",
      },
    },
    {
      match: "choice:cannot-tell",
      feedback: {
        en: "B never says a word, so it seems we can't know. But A's lie gives B away: test each of the four cases and see which one doesn't break the rules.",
        zh: "B 一句话都没说，好像没法知道。可是 A 的假话把 B 出卖了：把四种情况都试一遍，看看哪种不违反规则。",
      },
    },
  ],
  explanation: {
    en: "If A were a knight, his sentence would be true, which would make him a knave, so that's impossible. So A is a knave, and his sentence \"we are both knaves\" must be false. Since A really is a knave, the only way it can be false is if B is not a knave. So B is a knight.",
    zh: "如果 A 是骑士，他说的就是真话，那他就成了骗子，自相矛盾。所以 A 是骗子，「我们两个都是骗子」这句话是假的。A 确实是骗子，这句话要是假的，B 就不能是骗子。所以 B 是骑士。",
  },
  aha: {
    en: "A knight can never say \"I am a knave\", so that one sentence unmasks A. And a lie still carries information: B kept quiet, yet A's lie told you exactly what B is.",
    zh: "骑士绝不会说「我是骗子」，所以这一句话就暴露了 A。假话也藏着信息：B 一声没吭，A 的假话却把 B 的身份说得清清楚楚。",
  },
  extension: {
    en: "What if A says instead: \"At least one of us is a knave\"? What are A and B now?",
    zh: "如果 A 改口说：「我们两个里至少有一个是骗子。」那 A 和 B 各是什么人？",
  },
  discussionPrompt: {
    en: "Make up one sentence that lets a listener know for sure that the speaker is a knight. Is it harder than it sounds? Test someone else's sentence.",
    zh: "编一句话，让听的人能确定说话的人是骑士。这比听起来难吗？试试别人编的那一句。",
  },
  solutionTags: ["guess_check", "work_backwards", "table"],
  funFact: {
    en: "Knights and knaves puzzles were made famous by Raymond Smullyan, a mathematician and magician who wrote whole books of them.",
    zh: "「骑士与骗子」谜题是因为数学家雷蒙德·斯穆里安才出名的。他还是个魔术师，写了好几本这样的谜题书。",
  },
  sortOrder: 8,
  rubricNotes:
    "17/20 — hook 2, guess 2, hands-on 1, aha 2, floor 2, ceiling 2, paths 2, wrong 2, hints 1, retell 1: illustration only (待替换为 dialogue_cards); the four-case table and the 'a knight can't call himself a knave' shortcut are two real paths; hint 3 nearly gives the last step; self-reference still trips up some kids",
};

/**
 * F4. Illustration until the T3 `bridge_torch` scene lands (待替换为 bridge_torch). Kids act it out
 * with four paper slips and a coin as the torch (hint 1). Brute force over every plan: 17 is optimal;
 * the extension (1, 2, 5, 10, 15) is 28.
 */
export const bridgeAndTorch: HeroQuestionBlueprint = {
  slug: "bridge-and-torch",
  collection: "impossible-puzzles",
  kind: "PUZZLE",
  ageGroup: "AGE_12_14",
  difficulty: "HARD",
  category: "LOGIC",
  title: { en: "The Midnight Bridge", zh: "半夜过吊桥" },
  hook: {
    en: "Four friends reach a rickety rope bridge in the middle of the night, with just one torch between them. The bridge holds two people at a time, nobody may cross without the torch, and a pair walks at the slower one's speed. Alone they take 1, 2, 5 and 10 minutes to cross, so how fast can all four get over?",
    zh: "半夜，四个朋友走到一座摇摇晃晃的吊桥前，他们只有一支手电。桥上一次最多走两个人，过桥必须带着手电，两个人一起走时要按慢的那个人的速度。他们单独过桥分别要 1、2、5、10 分钟，四个人全部过去，最快要几分钟？",
  },
  guess: {
    type: "slider",
    min: 15,
    max: 30,
    step: 1,
    unit: { en: "minutes", zh: "分钟" },
  },
  scene: {
    type: "illustration",
    asset: "bridge-and-torch",
    caption: {
      en: "The shirts show how many minutes each friend needs: 10, 5, 2 and 1. Friend 1 holds the only torch.",
      zh: "衣服上的数是每个人过桥要的分钟数：10、5、2、1。1 号拿着唯一的手电。",
    },
    revealAsset: "bridge-and-torch-reveal",
    revealCaption: {
      en: "Send the two slowest together: 1 and 2 cross, 1 comes back, 5 and 10 cross, 2 comes back, 1 and 2 cross. 2 + 1 + 10 + 2 + 2 = 17.",
      zh: "让最慢的两个人一起走：1 和 2 过去，1 回来，5 和 10 过去，2 回来，1 和 2 再过去。2 + 1 + 10 + 2 + 2 = 17。",
    },
  },
  prompt: {
    en: "After every crossing except the last, somebody has to carry the torch back. How many minutes, at the very least, until all four friends are across?",
    zh: "除了最后一趟，每次过桥以后都得有人把手电送回来。四个人全部过桥，最少要几分钟？",
  },
  answer: { type: "NUMERIC", value: 17 },
  hints: [
    {
      en: "Act it out: write 1, 2, 5 and 10 on four slips of paper and use a coin as the torch. Try the obvious plan first: the fastest friend walks each of the others over and comes back. How long does that take?",
      zh: "动手演一演：在四张小纸条上写 1、2、5、10，再拿一枚硬币当手电。先试最直接的办法：最快的人陪每个人过去，再自己回来。一共要多久？",
    },
    {
      en: "That plan takes 19 minutes, and the 5 and the 10 each make a slow trip of their own. What if the two slowest friends crossed together?",
      zh: "那个办法要 19 分钟，而且 5 和 10 各自走了一趟慢的。如果让最慢的两个人一起过桥呢？",
    },
    {
      en: "If 5 and 10 cross together, someone fast must already be waiting on the far side to bring the torch back. So send 1 and 2 over first, and 1 brings the torch back. Finish the plan and add up the minutes.",
      zh: "如果 5 和 10 一起过去，对岸得先有一个跑得快的人，好把手电送回来。所以先让 1 和 2 过去，1 拿着手电回来。接下来怎么走？把分钟数加起来。",
    },
  ],
  wrongAnswers: [
    {
      match: "19",
      feedback: {
        en: "That's the plan where the fastest friend walks everyone over: 10 + 1 + 5 + 1 + 2. It works, but the 5 and the 10 each pay for a slow trip. Could they share one?",
        zh: "这是让最快的人一个个护送的办法：10 + 1 + 5 + 1 + 2。能过去，但 5 和 10 各走了一趟慢的。能不能让他们俩合成一趟？",
      },
    },
    {
      match: "18",
      feedback: {
        en: "You added everyone's time once: 1 + 2 + 5 + 10. But only two can cross at a time, and somebody has to bring the torch back after each trip.",
        zh: "你把每个人的时间各加了一次：1 + 2 + 5 + 10。可是一次只能过两个人，每趟之后还得有人把手电送回来。",
      },
    },
    {
      match: "10",
      feedback: {
        en: "Ten minutes is just the slowest friend's own trip. The others need the torch as well, and it has to come back across the bridge.",
        zh: "10 分钟只是最慢那个人自己走一趟。其他人也要用手电，手电还得被送回来。",
      },
    },
    {
      match: "lt:correct",
      feedback: {
        en: "That's faster than any plan can be. Act it out with the paper slips and check that the torch is always with whoever is walking.",
        zh: "没有哪种走法能这么快。用纸条演一遍，检查手电是不是总在过桥的人手里。",
      },
    },
    {
      match: "gt:correct",
      feedback: {
        en: "That gets everyone across, but there's a quicker plan. Try letting the two slowest friends walk together.",
        zh: "这样大家都能过去，但还有更快的走法。试试让最慢的两个人一起走。",
      },
    },
  ],
  explanation: {
    en: "First 1 and 2 cross (2 minutes) and 1 brings the torch back (1). Then 5 and 10 cross together (10) and 2 brings the torch back (2). Finally 1 and 2 cross again (2): 2 + 1 + 10 + 2 + 2 = 17 minutes. Letting the fastest friend escort everyone takes 19, because the 5 and the 10 each need a slow trip of their own.",
    zh: "先让 1 和 2 过桥（2 分钟），1 拿着手电回来（1 分钟）。再让 5 和 10 一起过桥（10 分钟），2 拿着手电回来（2 分钟）。最后 1 和 2 一起过去（2 分钟）：2 + 1 + 10 + 2 + 2 = 17 分钟。让最快的人一个个护送要 19 分钟，因为 5 和 10 各自走了一趟慢的。",
  },
  aha: {
    en: "Send the two slowest across together, and the 5-minute walk hides inside the 10-minute one. Sending the fastest friend back every time feels smart, but it costs two extra minutes.",
    zh: "让最慢的两个人一起走，5 分钟那一趟就「藏」进了 10 分钟里。每次都让最快的人回来看起来很聪明，其实多花了 2 分钟。",
  },
  extension: {
    en: "A fifth friend who needs 15 minutes joins them, so the times are 1, 2, 5, 10 and 15. What's the fastest now? Is \"the two slowest together\" still the best move?",
    zh: "又来了第五个朋友，过桥要 15 分钟，现在是 1、2、5、10、15。最快要几分钟？「最慢的两个人一起走」还是最好的办法吗？",
  },
  discussionPrompt: {
    en: "When did the idea of sending the two slowest friends together pop into your head? What made you try it?",
    zh: "「让最慢的两个人一起走」这个想法是什么时候冒出来的？是什么让你想去试它？",
  },
  solutionTags: ["simulate", "guess_check", "table", "work_backwards"],
  funFact: {
    en: "The trick doesn't always win. With times of 1, 20, 21 and 22 minutes, the fastest friend escorting everyone takes 65 minutes, while sending the two slowest together takes 83.",
    zh: "这个窍门并不总是最好。如果四个人要 1、20、21、22 分钟，让最快的人一个个护送要 65 分钟，让最慢的两个人一起走反而要 83 分钟。",
  },
  sortOrder: 4,
  rubricNotes:
    "18/20 — hook 2, guess 2, hands-on 1, aha 2, floor 2, ceiling 2, paths 1, wrong 2, hints 2, retell 2: illustration only (待替换为 bridge_torch), acted out with paper slips; the escort plan (19) is the natural trap and the feedback names it; one real path (try plans), the fun fact shows the trick isn't universal",
};

/**
 * F5. EXPRESSION answer judged by @gmq/math-engine's evaluator. The scene and the answer allow the
 * same ops (no ^); every listed solution is re-evaluated by validate.ts. Concat glues adjacent
 * 4 tiles into 44, and each digit counts as one 4. All of 0-20 are makeable with these ops.
 */
export const fourFours: HeroQuestionBlueprint = {
  slug: "four-fours",
  collection: "impossible-puzzles",
  kind: "OPEN_MIDDLE",
  ageGroup: "AGE_10_12",
  difficulty: "MEDIUM",
  category: "ARITHMETIC",
  title: { en: "The Four Fours Challenge", zh: "四个 4 的挑战" },
  hook: {
    en: "A broken calculator has only one working number key, the four, and it dies after you press it four times. You still have + − × ÷, brackets, √ and !, and you may glue two 4s into 44. Can you make it show 7, and in how many different ways?",
    zh: "一台坏掉的计算器只剩一个数字键能用：4，而且按满四次就彻底坏了。加减乘除、括号、√ 和 ! 都还能用，两个 4 还可以拼成 44。你能让它显示 7 吗，有几种不同的按法？",
  },
  guess: {
    type: "choice",
    options: [
      { id: "none", en: "There's no way", zh: "根本凑不出来" },
      { id: "one", en: "Exactly one clever way", zh: "只有一种巧妙的写法" },
      { id: "few", en: "Two or three ways", zh: "两三种写法" },
      { id: "many", en: "Lots of different ways", zh: "很多种写法" },
    ],
  },
  scene: {
    type: "expression_builder",
    allowedNumbers: [4, 4, 4, 4],
    target: 7,
    allowedOps: ["+", "-", "*", "/", "sqrt", "!", "concat"],
    solutions: ["44/4-4", "4+4-4/4", "4!/4+4/4", "4+4!/(4+4)"],
  },
  prompt: {
    en: "Using exactly four 4s and any of + − × ÷, brackets, √, ! and 44, how can you make 7?",
    zh: "正好用四个 4，可以用加减乘除、括号、√、! 和 44，怎样凑出 7？",
  },
  answer: {
    type: "EXPRESSION",
    target: 7,
    allowedNumbers: [4, 4, 4, 4],
    allowedOps: ["+", "-", "*", "/", "sqrt", "!", "concat"],
  },
  hints: [
    {
      en: "Don't hunt for 7 straight away. First see which small numbers two 4s can make: 4 ÷ 4, 4 − 4, 4 + 4, √4. Tap the tiles in the scene and watch the value change.",
      zh: "别急着直接找 7。先看看两个 4 能凑出哪些小数：4 ÷ 4、4 − 4、4 + 4、√4。在场景里点方块，看算出来的值怎么变。",
    },
    {
      en: "4 + 4 makes 8, just one too many. Which pair of 4s makes exactly 1?",
      zh: "4 + 4 = 8，只多了 1。哪两个 4 能凑出正好 1？",
    },
    {
      en: "There's another road too: tap two 4 tiles in a row to make 44. What is 44 ÷ 4? Then use the last 4 to get from there down to 7.",
      zh: "还有另一条路：连着点两个 4，拼成 44。44 ÷ 4 是多少？再用最后一个 4 把它变成 7。",
    },
  ],
  wrongAnswers: [
    {
      match: "regex:[0-35-9]",
      feedback: {
        en: "Only the digit 4 works on this calculator, so numbers like 1, 2 or 8 have to be built out of 4s. For example, 4 ÷ 4 makes 1.",
        zh: "这台计算器只有 4 这个数字键，所以 1、2、8 这样的数都得用 4 拼出来。比如 4 ÷ 4 就是 1。",
      },
    },
    {
      match: "regex:^[^4]*(?:4[^4]*){5,}$",
      feedback: {
        en: "Count your 4s: there are more than four (44 counts as two). Which part of your expression could do the same job with fewer 4s?",
        zh: "数一数你的 4：超过四个了（44 算两个 4）。算式里哪一部分能用更少的 4 做到同样的事？",
      },
    },
    {
      match: "regex:^[^4]*(?:4[^4]*){0,3}$",
      feedback: {
        en: "Count your 4s: there are fewer than four (44 counts as two). The calculator needs all four presses, so find a way to put the missing 4 to work.",
        zh: "数一数你的 4：不到四个（44 算两个 4）。四次都得按，想办法让缺的那个 4 也派上用场。",
      },
    },
    {
      match: "gt:correct",
      feedback: {
        en: "Your expression comes out bigger than 7. Find the part that's too big: could a + become a −, or could you divide by a 4 instead of adding it?",
        zh: "你的算式比 7 大。找找哪一部分太大了：能不能把一个 + 换成 −，或者把加上的 4 改成除以 4？",
      },
    },
    {
      match: "lt:correct",
      feedback: {
        en: "Your expression comes out smaller than 7. Try starting from 4 + 4, which is 8, and taking a little bit off.",
        zh: "你的算式比 7 小。试试从 4 + 4 = 8 出发，再减掉一点点。",
      },
    },
  ],
  explanation: {
    en: "One way: 44 ÷ 4 = 11, and 11 − 4 = 7. Another: 4 + 4 = 8 and 4 ÷ 4 = 1, so 4 + 4 − 4 ÷ 4 = 7. Factorials give a third, because 4!, four factorial, is 24, and 24 ÷ 4 + 4 ÷ 4 = 6 + 1 = 7.",
    zh: "一种写法：44 ÷ 4 = 11，11 − 4 = 7。另一种：4 + 4 = 8，4 ÷ 4 = 1，所以 4 + 4 − 4 ÷ 4 = 7。还可以用阶乘：4! 是 24，24 ÷ 4 + 4 ÷ 4 = 6 + 1 = 7。",
  },
  aha: {
    en: "Seven has many disguises: 44 ÷ 4 − 4 and 4 + 4 − 4 ÷ 4 look nothing alike, yet both are 7. Finding one way is a puzzle; finding a different one is the real game.",
    zh: "7 有很多种样子：44 ÷ 4 − 4 和 4 + 4 − 4 ÷ 4 看起来毫不相干，却都等于 7。找到一种是解题，再找到一种不一样的才是真正的游戏。",
  },
  extension: {
    en: "Make every number from 0 to 10 with four 4s. Which one was the hardest to make? Can you keep going all the way to 20?",
    zh: "用四个 4 凑出 0 到 10 的每一个数。哪个最难？你能一直做到 20 吗？",
  },
  discussionPrompt: {
    en: "Post your favourite way to make 7. Did anyone else find the same one? Which way would you show a younger kid first, and why?",
    zh: "贴出你最喜欢的凑 7 的算式。有没有人和你找到的一样？你会先给比你小的孩子看哪一种？为什么？",
  },
  solutionTags: ["guess_check", "work_backwards", "pattern"],
  funFact: {
    en: "The four fours puzzle has appeared in puzzle books for well over a hundred years. With square roots, factorials and 44 allowed, every number from 0 to 20 can be made, so try it yourself.",
    zh: "「四个 4」这道题在趣题书里已经出现了一百多年。只要能用 √、! 和 44，从 0 到 20 的每个数都能凑出来，你可以自己验证一下。",
  },
  sortOrder: 5,
  rubricNotes:
    "17/20 — hook 2, guess 1, hands-on 2, aha 1, floor 2, ceiling 2, paths 2, wrong 2, hints 2, retell 1: the guess (how many ways?) is only a mild surprise and the aha is 'many disguises' rather than hidden structure; rules catch the wrong count of 4s, other digits, and too big / too small",
};

/**
 * F6. Answered as NUMERIC 6 (fewest steps) rather than SCENE_COMPLETION, like F1: the scene counts
 * every fill, empty and pour and reports `completed { steps, fewest }`. Starting with the 3 L jug
 * takes 8 steps (feedback rule "8").
 */
export const waterJugs: HeroQuestionBlueprint = {
  slug: "water-jugs",
  collection: "impossible-puzzles",
  kind: "PUZZLE",
  ageGroup: "AGE_10_12",
  difficulty: "MEDIUM",
  category: "NUMBER_THEORY",
  title: { en: "The Giant's Four Litres", zh: "给巨人量 4 升水" },
  hook: {
    en: "A giant will only let you past if you bring him exactly four litres of water. You have a tap, a three-litre jug and a five-litre jug, and neither jug has any markings on it. How can you measure exactly four litres, and in how few steps?",
    zh: "巨人说，只有给他正好 4 升水，才放你过去。你有一个水龙头、一个 3 升的壶和一个 5 升的壶，壶上都没有刻度。怎么量出正好 4 升，最少要几步？",
  },
  guess: {
    type: "slider",
    min: 2,
    max: 12,
    step: 1,
    unit: { en: "steps", zh: "步" },
  },
  scene: { type: "water_jugs", jugs: [3, 5], target: 4, minSteps: 6 },
  prompt: {
    en: "Filling a jug from the tap, emptying a jug, or pouring one jug into the other each counts as one step. How few steps can leave exactly 4 litres in a jug?",
    zh: "从水龙头装满一个壶、倒空一个壶、把一个壶倒进另一个壶，每一下都算一步。最少几步，能让一个壶里正好有 4 升水？",
  },
  answer: { type: "NUMERIC", value: 6 },
  hints: [
    {
      en: "The small jug can't hold 4 litres, so the 4 litres have to end up in the big jug. Press \"Fill 5 L\" and think about what could come next.",
      zh: "3 升的壶装不下 4 升，所以最后那 4 升一定在 5 升的壶里。先点「装满 5 升」，再想想下一步能做什么。",
    },
    {
      en: "Press \"Pour 5 → 3\": 2 litres stay behind in the big jug. Now press \"Empty 3 L\" and pour those 2 litres into the small jug to keep them safe.",
      zh: "点「5 倒入 3」：大壶里剩下 2 升。再点「倒空 3 升」，把这 2 升倒进小壶里存着。",
    },
    {
      en: "With 2 litres waiting in the small jug, it has room for just 1 more litre. Fill the big jug again and pour into the small one until it's full. What's left in the big jug?",
      zh: "小壶里已经有 2 升，只能再装 1 升。再把大壶装满，往小壶里倒，倒满为止。大壶里还剩多少？",
    },
  ],
  wrongAnswers: [
    {
      match: "8",
      feedback: {
        en: "You started by filling the 3-litre jug. That way works too, but it takes 8 steps. Try starting with the 5-litre jug instead.",
        zh: "你是先装满 3 升壶的。这样也能量出来，但要 8 步。换成先装满 5 升壶试试。",
      },
    },
    {
      match: "3",
      feedback: {
        en: "Three is the number of pours from one jug into the other. Filling a jug and emptying a jug count as steps too.",
        zh: "3 是两个壶之间互相倒的次数。装满一个壶、倒空一个壶，也都算一步。",
      },
    },
    {
      match: "lt:correct",
      feedback: {
        en: "That's fewer steps than anyone can manage. Try it in the scene: each step can only fill, empty or pour once, and 4 litres take a little juggling.",
        zh: "没有人能用这么少的步数。在场景里试试：每一步只能装满、倒空或倒一次，量出 4 升得来回倒几下。",
      },
    },
    {
      match: "gt:correct",
      feedback: {
        en: "You got 4 litres, which is great, but there's a shorter way. Count your steps again, or try starting with the other jug.",
        zh: "你量出了 4 升，很好，但还有更短的办法。再数一遍步数，或者换另一个壶先装。",
      },
    },
  ],
  explanation: {
    en: "Fill the 5, pour it into the 3 (2 litres stay in the 5), empty the 3, and pour the 2 litres into it. Fill the 5 again and top up the 3, which takes just 1 litre, so 4 litres are left in the 5. That's 6 steps. Starting with the 3-litre jug also works, but it needs 8.",
    zh: "装满 5 升壶，倒进 3 升壶（5 升壶里剩 2 升），倒空 3 升壶，再把这 2 升倒进去。再装满 5 升壶，往 3 升壶里倒满，只倒得进 1 升，5 升壶里就剩 4 升。一共 6 步。先装 3 升壶也能量出来，但要 8 步。",
  },
  aha: {
    en: "Every litre comes from the tap or goes down the drain, so you're really adding and taking away 5s and 3s: 5 + 5 − 3 − 3 = 4. Because 3s and 5s can make 1, they can make every amount up to 5 litres.",
    zh: "每一升水不是从水龙头来，就是倒掉了，所以其实是在加减 5 和 3：5 + 5 − 3 − 3 = 4。3 和 5 能凑出 1，所以 5 升以内的每个量都能量出来。",
  },
  extension: {
    en: "Can you measure 1, 2, 3 and 5 litres with the same two jugs? With a 4-litre and a 6-litre jug, can you ever measure 5 litres? Why or why not?",
    zh: "用这两个壶，能量出 1、2、3、5 升吗？如果换成 4 升壶和 6 升壶，能量出 5 升吗？为什么？",
  },
  discussionPrompt: {
    en: "How many steps did your first try take? Did anyone beat 6? If nobody did, how could you convince someone that 6 is the fewest?",
    zh: "你第一次用了几步？有人少于 6 步吗？如果没有，你怎么让别人相信 6 步就是最少的？",
  },
  solutionTags: ["simulate", "guess_check", "work_backwards", "algebra"],
  funFact: {
    en: "Jugs of 6 and 9 litres only ever hold multiples of 3 litres. No amount of pouring will ever give you 4 litres with them.",
    zh: "6 升和 9 升的两个壶里，水永远是 3 升的倍数。不管怎么倒，都量不出 4 升。",
  },
  sortOrder: 6,
  rubricNotes:
    "18/20 — hook 2, guess 2, hands-on 2, aha 2, floor 2, ceiling 2, paths 1, wrong 2, hints 2, retell 1: the scene is the puzzle and asks 'can you do it in fewer?' until the reveal shows the shortest route; trial is the main path (the 5 + 5 − 3 − 3 view comes after); feedback covers the 8-step route and counting only pours",
  // Each set: two jugs with no common factor (every amount is reachable) and a shortest route of 4-8 steps.
  // Hints and the explanation are read off the real shortest route, so they always match the scene.
  variants: defineVariants({
    standard: { small: 3, big: 5, target: 4 },
    params: [
      { small: 3, big: 5, target: 1 },
      { small: 5, big: 8, target: 6 },
      { small: 4, big: 7, target: 5 },
      { small: 4, big: 9, target: 6 },
    ],
    build: ({ small, big, target }) => {
      const caps = [small, big] as const;
      const route = jugsShortestSolution({ jugs: caps, target });
      if (!route) throw new Error(`${small} & ${big} can't make ${target}`);
      const steps = route.length;
      const src = route[0].kind === "fill" ? route[0].jug : 0;
      const dst = (1 - src) as 0 | 1;
      const other = jugsStepsStartingWith(caps, target, dst);
      if (other === null) throw new Error("no route from the other jug");
      const pours = route.filter((a) => a.kind === "pour").length;
      const fills = route.filter((a) => a.kind === "fill").length;
      const empties = route.filter((a) => a.kind === "empty").length;
      let state: JugState = [0, 0];
      const trace = route.map((a) => {
        state = applyJugAction(state, a, caps);
        const l = jugLabel(a, caps);
        return { en: `${l.en} (${state[0]}, ${state[1]})`, zh: `${l.zh}（${state[0]}，${state[1]}）` };
      });
      const after2 = applyJugAction(applyJugAction([0, 0], route[0], caps), route[1], caps);
      const first = jugLabel(route[0], caps);
      const second = jugLabel(route[1], caps);
      // Water in = tap fills, water out = drained, plus whatever stays in the jug that isn't holding the target.
      const left = state[0] === target ? state[1] : state[0];
      const sum = Array(fills).fill(`${caps[src]}`).join(" + ") + Array(empties).fill(` − ${caps[dst]}`).join("") + (left > 0 ? ` − ${left}` : "");
      if (fills * caps[src] - empties * caps[dst] - left !== target) throw new Error("water bookkeeping is off");
      return {
        prompt: {
          en: `You have ${an(small)} ${small}-litre jug and ${an(big)} ${big}-litre jug. Filling a jug from the tap, emptying a jug, or pouring one jug into the other each counts as one step. How few steps can leave exactly ${litres(target)} in a jug?`,
          zh: `你有一个 ${small} 升的壶和一个 ${big} 升的壶。从水龙头装满一个壶、倒空一个壶、把一个壶倒进另一个壶，每一下都算一步。最少几步，能让一个壶里正好有 ${target} 升水？`,
        },
        scene: { type: "water_jugs", jugs: [small, big], target, minSteps: steps },
        answer: { type: "NUMERIC", value: steps },
        hints: [
          { en: `Try it in the scene. Start with "${first.en}" and think about what could come next.`, zh: `在场景里试试。先点「${first.zh}」，再想想下一步能做什么。` },
          { en: `Then press "${second.en}". Now the ${small} L jug holds ${after2[0]} and the ${big} L jug holds ${after2[1]}. Keep a note like that after every step.`, zh: `接着点「${second.zh}」。现在 ${small} 升壶里有 ${after2[0]} 升，${big} 升壶里有 ${after2[1]} 升。每走一步都这样记一下。` },
          { en: `Only ever fill the ${caps[src]} L jug, only ever empty the ${caps[dst]} L jug, and pour ${caps[src]} → ${caps[dst]} in between. Stop as soon as ${litres(target)} appear, and count every step.`, zh: `只装满 ${caps[src]} 升壶，只倒空 ${caps[dst]} 升壶，中间把 ${caps[src]} 倒入 ${caps[dst]}。一出现 ${target} 升就停，数一数一共几步。` },
        ],
        wrongAnswers: distinctRules(
          [
            { match: String(other), feedback: { en: `You started by filling the ${caps[dst]}-litre jug. That works too, but it takes ${other} steps. Try starting with the ${caps[src]}-litre jug instead.`, zh: `你是先装满 ${caps[dst]} 升壶的。这样也能量出来，但要 ${other} 步。换成先装满 ${caps[src]} 升壶试试。` } },
            { match: String(pours), feedback: { en: `${pours} is the number of pours from one jug into the other. Filling a jug and emptying a jug count as steps too.`, zh: `${pours} 是两个壶之间互相倒的次数。装满一个壶、倒空一个壶，也都算一步。` } },
            { match: "lt:correct", feedback: { en: "That's fewer steps than anyone can manage. Try it in the scene: each step can only fill, empty or pour once.", zh: "没有人能用这么少的步数。在场景里试试：每一步只能装满、倒空或倒一次。" } },
            { match: "gt:correct", feedback: { en: `You got ${litres(target)}, which is great, but there's a shorter way. Count your steps again, or try starting with the other jug.`, zh: `你量出了 ${target} 升，很好，但还有更短的办法。再数一遍步数，或者换另一个壶先装。` } },
          ],
          steps
        ),
        explanation: {
          en: `Writing the jugs as (${small} L, ${big} L): ${trace.map((t) => t.en).join(", ")}. That's ${steps} steps. Starting with the ${caps[dst]}-litre jug also works, but it needs ${other}.`,
          zh: `把两个壶记作（${small} 升，${big} 升）：${trace.map((t) => t.zh).join("，")}。一共 ${steps} 步。先装 ${caps[dst]} 升壶也能量出来，但要 ${other} 步。`,
        },
        aha: {
          en: `Every litre comes from the tap and then goes down the drain, stays in the other jug, or is the amount you want, so it's just adding and taking away: ${sum} = ${target}. Jugs of ${small} and ${big} litres can make every amount up to ${big}.`,
          zh: `每一升水都从水龙头来，最后不是倒掉了、留在另一个壶里，就是你要的 ${target} 升，所以其实就是加加减减：${sum} = ${target}。${small} 升和 ${big} 升的壶，${big} 升以内的每个量都能量出来。`,
        },
      };
    },
  }),
};

/**
 * F7. countSolutions is off so the explore counter shows only how many the child has found, not
 * "x/2" (which would give the answer away); the scene still says "You found all 2!" at the end.
 * Mirror images count as different (dedupeMirrors false): 4 × 4 has 2, 5 × 5 has 10, 6 × 6 has 4.
 */
export const fourQueens: HeroQuestionBlueprint = {
  slug: "four-queens",
  collection: "impossible-puzzles",
  kind: "PUZZLE",
  ageGroup: "AGE_10_12",
  difficulty: "MEDIUM",
  category: "LOGIC",
  title: { en: "Four Queens, No Fights", zh: "互不攻击的四个皇后" },
  hook: {
    en: "A chess queen is the most powerful piece on the board: she attacks every square along her row, her column and both diagonals, all the way to the edge. Can you squeeze four queens onto a tiny board, four squares by four, so that none of them is under attack? And how many different ways are there?",
    zh: "皇后是国际象棋里最厉害的棋子：她能攻击同一行、同一列和两条斜线上的每一格，一直到棋盘边。在一个只有 4 × 4 格的小棋盘上，能不能放下四个皇后，谁也攻击不到谁？一共有几种摆法？",
  },
  guess: {
    type: "slider",
    min: 0,
    max: 10,
    step: 1,
    unit: { en: "ways", zh: "种" },
  },
  scene: { type: "queens_board", n: 4, countSolutions: false, dedupeMirrors: false, solutions: 2 },
  prompt: {
    en: "Place four queens on the 4 × 4 board so that no two share a row, a column or a diagonal. How many different arrangements are there? (Two arrangements that are mirror images of each other count as different.)",
    zh: "在 4 × 4 的棋盘上放四个皇后，任何两个都不在同一行、同一列或同一条斜线上。一共有几种不同的摆法？（互为镜像的两种算不同的摆法。）",
  },
  answer: { type: "NUMERIC", value: 2 },
  hints: [
    {
      en: "Each row can hold only one queen, so think row by row. Tap a square in the top row to place a queen and look at which squares she attacks.",
      zh: "每一行只能放一个皇后，所以一行一行地想。在第一行点一个格子放皇后，看看她攻击了哪些格子。",
    },
    {
      en: "Try the top queen in a corner. Follow the free squares row by row: do you get stuck? Tap the queen again to pick her up, and try the second square of the top row.",
      zh: "先把第一行的皇后放在角上，再一行一行地找没被攻击的格子：是不是卡住了？再点一下皇后把她拿走，换到第一行的第二格试试。",
    },
    {
      en: "A corner queen in the top row never works, so the top queen sits in the second or the third square. Each choice leads to exactly one arrangement. When you find one, press \"Clear\" and look for the other.",
      zh: "第一行的皇后放在角上永远不行，所以只能放在第二格或第三格。每种选择都只有一种摆法。找到一种以后，点「清空」再找另一种。",
    },
  ],
  wrongAnswers: [
    {
      match: "0",
      feedback: {
        en: "It does feel impossible at first, because lots of tries get stuck on the last queen. But there is a way: keep the top queen out of the corners.",
        zh: "一开始确实像是做不到，很多次都卡在最后一个皇后上。可是真的有办法：别把第一行的皇后放在角上。",
      },
    },
    {
      match: "1",
      feedback: {
        en: "You found one. Now hold it up to a mirror: its mirror image is a different arrangement, and it works too.",
        zh: "你找到了一种。把它放到镜子前照一照：镜子里的那一种是另一种摆法，而且也成立。",
      },
    },
    {
      match: "4",
      feedback: {
        en: "You may have counted turned copies as new ones. Turn an answer a quarter turn and it looks exactly the same as before, so turning never makes a new one. Only the mirror image is new: two in all.",
        zh: "你可能把转过来的摆法当成了新的。把一种摆法转四分之一圈，它看起来和原来一模一样，所以转来转去得不到新的摆法。只有镜子里的那一种是新的：一共两种。",
      },
    },
    {
      match: "gt:correct",
      feedback: {
        en: "That's too many. Check each arrangement for two queens on the same diagonal, and make sure you haven't counted the same one twice.",
        zh: "太多了。检查每种摆法里有没有两个皇后在同一条斜线上，再看看是不是把同一种数了两遍。",
      },
    },
  ],
  explanation: {
    en: "Only one queen fits in each row. If the top queen is in a corner, every way of carrying on gets stuck, so she must be in the second or the third square. Each of those choices leads to exactly one arrangement, and the two are mirror images of each other. So there are 2.",
    zh: "每一行只能放一个皇后。第一行的皇后如果在角上，接下去怎么放都会卡住，所以她只能在第二格或第三格。这两种选择各自只能得到一种摆法，而且这两种互为镜像。所以一共有 2 种。",
  },
  aha: {
    en: "Thinking row by row turns a hopeless jumble into a short list of tries. On a full 8 × 8 board the same idea finds all 92 solutions.",
    zh: "一行一行地想，乱成一团的尝试就变成了短短几步。在 8 × 8 的完整棋盘上，同样的办法能找出全部 92 种摆法。",
  },
  extension: {
    en: "How many ways can five queens sit safely on a 5 × 5 board, counting mirror images as different? What about six queens on 6 × 6? Is the answer what you expected?",
    zh: "5 × 5 的棋盘上放五个互不攻击的皇后，有几种摆法（镜像算不同的）？6 × 6 放六个呢？结果和你想的一样吗？",
  },
  discussionPrompt: {
    en: "How do you know there are only 2, and that you didn't just miss some? Explain it so that someone else is convinced.",
    zh: "你怎么确定只有 2 种，而不是自己漏找了？把理由讲清楚，让别人也信服。",
  },
  solutionTags: ["guess_check", "draw", "table"],
  funFact: {
    en: "The eight queens puzzle for a real chessboard was first published in 1848. It has 92 solutions, but only 12 if turned and mirrored copies count as the same.",
    zh: "真正棋盘上的「八皇后」问题在 1848 年第一次发表。它有 92 种摆法，如果把转过来、照镜子得到的算作同一种，就只剩 12 种。",
  },
  sortOrder: 7,
  rubricNotes:
    "17/20 — hook 2, guess 2, hands-on 2, aha 1, floor 2, ceiling 2, paths 1, wrong 2, hints 2, retell 1: the board is the puzzle; the aha (row by row, mirror pairs) is solid but not startling; trial on the board is the one path; the 6 × 6 < 5 × 5 extension lifts the ceiling",
  // queens_board draws 4-8; 8 × 8 (92) is beyond finding by hand, so the variants stop at 7 × 7.
  // The copy sorts solutions by the top queen's column, which the child can do on the board.
  variants: defineVariants({
    standard: { n: 4 },
    params: [{ n: 5 }, { n: 6 }, { n: 7 }],
    build: ({ n }) => {
      const all = queensSolutions(n);
      const total = all.length;
      const byColumn = Array.from({ length: n }, (_, c) => all.filter((sol) => sol[0] === c).length);
      const previous = queensSolutions(n - 1).length;
      const cornerFree = byColumn[0] === 0;
      return {
        prompt: {
          en: `Place ${n} queens on the ${n} × ${n} board so that no two share a row, a column or a diagonal. How many different arrangements are there? (Two arrangements that are mirror images of each other count as different.)`,
          zh: `在 ${n} × ${n} 的棋盘上放 ${n} 个皇后，任何两个都不在同一行、同一列或同一条斜线上。一共有几种不同的摆法？（互为镜像的两种算不同的摆法。）`,
        },
        scene: { type: "queens_board", n, countSolutions: false, dedupeMirrors: false, solutions: total },
        answer: { type: "NUMERIC", value: total },
        hints: [
          { en: `There is one queen in each of the ${n} rows, so work row by row. Place a queen in the top row and follow the free squares downward.`, zh: `${n} 行里每行正好一个皇后，所以一行一行地放。先在第一行放一个皇后，再往下找没被攻击的格子。` },
          { en: `Sort the solutions by where the top queen sits. ${cornerFree ? "A corner queen in the top row never works here, so" : "Start with the top queen in the corner, then"} move her one square at a time and find every arrangement for each spot.`, zh: `按第一行皇后的位置给摆法分类。${cornerFree ? "这里第一行的皇后放在角上永远不行，所以" : "先把第一行的皇后放在角上，再"}一格一格地挪，每个位置都把所有摆法找出来。` },
          { en: `Every solution's mirror image is also a solution, so the top-row columns come in matching pairs: column 1 has as many as column ${n}. Column by column the counts are ${byColumn.join(", ")}.`, zh: `每种摆法照镜子也是一种摆法，所以第一行的位置两两对应：第 1 列和第 ${n} 列一样多。按列数下来分别是 ${byColumn.join("、")}。` },
        ],
        wrongAnswers: distinctRules(
          [
            { match: String(total / 2), feedback: { en: `You counted each arrangement and its mirror image once. Mirror images count as different here, so double it.`, zh: "你把一种摆法和它的镜像只算了一次。这里镜像算不同的摆法，要乘 2。" } },
            { match: String(previous), feedback: { en: `${previous} is the count for the ${n - 1} × ${n - 1} board. A bigger board changes the answer, and not always in the direction you'd expect.`, zh: `${previous} 是 ${n - 1} × ${n - 1} 棋盘的答案。棋盘变大，答案也会变，而且不一定往你想的方向变。` } },
            { match: "lt:correct", feedback: { en: "You've missed some. Go through the top-row squares one by one and find every arrangement for each.", zh: "还漏了一些。把第一行的格子一个一个试过去，每个位置都把摆法找全。" } },
            { match: "gt:correct", feedback: { en: "That's too many. Check each arrangement for two queens on one diagonal, and make sure none is counted twice.", zh: "太多了。检查每种摆法里有没有两个皇后在同一条斜线上，再看看有没有数重复。" } },
          ],
          total
        ),
        explanation: {
          en: `Only one queen fits in each row, so sort the solutions by the top queen's column. Columns 1 to ${n} give ${byColumn.join(", ")} arrangements. That's ${total} in all, and they come in mirror-image pairs.`,
          zh: `每一行只能放一个皇后，所以按第一行皇后在哪一列来分类。第 1 列到第 ${n} 列分别有 ${byColumn.join("、")} 种摆法。一共 ${total} 种，而且两两互为镜像。`,
        },
        aha: {
          en: `Row by row, sorted by the top queen, the search becomes a list you can finish. ${n} × ${n} has ${total} solutions, while ${n - 1} × ${n - 1} has ${previous}: bigger isn't always more.`,
          zh: `一行一行地放、按第一行分类，找摆法就变成了能做完的清单。${n} × ${n} 有 ${total} 种，${n - 1} × ${n - 1} 有 ${previous} 种：棋盘大，摆法不一定多。`,
        },
      };
    },
  }),
};

/**
 * F9. Illustration until the T3 `dot_connect` scene lands (待替换为 dot_connect). The guess is the
 * question. Extension: three lines are impossible with true points (three disjoint lines of three
 * dots are rows or columns, which are parallel), possible with fat dots.
 */
export const nineDotsFourLines: HeroQuestionBlueprint = {
  slug: "nine-dots-four-lines",
  collection: "impossible-puzzles",
  kind: "PUZZLE",
  ageGroup: "AGE_10_12",
  difficulty: "MEDIUM",
  category: "GEOMETRY",
  title: { en: "Nine Dots, Four Lines", zh: "九个点四条线" },
  hook: {
    en: "Nine dots sit in a neat square, three rows of three. Join all nine with four straight lines drawn in one go, without lifting your pencil from the paper. People have stared at this for hours, so is it even possible?",
    zh: "九个点排成整整齐齐的正方形，三行三列。用四条直线把九个点全部连起来，一笔画完，笔不能离开纸。很多人对着它想了好久：这到底做不做得到？",
  },
  guess: {
    type: "choice",
    options: [
      { id: "inside-the-box", en: "Yes, and the lines stay inside the square of dots", zh: "可以，线都在九个点围成的方框里" },
      { id: "outside-the-box", en: "Yes, but some lines have to go outside the square", zh: "可以，但有的线要画到方框外面" },
      { id: "impossible", en: "No, four lines can't do it", zh: "不可能，四条线做不到" },
    ],
  },
  scene: {
    type: "illustration",
    asset: "nine-dots-four-lines",
    caption: {
      en: "Join all nine dots with four straight lines, without lifting the pencil.",
      zh: "用四条直线一笔连起九个点，笔不离纸。",
    },
    revealAsset: "nine-dots-four-lines-reveal",
    revealCaption: {
      en: "Line 1 runs past the last dot and turns outside the square, and so does line 2. Nobody ever said the lines had to stay inside.",
      zh: "第 1 条线越过最后一个点，在方框外面拐弯，第 2 条线也一样。从来没有人说过线不许出框。",
    },
  },
  prompt: {
    en: "Four straight lines, one stroke, all nine dots. Can it be done, and if so, where do the lines have to go?",
    zh: "四条直线、一笔画、九个点全连上：做得到吗，线又该画在哪儿？",
  },
  answer: { type: "CHOICE", correctId: "outside-the-box" },
  hints: [
    {
      en: "Copy the nine dots onto paper and have a few goes. Where does your pencil keep running into trouble?",
      zh: "把九个点照着画在纸上，多试几次。你的笔总是在哪里卡住？",
    },
    {
      en: "Every try that keeps all four lines inside the square leaves a dot behind. Is there any rule that says a line must stop at the last dot?",
      zh: "只要四条线都待在方框里，总会剩下一个点连不上。有哪条规矩说过线必须停在最后一个点上吗？",
    },
    {
      en: "Start at a corner dot and draw along the top row, but keep going past the last dot. Turn there, outside the square, and come back on a diagonal.",
      zh: "从一个角上的点出发，沿着最上面一行画，画过最后一个点还继续往前。在方框外面拐弯，再斜着画回来。",
    },
  ],
  wrongAnswers: [
    {
      match: "choice:inside-the-box",
      feedback: {
        en: "If every line stays inside the square, one dot always gets left out. Try it and see. The square is a rule you added yourself; the puzzle never said it.",
        zh: "如果每条线都待在方框里，总会有一个点连不上，自己试试就知道。方框是你自己加上的规矩，题目可没这么说。",
      },
    },
    {
      match: "choice:impossible",
      feedback: {
        en: "Inside the square it really is impossible, which is why it feels hopeless. But nobody said the lines have to stop where the dots stop.",
        zh: "只在方框里画的话，确实做不到，所以才让人觉得没希望。可是没有人说过线必须停在点的边上。",
      },
    },
  ],
  explanation: {
    en: "Start at the top-left dot and draw along the top row, going one step past the last dot. From there, outside the square, draw a diagonal down to the left through two dots, again ending outside. Go straight up the left column back to the start, then finish along the long diagonal to the bottom-right dot. Two of the turns happen outside the square, and that's the whole trick.",
    zh: "从左上角的点出发，沿着最上面一行往右画，画过最后一个点再多走一格。在方框外面拐弯，斜着往左下画，穿过两个点，同样停在方框外面。再沿着最左边一列笔直往上，回到起点，最后沿着长长的对角线画到右下角的点。有两个拐弯在方框外面，这就是全部的窍门。",
  },
  aha: {
    en: "\"Stay inside the square\" was never part of the puzzle: your brain added it. Lots of \"impossible\" problems turn easy once you spot a rule that nobody actually made.",
    zh: "「不许出框」这条规矩题目里从来没有，是你的脑子自己加的。很多「不可能」的问题，只要发现一条其实没人定过的规矩，就变简单了。",
  },
  extension: {
    en: "Can you join the nine dots with just three straight lines in one stroke? Think about how big a dot really is. What about a single line?",
    zh: "能不能只用三条直线一笔连完九个点？想一想：一个点到底有多大？只用一条线呢？",
  },
  discussionPrompt: {
    en: "How long was it before you tried going outside the square? What finally made you try it?",
    zh: "你试了多久才想到画出方框？最后是什么让你想去试的？",
  },
  solutionTags: ["draw", "guess_check", "other"],
  funFact: {
    en: "People often say the phrase \"think outside the box\" comes from this very puzzle. Nobody knows for sure, but the puzzle itself is more than a hundred years old.",
    zh: "常有人说英语里「跳出框框想问题」这句话就来自这道题。这说法没法确定，但这道题本身已经有一百多年了。",
  },
  sortOrder: 9,
  rubricNotes:
    "17/20 — hook 2, guess 2, hands-on 1, aha 2, floor 2, ceiling 1, paths 1, wrong 2, hints 2, retell 2: illustration only (待替换为 dot_connect), drawn on paper; one lateral-thinking path; the three-line extension has a neat proof but stays close to the original",
};

/**
 * F10. The guess is the question. No seed: the scene deals with its default seed and "Try again"
 * deals a fresh table each time, so a child sees the trick work on many different splits.
 */
export const blindfoldCoins: HeroQuestionBlueprint = {
  slug: "blindfold-coins",
  collection: "impossible-puzzles",
  kind: "PUZZLE",
  ageGroup: "AGE_12_14",
  difficulty: "HARD",
  category: "ALGEBRA",
  title: { en: "Blindfolded Coin Split", zh: "蒙着眼分硬币" },
  hook: {
    en: "A hundred coins lie on the table, and exactly ten of them show heads. You're blindfolded and can't feel which side is up, but you may move and flip any coins you like. Can you split them into two piles with the same number of heads?",
    zh: "桌上有 100 枚硬币，正好 10 枚正面朝上。你被蒙住了眼睛，摸不出正反面，但可以随便挪动、翻转硬币。你能把它们分成两堆，让两堆正面朝上的一样多吗？",
  },
  guess: {
    type: "choice",
    options: [
      { id: "impossible", en: "No: without seeing, it's just luck", zh: "不可能：看不见，只能碰运气" },
      { id: "take-ten", en: "Yes: take any 10 coins as the second pile", zh: "可以：随便拿 10 枚当第二堆" },
      { id: "take-ten-flip", en: "Yes: take any 10 coins and flip every one of them", zh: "可以：随便拿 10 枚，再把它们全部翻面" },
    ],
  },
  scene: { type: "coin_piles", coins: 100, heads: 10 },
  prompt: {
    en: "Which plan always works, however the heads happen to be spread around the table?",
    zh: "哪个办法不管正面朝上的硬币在哪儿，都一定成功？",
  },
  answer: { type: "CHOICE", correctId: "take-ten-flip" },
  hints: [
    {
      en: "Don't try to find the heads. Suppose your small pile of 10 coins happens to hold 3 heads: how many heads are still in the big pile?",
      zh: "别想着找出正面。假设你拿出的 10 枚里碰巧有 3 个正面，那大堆里还剩几个正面？",
    },
    {
      en: "The big pile keeps 7 heads, but the small pile has only 3. Its other 7 coins are tails. What would flipping every coin in the small pile do?",
      zh: "大堆里剩 7 个正面，小堆只有 3 个，另外 7 枚是反面。把小堆每一枚都翻过来会怎样？",
    },
    {
      en: "In the scene, press \"Grab 10 at random\", then \"Flip the right pile\", then \"Reveal faces\". Press \"Try again\" a few times: does it ever fail? Now swap 3 for any number k and explain why.",
      zh: "在场景里依次点「随手拿 10 枚」「翻转右堆」「揭晓」，再点几次「再试一次」：失败过吗？然后把 3 换成任意一个数 k，说说为什么。",
    },
  ],
  wrongAnswers: [
    {
      match: "choice:impossible",
      feedback: {
        en: "Without seeing, it feels like it has to be luck. But you do know one thing for sure: there are exactly 10 heads in all. A plan can use that number without ever finding a single head.",
        zh: "看不见，好像只能碰运气。可你确实知道一件事：正面一共正好 10 个。办法可以用上这个数，而不用找到任何一个正面。",
      },
    },
    {
      match: "choice:take-ten",
      feedback: {
        en: "Taking 10 coins is the right start. If your pile has k heads, the big pile has 10 − k, and those only match when k is 5. You still need one more move.",
        zh: "拿 10 枚是对的第一步。如果小堆里有 k 个正面，大堆里就有 10 − k 个，只有 k 正好是 5 时才相等。还差一步。",
      },
    },
  ],
  explanation: {
    en: "Take any 10 coins as a small pile. If it holds k heads, the big pile keeps the other 10 − k heads. The small pile's remaining 10 − k coins are tails, so flipping every coin in it turns them into heads, and now it has 10 − k heads too. The piles match, whatever k was.",
    zh: "随便拿 10 枚当小堆。如果小堆里有 k 个正面，大堆里就剩 10 − k 个正面。小堆里另外 10 − k 枚是反面，把小堆全部翻面后，它们变成了正面，小堆也有 10 − k 个正面了。不管 k 是几，两堆都一样多。",
  },
  aha: {
    en: "You never find out where the heads are, and you don't need to: flipping turns the small pile's k heads into exactly the 10 − k heads the big pile has. Algebra works even blindfolded.",
    zh: "你始终不知道正面在哪儿，也不需要知道：一翻面，小堆的 k 个正面正好变成和大堆一样的 10 − k 个。蒙着眼睛，代数照样管用。",
  },
  extension: {
    en: "What if exactly 20 of the 100 coins show heads? And what if nobody tells you how many heads there are?",
    zh: "如果 100 枚里正好 20 枚正面朝上呢？如果没人告诉你有几个正面呢？",
  },
  discussionPrompt: {
    en: "Did the trick work every single time in the scene? Explain why in your own words, without using the letter k.",
    zh: "在场景里，这个办法是不是每次都成功？不用字母 k，用你自己的话说说为什么。",
  },
  solutionTags: ["algebra", "simulate", "guess_check"],
  funFact: {
    en: "The number of coins doesn't matter at all. With a thousand coins and ten heads, you still take ten coins and flip them.",
    zh: "硬币一共有多少枚根本不重要。就算有一千枚、其中十枚正面朝上，你还是拿出十枚，全部翻面。",
  },
  sortOrder: 10,
  rubricNotes:
    "18/20 — hook 2, guess 2, hands-on 2, aha 2, floor 1, ceiling 1, paths 2, wrong 2, hints 2, retell 2: the scene lets kids run the trick on many random tables; small cases by hand and the k / 10 − k algebra are two real paths; the unknown k is a genuine step up for 12-14, extensions stay close",
};

/**
 * F11. The scene proposes the fly's distance when the clock reaches the meeting point. Its reveal adds
 * the legs (60 + 12 + 2.4 + … = 75), the long way. ONE_STEP can't fire: the explanation has several operators.
 */
export const flyBetweenTrains: HeroQuestionBlueprint = {
  slug: "fly-between-trains",
  collection: "impossible-puzzles",
  kind: "PUZZLE",
  ageGroup: "AGE_12_14",
  difficulty: "MEDIUM",
  category: "WORD_PROBLEMS",
  title: { en: "The Fly Between Two Trains", zh: "两列火车之间的苍蝇" },
  hook: {
    en: "Two trains head toward each other on the same long track, and a fly sits on the nose of one of them. The fly zooms to the other train, turns around, zooms back, and keeps bouncing between them until the trains meet. With all those trips getting shorter and shorter, how far does the fly travel in total?",
    zh: "两列火车在同一条长长的铁轨上相向而行，一只苍蝇停在其中一列的车头上。苍蝇飞到另一列车，掉头飞回来，就这样在两车之间来回飞，直到两车相遇。来回一趟比一趟短，苍蝇一共飞了多远？",
  },
  guess: {
    type: "slider",
    min: 0,
    max: 200,
    step: 5,
    unit: { en: "km", zh: "千米" },
  },
  scene: { type: "trains_fly", distanceKm: 100, trainSpeed: 50, flySpeed: 75, flyKm: 75 },
  prompt: {
    en: "The trains start 100 km apart, and each one goes 50 km/h. The fly flies at 75 km/h. How many kilometres does the fly fly before the trains meet?",
    zh: "两车开始时相距 100 千米，每列车的速度都是 50 千米/时，苍蝇的速度是 75 千米/时。两车相遇以前，苍蝇一共飞了多少千米？",
  },
  answer: { type: "NUMERIC", value: 75 },
  hints: [
    {
      en: "Adding up every zigzag is a nightmare, because there are endlessly many. Ask a different question: for how LONG is the fly in the air?",
      zh: "把每一段来回都加起来太难了，因为有无穷多段。换个问题问：苍蝇一共在空中飞了多长时间？",
    },
    {
      en: "Each train covers 50 km in an hour, so the gap shrinks by 100 km every hour. When do they meet? Drag the time slider and watch the gap.",
      zh: "每列车每小时开 50 千米，两车之间的距离每小时缩短 100 千米。它们什么时候相遇？拖动时间滑块，看看距离怎么变。",
    },
    {
      en: "The trains meet after exactly one hour, and the fly never stops until then. How far does something going 75 km/h get in one hour?",
      zh: "两车正好一小时后相遇，在那之前苍蝇一直没停。速度是 75 千米/时，一小时能飞多远？",
    },
  ],
  wrongAnswers: [
    {
      match: "100",
      feedback: {
        en: "100 km is the gap between the trains at the start. The fly never crosses that whole gap: the trains keep closing in, so its trips keep shrinking.",
        zh: "100 千米是两车一开始的距离。苍蝇从来没有飞过这么长的一整段：两车一直在靠近，它每一趟都越来越短。",
      },
    },
    {
      match: "150",
      feedback: {
        en: "You let the trains take 2 hours, as if only one of them were moving. Both drive toward each other, so the gap closes at 100 km/h and they meet after 1 hour.",
        zh: "你让两车走了 2 小时，好像只有一列车在开。两列车都朝对方开，距离每小时缩短 100 千米，所以 1 小时就相遇了。",
      },
    },
    {
      match: "50",
      feedback: {
        en: "50 km is how far ONE train goes before they meet. The fly is faster than the trains: it covers 75 km in every hour.",
        zh: "50 千米是一列火车在相遇前开的路程。苍蝇比火车快，每小时飞 75 千米。",
      },
    },
    {
      match: "regex:^\\s*(∞|[Ii]nf|[Ff]orever|无限|无穷|永远)",
      feedback: {
        en: "Infinitely many trips, yes! But they shrink so fast that they add up to an ordinary distance. Work out how long the fly is in the air instead.",
        zh: "来回确实有无穷多趟！可它们缩短得飞快，加起来只是一段普通的距离。换个思路：算算苍蝇在空中飞了多久。",
      },
    },
    {
      match: "lt:correct",
      feedback: {
        en: "Too short: the fly keeps flying for the whole time the trains are moving. Work out how long that is first.",
        zh: "太短了：火车开多久，苍蝇就飞多久。先算出这段时间有多长。",
      },
    },
    {
      match: "gt:correct",
      feedback: {
        en: "Too far: the fly is only in the air until the trains meet. Work out how long that takes first.",
        zh: "太远了：苍蝇只飞到两车相遇为止。先算出两车多久相遇。",
      },
    },
  ],
  explanation: {
    en: "The gap closes at 50 + 50 = 100 km/h, so the trains meet after 100 ÷ 100 = 1 hour. The fly flies for that whole hour at 75 km/h, so it covers 75 km. You can also add up the trips one by one, 60 + 12 + 2.4 + …, and you get the same 75, but it takes forever.",
    zh: "两车之间的距离每小时缩短 50 + 50 = 100 千米，所以 100 ÷ 100 = 1 小时后相遇。苍蝇这一整个小时都以 75 千米/时在飞，所以飞了 75 千米。也可以把每一段加起来：60 + 12 + 2.4 + …，结果也是 75，只是得一直加下去，没完没了。",
  },
  aha: {
    en: "Change the question from \"how far\" to \"how long\", and endlessly many zigzags collapse into one easy hour. Infinitely many trips can still add up to an ordinary 75 km.",
    zh: "把「飞了多远」换成「飞了多久」，无穷多段来回一下子变成了简单的一小时。无穷多段路，加起来也可以只是普通的 75 千米。",
  },
  extension: {
    en: "How many times does the fly turn around? And how long is its very first trip, before it turns for the first time?",
    zh: "苍蝇一共掉头了多少次？它第一次掉头之前，第一趟飞了多远？",
  },
  discussionPrompt: {
    en: "What did you work out first, the distance or the time? Would you have spotted the shortcut without dragging the slider?",
    zh: "你先算的是距离还是时间？如果不拖滑块，你能发现这条捷径吗？",
  },
  solutionTags: ["algebra", "simulate", "pattern"],
  funFact: {
    en: "The story goes that the mathematician John von Neumann answered this in a flash. When someone said he must know the shortcut, he replied that he had simply added up all the trips in his head.",
    zh: "传说数学家冯·诺依曼一下子就说出了答案。别人说他肯定知道捷径，他却回答：我只是在脑子里把每一趟都加起来了。",
  },
  sortOrder: 11,
  rubricNotes:
    "18/20 — hook 2, guess 2, hands-on 2, aha 2, floor 1, ceiling 2, paths 2, wrong 2, hints 2, retell 1: the time slider is the puzzle and the reveal adds the legs, so the shortcut and the infinite series are both on screen; needs speed × time, so the floor is 1",
  // Whole-number answers: each set's meeting time is a whole or half hour.
  variants: defineVariants({
    standard: { distanceKm: 100, trainSpeed: 50, flySpeed: 75 },
    params: [
      { distanceKm: 90, trainSpeed: 45, flySpeed: 60 },
      { distanceKm: 120, trainSpeed: 30, flySpeed: 50 },
      { distanceKm: 150, trainSpeed: 25, flySpeed: 80 },
      { distanceKm: 200, trainSpeed: 40, flySpeed: 100 },
    ],
    build: ({ distanceKm: d, trainSpeed: v, flySpeed: f }) => {
      const closing = 2 * v;
      const hours = d / closing;
      const km = f * hours;
      const hourWord = hours === 1 ? "hour" : "hours";
      return {
        prompt: {
          en: `The trains start ${d} km apart, and each one goes ${v} km/h. The fly flies at ${f} km/h. How many kilometres does the fly fly before the trains meet?`,
          zh: `两车开始时相距 ${d} 千米，每列车的速度都是 ${v} 千米/时，苍蝇的速度是 ${f} 千米/时。两车相遇以前，苍蝇一共飞了多少千米？`,
        },
        scene: { type: "trains_fly", distanceKm: d, trainSpeed: v, flySpeed: f, flyKm: km },
        answer: { type: "NUMERIC", value: km },
        hints: [
          { en: "Don't add up the zigzags: there are endlessly many. Ask how LONG the fly is in the air instead.", zh: "别去加每一段来回：有无穷多段。改问：苍蝇一共在空中飞了多长时间？" },
          { en: `Each train covers ${v} km in an hour, so the gap shrinks by ${closing} km every hour. When is the ${d} km gap gone? Drag the time slider to check.`, zh: `每列车每小时开 ${v} 千米，两车之间的距离每小时缩短 ${closing} 千米。${d} 千米的距离什么时候缩没？拖动时间滑块看看。` },
          { en: `The trains meet after ${hours} ${hourWord}, and the fly never stops until then. How far does something going ${f} km/h get in that time?`, zh: `两车 ${hours} 小时后相遇，在那之前苍蝇一直没停。速度是 ${f} 千米/时，这段时间能飞多远？` },
        ],
        wrongAnswers: distinctRules(
          [
            { match: String(d), feedback: { en: `${d} km is the gap at the start. The fly never crosses that whole gap: the trains keep closing in, so its trips keep shrinking.`, zh: `${d} 千米是两车一开始的距离。苍蝇从来没飞过这么长的一整段：两车一直在靠近，每一趟都越来越短。` } },
            { match: String(km * 2), feedback: { en: `You let only one train move, so they took ${hours * 2} hours. Both drive toward each other, so the gap closes at ${closing} km/h.`, zh: `你只让一列车在开，所以算成了 ${hours * 2} 小时。两列车都朝对方开，距离每小时缩短 ${closing} 千米。` } },
            { match: String(v * hours), feedback: { en: `${v * hours} km is how far ONE train goes before they meet. The fly is faster: it covers ${f} km in every hour.`, zh: `${v * hours} 千米是一列火车相遇前开的路程。苍蝇更快，每小时飞 ${f} 千米。` } },
            { match: "regex:^\\s*(∞|[Ii]nf|[Ff]orever|无限|无穷|永远)", feedback: { en: "Infinitely many trips, yes! But they shrink so fast that they add up to an ordinary distance. Work out how long the fly is in the air.", zh: "来回确实有无穷多趟！可它们缩短得飞快，加起来只是一段普通的距离。算算苍蝇在空中飞了多久。" } },
            { match: "lt:correct", feedback: { en: "Too short: the fly keeps flying for the whole time the trains are moving. Work out how long that is first.", zh: "太短了：火车开多久，苍蝇就飞多久。先算出这段时间有多长。" } },
            { match: "gt:correct", feedback: { en: "Too far: the fly is only in the air until the trains meet. Work out how long that takes first.", zh: "太远了：苍蝇只飞到两车相遇为止。先算出两车多久相遇。" } },
          ],
          km
        ),
        explanation: {
          en: `The gap closes at ${v} + ${v} = ${closing} km/h, so the trains meet after ${d} ÷ ${closing} = ${hours} ${hourWord}. The fly flies that whole time at ${f} km/h, so it covers ${f} × ${hours} = ${km} km. Adding the trips one by one gives the same ${km}, but the adding never ends.`,
          zh: `两车之间的距离每小时缩短 ${v} + ${v} = ${closing} 千米，所以 ${d} ÷ ${closing} = ${hours} 小时后相遇。苍蝇这段时间一直以 ${f} 千米/时在飞，所以飞了 ${f} × ${hours} = ${km} 千米。一段一段加起来也是 ${km}，只是要一直加下去，没完没了。`,
        },
        aha: {
          en: `Ask "how long" instead of "how far" and the zigzags collapse into ${hours} easy ${hourWord}. Infinitely many trips still add up to an ordinary ${km} km.`,
          zh: `把「飞了多远」换成「飞了多久」，无穷多段来回就变成了简单的 ${hours} 小时。无穷多段路，加起来也只是普通的 ${km} 千米。`,
        },
      };
    },
  }),
};

/**
 * F12. This world's second AGE_8_10 question. No seed: each round's secret differs (the scene uses
 * the clock), so kids can't share "the number". 1..1000 needs 10, a million 20 (binarySearchSteps).
 */
export const guessMyNumber: HeroQuestionBlueprint = {
  slug: "guess-my-number",
  collection: "impossible-puzzles",
  kind: "PUZZLE",
  ageGroup: "AGE_8_10",
  difficulty: "EASY",
  category: "LOGIC",
  title: { en: "Higher or Lower?", zh: "比它大还是比它小" },
  hook: {
    en: "I'm thinking of a whole number between one and a hundred. Each time you guess, I'll only tell you \"higher\" or \"lower\". How many guesses do you need to be sure of catching my number, even on your unluckiest day?",
    zh: "我心里想了一个 1 到 100 之间的整数。你每猜一个数，我只告诉你「比它大」还是「比它小」。最少要猜几次，才能保证一定猜中，就算运气最差也不怕？",
  },
  guess: {
    type: "slider",
    min: 1,
    max: 20,
    step: 1,
    unit: { en: "guesses", zh: "次" },
  },
  scene: { type: "guess_game", max: 100, mode: "you_guess", minGuesses: 7 },
  prompt: {
    en: "Play smart, and there's a number of guesses you never need to go past, whatever my secret number from 1 to 100 is. How many guesses is that?",
    zh: "我的数是 1 到 100 之间的整数。只要你猜得聪明，不管我想的是哪个数，最多几次一定能猜中？",
  },
  answer: { type: "NUMERIC", value: 7 },
  hints: [
    {
      en: "Play a few rounds in the scene with \"You guess\". Which first guess tells you the most, whatever my answer is?",
      zh: "在场景里选「你来猜」，玩几局。第一次猜哪个数，不管我怎么回答，你知道得最多？",
    },
    {
      en: "Guess 50 first: whether I say higher or lower, about half the numbers are gone. Then guess the middle of what's left. How many numbers are left after each guess?",
      zh: "先猜 50：不管我说大还是小，差不多一半的数都被排除了。接着猜剩下那些数的中间。每猜一次，还剩几个数？",
    },
    {
      en: "Guessing the middle every time, the numbers still possible shrink like this: 100, 50, 25, 12, 6, 3, 1. Once just one is left, your next guess is right. Count the guesses.",
      zh: "每次都猜中间，可能的数会这样变少：100、50、25、12、6、3、1。只剩一个数的时候，下一次一定猜中。数一数一共猜了几次。",
    },
  ],
  wrongAnswers: [
    {
      match: "50",
      feedback: {
        en: "50 is half of the numbers, but you don't stop after halving once. After every guess you can halve what's left again.",
        zh: "50 是一半的数，可是减半一次就停下来太早了。每猜一次，都能把剩下的再砍掉一半。",
      },
    },
    {
      match: "100",
      feedback: {
        en: "That's guessing 1, 2, 3 … in order, which really might take 100 tries. \"Higher\" and \"lower\" let you throw away lots of numbers at once.",
        zh: "这是按 1、2、3……顺着猜，确实可能要猜 100 次。「大」和「小」能让你一下子排除一大堆数。",
      },
    },
    {
      match: "6",
      feedback: {
        en: "So close! Six guesses can sort out at most 63 numbers (1 + 2 + 4 + 8 + 16 + 32), and there are 100. On an unlucky day you need one more.",
        zh: "很接近了！6 次最多只能分辨 63 个数（1 + 2 + 4 + 8 + 16 + 32），可这里有 100 个。运气差的时候还要再猜一次。",
      },
    },
    {
      match: "lt:correct",
      feedback: {
        en: "Too few. You might get lucky, but the question says \"always\": after that many middle guesses, several numbers can still be left.",
        zh: "太少了。运气好也许能猜中，可题目问的是「一定」：猜了这么多次中间以后，还可能剩好几个数。",
      },
    },
    {
      match: "gt:correct",
      feedback: {
        en: "That always works, but you can do it in fewer. Guess right in the middle of what's left, every single time.",
        zh: "这样一定能猜中，但还能更少。每一次都猜剩下那些数的正中间。",
      },
    },
  ],
  explanation: {
    en: "Guess the middle each time, so every answer throws away about half of what's left: the numbers still possible go 100, 50, 25, 12, 6, 3, 1. The seventh guess hits that last one. Six guesses aren't enough, because they can tell apart at most 1 + 2 + 4 + 8 + 16 + 32 = 63 numbers.",
    zh: "每次都猜中间，不管回答是什么，都能排除剩下的一半左右：可能的数从 100 个变成 50、25、12、6、3、1 个。第七次就猜中最后那个数。6 次不够，因为 6 次最多只能分辨 1 + 2 + 4 + 8 + 16 + 32 = 63 个数。",
  },
  aha: {
    en: "Every smart guess cuts the list in half, and halving is fast: seven guesses are enough for a hundred numbers. Ten would do for a thousand, and twenty for a million.",
    zh: "每一次聪明的猜测都把范围砍掉一半，而减半非常快：一百个数，七次就够了。一千个数只要 10 次，一百万个数也只要 20 次。",
  },
  extension: {
    en: "How many guesses for a number from 1 to 1,000? From 1 to a million? Switch the scene to \"I guess\" and see whether the computer ever needs more than 7.",
    zh: "1 到 1000 要猜几次？1 到一百万呢？把场景换成「我来猜」，看看电脑有没有用过 7 次以上。",
  },
  discussionPrompt: {
    en: "What was your very first guess when you played, and why? Did the computer's first guess surprise you?",
    zh: "你玩的时候第一次猜的是几？为什么？电脑第一次猜的数让你意外吗？",
  },
  solutionTags: ["simulate", "guess_check", "pattern", "table"],
  funFact: {
    en: "A dictionary works the same way: open it in the middle, see whether your word comes before or after, and repeat. About 17 halvings find any word among 100,000.",
    zh: "查字典也是同样的办法：从中间翻开，看你要的词在前面还是后面，再接着翻。大约 17 次减半，就能在 10 万个词里找到任何一个。",
  },
  sortOrder: 12,
  rubricNotes:
    "18/20 — hook 2, guess 2, hands-on 2, aha 2, floor 2, ceiling 2, paths 1, wrong 2, hints 2, retell 1: the game is the puzzle and both modes (you guess / I guess) show the halving; the middle-guess strategy is the one real path; the 63-number argument for why 6 fails is in the feedback",
  // guess_game takes 10-1000. The halving chain (worst case: half of what's left, rounded down) must agree with binarySearchSteps.
  variants: defineVariants({
    standard: { max: 100 },
    params: [{ max: 10 }, { max: 50 }, { max: 200 }, { max: 1000 }],
    build: ({ max }) => {
      const chain = [max];
      while (chain[chain.length - 1] > 1) chain.push(Math.floor(chain[chain.length - 1] / 2));
      const k = chain.length;
      if (k !== binarySearchSteps(max)) throw new Error(`halving chain for ${max} gives ${k}, binarySearchSteps ${binarySearchSteps(max)}`);
      const fewer = k - 1;
      const reach = 2 ** fewer - 1;
      const powers = Array.from({ length: fewer }, (_, i) => 2 ** i);
      const powerSum = powers.length > 4 ? `1 + 2 + 4 + … + ${powers[powers.length - 1]}` : powers.join(" + ");
      return {
        prompt: {
          en: `Play smart, and there's a number of guesses you never need to go past, whatever my secret number from 1 to ${max} is. How many guesses is that?`,
          zh: `我的数是 1 到 ${max} 之间的整数。只要你猜得聪明，不管我想的是哪个数，最多几次一定能猜中？`,
        },
        scene: { type: "guess_game", max, mode: "you_guess", minGuesses: k },
        answer: { type: "NUMERIC", value: k },
        hints: [
          { en: `Play a few rounds of 1 to ${max} in the scene with "You guess". Which first guess tells you the most, whatever my answer is?`, zh: `在场景里选「你来猜」，玩几局 1 到 ${max}。第一次猜哪个数，不管我怎么回答，你知道得最多？` },
          { en: `Guess ${Math.floor(max / 2)} first: whether I say higher or lower, about half the numbers are gone. Then guess the middle of what's left.`, zh: `先猜 ${Math.floor(max / 2)}：不管我说大还是小，差不多一半的数都被排除了。接着猜剩下那些数的中间。` },
          { en: `Guessing the middle every time, the numbers still possible shrink like this: ${chain.join(", ")}. Once just one is left, your next guess is right. Count the guesses.`, zh: `每次都猜中间，可能的数会这样变少：${chain.join("、")}。只剩一个数的时候，下一次一定猜中。数一数一共猜了几次。` },
        ],
        wrongAnswers: distinctRules(
          [
            { match: String(max / 2), feedback: { en: `${max / 2} is half of the numbers, but you don't stop after halving once. After every guess you can halve what's left again.`, zh: `${max / 2} 是一半的数，可是减半一次就停太早了。每猜一次，都能把剩下的再砍掉一半。` } },
            { match: String(max), feedback: { en: `That's guessing 1, 2, 3 … in order, which really might take ${max} tries. "Higher" and "lower" let you throw away lots of numbers at once.`, zh: `这是按 1、2、3……顺着猜，确实可能要猜 ${max} 次。「大」和「小」能让你一下子排除一大堆数。` } },
            { match: String(fewer), feedback: { en: `So close! ${fewer} guesses can sort out at most ${reach} numbers (${powerSum}), and there are ${max}. On an unlucky day you need one more.`, zh: `很接近了！${fewer} 次最多只能分辨 ${reach} 个数（${powerSum}），可这里有 ${max} 个。运气差的时候还要再猜一次。` } },
            { match: "lt:correct", feedback: { en: `Too few. You might get lucky, but the question says "always": after that many middle guesses, several numbers can still be left.`, zh: "太少了。运气好也许能猜中，可题目问的是「一定」：猜了这么多次中间以后，还可能剩好几个数。" } },
            { match: "gt:correct", feedback: { en: "That always works, but you can do it in fewer. Guess right in the middle of what's left, every single time.", zh: "这样一定能猜中，但还能更少。每一次都猜剩下那些数的正中间。" } },
          ],
          k
        ),
        explanation: {
          en: `Guess the middle each time, so every answer throws away about half of what's left: the numbers still possible go ${chain.join(", ")}. Guess number ${k} hits that last one. ${fewer} guesses aren't enough, because they can tell apart at most ${powerSum} = ${reach} numbers.`,
          zh: `每次都猜中间，不管回答是什么，都能排除剩下的一半左右：可能的数从 ${chain.join(" 个变成 ")} 个。第 ${k} 次就猜中最后那个数。${fewer} 次不够，因为 ${fewer} 次最多只能分辨 ${powerSum} = ${reach} 个数。`,
        },
        aha: {
          en: `Every smart guess cuts the list in half, and halving is fast: ${k} guesses are enough for ${max} numbers.`,
          zh: `每一次聪明的猜测都把范围砍掉一半，而减半非常快：${max} 个数，${k} 次就够了。`,
        },
      };
    },
  }),
};

export const IMPOSSIBLE_PUZZLES: readonly HeroQuestionBlueprint[] = [
  riverCrossing,
  nineBallsBalance,
  threeSwitches,
  bridgeAndTorch,
  fourFours,
  waterJugs,
  fourQueens,
  knightsAndKnaves,
  nineDotsFourLines,
  blindfoldCoins,
  flyBetweenTrains,
  guessMyNumber,
];
