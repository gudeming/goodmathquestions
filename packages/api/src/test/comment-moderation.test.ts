import { describe, expect, it } from "vitest";
import { normalizeTokens, screenComment, type ScreenReason } from "../moderation/wordlist";

const CLEAN: string[] = [
  "I paired 1 with 100, 2 with 99, and every pair makes 101!",
  "1/2 + 1/4 = 3/4",
  "x = 5",
  "pi is about 3.14",
  "2^10 = 1024",
  "My grandpa was born in 1958, so he would have known this trick.",
  "我把数字两两配对，每一对加起来都是101，一共50对。",
  "我先画了一张图，然后发现规律了！",
  "换门的赢面是 2/3，不换只有 1/3。",
  "The answer is 5050 because 100 × 101 ÷ 2 = 5050.",
  "2^64 - 1 = 18446744073709551615 grains, that is huge",
  "I tried small numbers first: 1+2=3, 1+2+3=6, then saw the pattern.",
  "I solved it first. Me too, it was fun.",
  "Let a = 3 and b = 4, then a² + b² = 25.",
  "In binary, 1024 = 10000000000",
  "哈哈，我一开始猜错了，后来用倒推法做出来了",
  "I made a silly mistake and forgot to divide by 2",
  "Class, pass the assessment: grape and cocktail are fine words.",
  "1.5 cm + 2.5 cm = 4 cm",
  "我妈妈的生日是3月14日，正好是圆周率日！",
  "Is it 12 or 13? I think 12.",
  "e.g. try n = 10, i.e. the 10th triangle number",
];

const BLOCKED: Array<[string, ScreenReason]> = [
  ["what the fuck is this", "profanity"],
  ["this is sh1t", "profanity"],
  ["f u c k this", "profanity"],
  ["f*ck", "profanity"],
  ["you are an idiot", "profanity"],
  ["motherfucker", "profanity"],
  ["你是傻逼", "profanity"],
  ["你 傻 逼 吧", "profanity"],
  ["卧槽太难了", "profanity"],
  ["我想自杀", "profanity"],
  ["go kill yourself", "profanity"],
  ["加我微信 abc123", "contact"],
  ["加 我 微 信", "contact"],
  ["my number is 555-123-4567", "contact"],
  ["call 13812345678", "contact"],
  ["138 1234 5678 打给我", "contact"],
  ["qq 12345678", "contact"],
  ["email me at kid@example.com", "contact"],
  ["add me on snapchat", "contact"],
  ["check https://example.com", "url"],
  ["go to www.games.cc", "url"],
  ["visit coolmath.io now", "url"],
  ["a", "length"],
  ["x".repeat(501), "length"],
  ["   ", "length"],
  ["aaaaaaaaaaaaaaaaaaaa", "spam"],
  ["lolololololololololololol", "spam"],
];

describe("screenComment", () => {
  it.each(CLEAN)("lets ordinary text through: %s", (text) => {
    expect(screenComment(text)).toEqual({ ok: true });
  });

  it.each(BLOCKED)("holds %j for %s", (text, reason) => {
    expect(screenComment(text)).toEqual({ ok: false, reason });
  });

  it("counts a Chinese character as one character", () => {
    expect(screenComment("好题")).toEqual({ ok: true });
    expect(screenComment("好".repeat(500))).toEqual({ ok: false, reason: "spam" });
    expect(screenComment("好题".repeat(5) + "x".repeat(491))).toEqual({ ok: false, reason: "length" });
    expect(screenComment("好题".repeat(5) + "很".repeat(10))).toEqual({ ok: true });
  });

  it("normalizes full-width text and zero-width characters", () => {
    expect(screenComment("ｆｕｃｋ")).toEqual({ ok: false, reason: "profanity" });
    expect(screenComment("fu​ck")).toEqual({ ok: false, reason: "profanity" });
  });
});

describe("normalizeTokens", () => {
  it("maps leetspeak only inside words and glues spaced-out letters", () => {
    expect(normalizeTokens("a55 and 3.14")).toEqual(["ass", "and"]);
    expect(normalizeTokens("s h i t")).toEqual(["shit"]);
    expect(normalizeTokens("x = 5")).toEqual(["x"]);
  });
});
