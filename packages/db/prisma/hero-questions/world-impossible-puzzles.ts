/**
 * World F · Impossible puzzles (`impossible-puzzles`). Catalog: 02-hero-question-catalog.md §F.
 * Batch 2: F1 river-crossing, F2 nine-balls-balance, F3 three-switches, F8 knights-and-knaves.
 * F3 and F8 use `illustration` until the T3 switch_room / dialogue_cards scenes exist.
 * TODO(phase-3 batch 3): F4 (bridge_torch), F5 (expression_builder), F6 (water_jugs),
 * F7 (queens_board), F9 (dot_connect), F10 (coin_piles), F11 (trains_fly), F12 (guess_game).
 * F12 guess-my-number is this world's second AGE_8_10 question.
 * Editorial pass 1: hints name the scenes' buttons; the two illustration scenes now carry a
 * revealCaption so Act 3 says something new; F8 got a story hook and a four-case table path.
 */
import type { HeroQuestionBlueprint } from "./_template";

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

export const IMPOSSIBLE_PUZZLES: readonly HeroQuestionBlueprint[] = [riverCrossing, nineBallsBalance, threeSwitches, knightsAndKnaves];
