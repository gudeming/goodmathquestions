/**
 * World C · Chance & luck (`chance-and-luck`). Catalog: 02-hero-question-catalog.md §C.
 * Batch 1: C2 monty-hall.
 * TODO(phase-3 batch 2): C1 birthday-paradox, C3 two-dice-sum and the rest once
 * birthday_room and dice_lab land.
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

export const CHANCE_AND_LUCK: readonly HeroQuestionBlueprint[] = [montyHall];
