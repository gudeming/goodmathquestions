/**
 * Comment screening for a kids' site (8-14). Deliberately conservative: a hit does not
 * reject the comment, it only holds it for a human (comment.create sets isFlagged), so
 * a false positive costs a short wait, while a false negative is what we must avoid.
 *
 * Layers, in order:
 *   length   2..500 characters after trimming (code points: a Chinese character is one)
 *   url      links and bare domains ("abc.com", "www.", "点com")
 *   contact  emails, CN / US phone numbers, 8+ digit runs that are not part of a formula,
 *            and "add me on WeChat"-style bait in both languages
 *   profanity  bilingual list matched on a normalized form (see normalizeTokens)
 *   spam     one character or a short chunk repeated many times
 *
 * The lists are intentionally small and readable; extend them here, with a test case.
 */

export type ScreenReason = "profanity" | "contact" | "url" | "length" | "spam";
export type ScreenResult = { ok: true } | { ok: false; reason: ScreenReason };

export const COMMENT_MIN_CHARS = 2;
export const COMMENT_MAX_CHARS = 500;

// ---------------------------------------------------------------------------
// Lists
// ---------------------------------------------------------------------------

/** English words matched as whole tokens (after leetspeak mapping). */
const EN_TOKENS = new Set([
  // profanity
  "fuck", "fucks", "fucked", "fucker", "fuckers", "fucking", "fck", "fuk", "fking", "fcking",
  "shit", "shits", "shitty", "bullshit", "sht",
  "bitch", "bitches", "bastard", "bastards",
  "ass", "asses", "asshole", "assholes", "arse", "arsehole",
  "damn", "goddamn", "dammit",
  "dick", "dicks", "dickhead", "cock", "cocks", "prick",
  "pussy", "cunt", "cunts", "twat", "wanker", "bollocks",
  "slut", "sluts", "whore", "whores",
  "piss", "pissed",
  "stfu", "wtf", "gtfo", "sb",
  // slurs
  "fag", "fags", "faggot", "faggots", "nigger", "niggers", "nigga", "niggas",
  "retard", "retards", "retarded", "spaz", "tranny", "chink", "chinks", "gook",
  // mean labels aimed at people
  "idiot", "idiots", "moron", "morons",
  // sexual
  "sex", "sexy", "porn", "porno", "nude", "nudes", "boobs", "boob", "tits",
  "penis", "vagina", "horny", "rape", "raped", "rapist", "onlyfans", "nsfw",
  // self-harm
  "kys", "suicide", "suicidal",
]);

/** English stems that are unambiguous inside a single word ("motherfucker", "shithead"). */
const EN_STEMS = ["fuck", "shit", "bitch", "cunt", "nigg", "fagg", "whore", "porn", "asshole", "dickhead", "slut"];

/** English phrases matched on the space-joined token string. */
const EN_HARM_PHRASES = [
  "kill yourself", "kill your self", "go die", "kill myself", "want to die", "wanna die", "hurt myself",
  "cut myself", "end my life", "hate you",
];

/** Contact bait phrases, matched like EN_HARM_PHRASES. */
const EN_CONTACT_PHRASES = [
  "my number", "my phone", "phone number", "call me", "text me", "dm me", "message me", "add me on",
  "my address", "i live at", "my snap", "my insta", "my discord", "my wechat", "my whatsapp",
  "my email", "email me", "my telegram", "my kik",
];

/** Contact / social handles that should never be shared here, matched as tokens. */
const EN_CONTACT_TOKENS = new Set([
  "snapchat", "instagram", "insta", "whatsapp", "telegram", "discord", "wechat", "weixin", "kik",
  "tiktok", "gmail", "hotmail", "outlook", "yahoo", "qq", "vx",
]);

/** Chinese terms matched as substrings of the squashed text (spaces/punctuation removed). */
const ZH_PROFANITY = [
  // 脏话 / 骂人
  "傻逼", "煞笔", "傻b", "傻比", "沙比", "傻叉", "傻x", "操你", "肏", "草泥马", "艹你", "日你妈", "日你大爷",
  "他妈的", "你妈的", "尼玛", "卧槽", "我操", "我草", "滚蛋", "滚开", "去死",
  "白痴", "弱智", "脑残", "智障", "贱人", "婊子", "狗日", "王八蛋", "混蛋", "废物", "垃圾人",
  "蠢货", "蠢猪", "畜生", "杂种", "死全家",
  // 色情
  "色情", "黄片", "黄色网站", "约炮", "裸照", "裸体", "做爱", "性交", "强奸", "鸡巴", "阴茎", "阴道", "奶子",
  // 自伤
  "自杀", "割腕", "想死", "不想活", "跳楼", "杀了你", "弄死你", "杀死你",
];

/** Chinese "add me / here is my contact" bait. */
const ZH_CONTACT = [
  "加我微信", "加微信", "微信号", "我的微信", "威信", "薇信", "v信", "vx号", "加v",
  "加我qq", "qq号", "我的qq", "扣扣", "加好友", "加我好友", "加群", "进群", "私聊我", "私信我",
  "电话号码", "手机号", "我的电话", "打我电话", "给我打电话", "我家住", "家庭住址", "我的地址",
  "抖音号", "快手号", "邮箱是", "小红书号",
];

// ---------------------------------------------------------------------------
// Regexes (run on NFKC + lowercased text)
// ---------------------------------------------------------------------------

// Short TLDs that are also words kids type after a missing space ("first.Me too") are left out.
const TLDS = "com|net|org|cn|io|co|xyz|top|info|tv|cc|ly|gg|link|site|online|ru|uk|de|jp|hk|tw|edu|gov|biz|club|vip|wang|dev|ai|icu|app";
const URL_RE = new RegExp(
  [
    String.raw`(?:https?|ftp):\/\/`,
    String.raw`\bwww\s*\.`,
    String.raw`\b[a-z0-9-]*[a-z][a-z0-9-]*(?:\.[a-z0-9-]+)*\.(?:${TLDS})\b`,
    String.raw`点\s*(?:com|cn|net|org)`,
    String.raw`\b(?:bit\.ly|t\.co|tinyurl|discord\.gg)\b`,
  ].join("|"),
  "i"
);
const EMAIL_RE = /[a-z0-9._%+-]+\s*(?:@|＠|\(at\)|\[at\])\s*[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,}/i;
/** CN mobile: 11 digits starting 1[3-9], optionally split 3-4-4 by spaces or dashes. */
const CN_PHONE_RE = /(?<!\d)(?:\+?86[\s-]?)?1[3-9]\d(?:[\s-]?\d{4}){2}(?!\d)/;
/** US: (555) 123-4567, 555-123-4567, 555.123.4567, +1 555 123 4567. Separators required. */
const US_PHONE_RE = /(?<!\d)(?:\+?1[\s.-]?)?(?:\(\d{3}\)\s?|\d{3}[\s.-])\d{3}[\s.-]\d{4}(?!\d)/;
/** 8+ digits in a row (QQ numbers, phones without separators). See isFormulaNumber. */
const LONG_DIGITS_RE = /\d{8,}/g;
const MATH_OPERATOR = /[=+\-−×x*·/÷^≈<>≤≥]/;
/**
 * The same letter 12+ times, or a 2-6 letter chunk repeated 8+ times. Letters only:
 * digit runs are math ("2^10 = 10000000000" in binary) and handled by LONG_DIGITS_RE.
 */
const REPEAT_CHAR_RE = /(\p{L})\1{11,}/u;
const REPEAT_CHUNK_RE = /(\p{L}{2,6})\1{7,}/u;

// ---------------------------------------------------------------------------
// Normalization
// ---------------------------------------------------------------------------

const ZERO_WIDTH_RE = /[­͏؜ᅟᅠ឴឵᠎​-‏‪-‮⁠-⁯﻿]/g;
const LEET: Record<string, string> = { "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "8": "b", "9": "g", "@": "a", "$": "s", "!": "i" };

/** NFKC (full-width -> ASCII), lowercase, zero-width characters removed. */
export function canonicalText(text: string): string {
  return text.normalize("NFKC").replace(ZERO_WIDTH_RE, "").toLowerCase();
}

/**
 * Latin tokens for word matching. A token is a run of letters, digits and leet symbols
 * that contains at least one letter ("sh1t" -> "shit", but "1024" or "3.14" are left
 * alone, so ordinary math never turns into words). Runs of 3+ single-letter tokens are
 * glued ("f u c k" -> "fuck"). `*` stays as a one-letter wildcard ("f*ck").
 */
export function normalizeTokens(text: string): string[] {
  const raw = canonicalText(text).match(/[a-z0-9@$!*]+/g) ?? [];
  const tokens: string[] = [];
  for (const t of raw) {
    if (!/[a-z]/.test(t)) continue;
    const mapped = [...t].map((c) => LEET[c] ?? c).join("").replace(/[^a-z*]/g, "");
    if (mapped !== "") tokens.push(mapped);
  }
  const glued: string[] = [];
  let run: string[] = [];
  const flush = () => {
    if (run.length >= 3) glued.push(run.join(""));
    else glued.push(...run);
    run = [];
  };
  for (const t of tokens) {
    if (t.length === 1) run.push(t);
    else {
      flush();
      glued.push(t);
    }
  }
  flush();
  return glued;
}

/** CJK/latin letters only: drops spaces, punctuation and symbols between characters. */
function squash(text: string): string {
  return canonicalText(text).replace(/[^\p{L}\p{N}]/gu, "");
}

function wildcardMatches(token: string, words: Iterable<string>): boolean {
  // "f*ck" yes; "a*s" (a times s) is too short to tell from math.
  if (!token.includes("*") || token.length < 4) return false;
  const re = new RegExp(`^${token.replace(/\*/g, "[a-z]?")}$`);
  for (const w of words) if (re.test(w)) return true;
  return false;
}

/** An 8+ digit run written as part of a formula ("2^64 - 1 = 18446744073709551615") is math. */
function isFormulaNumber(text: string, index: number, length: number): boolean {
  const before = text.slice(Math.max(0, index - 3), index).trim();
  const after = text.slice(index + length, index + length + 3).trim();
  return MATH_OPERATOR.test(before.slice(-1)) || MATH_OPERATOR.test(after.slice(0, 1));
}

// ---------------------------------------------------------------------------
// Screening
// ---------------------------------------------------------------------------

function hasProfanity(tokens: string[], squashed: string): boolean {
  for (const t of tokens) {
    if (EN_TOKENS.has(t)) return true;
    if (EN_STEMS.some((s) => t.includes(s))) return true;
    if (wildcardMatches(t, EN_TOKENS)) return true;
  }
  const joined = ` ${tokens.join(" ")} `;
  if (EN_HARM_PHRASES.some((p) => joined.includes(` ${p} `))) return true;
  return ZH_PROFANITY.some((w) => squashed.includes(w));
}

function hasContactBait(tokens: string[], squashed: string, canonical: string): boolean {
  if (EMAIL_RE.test(canonical) || CN_PHONE_RE.test(canonical) || US_PHONE_RE.test(canonical)) return true;
  for (const m of canonical.matchAll(LONG_DIGITS_RE)) {
    if (!isFormulaNumber(canonical, m.index ?? 0, m[0].length)) return true;
  }
  if (tokens.some((t) => EN_CONTACT_TOKENS.has(t))) return true;
  const joined = ` ${tokens.join(" ")} `;
  if (EN_CONTACT_PHRASES.some((p) => joined.includes(` ${p} `))) return true;
  return ZH_CONTACT.some((w) => squashed.includes(w));
}

/** Code-point length after trimming (what the 2..500 rule counts). */
export function commentLength(text: string): number {
  return [...text.trim()].length;
}

/**
 * Screens one comment. `{ ok: true }` means it can be shown right away; otherwise the
 * reason says which layer caught it ("length" is the only one the caller rejects outright).
 */
export function screenComment(text: string): ScreenResult {
  const len = commentLength(text);
  if (len < COMMENT_MIN_CHARS || len > COMMENT_MAX_CHARS) return { ok: false, reason: "length" };

  const canonical = canonicalText(text);
  // An email contains a domain, so it is checked first to report the more useful reason.
  if (EMAIL_RE.test(canonical)) return { ok: false, reason: "contact" };
  if (URL_RE.test(canonical)) return { ok: false, reason: "url" };

  const tokens = normalizeTokens(text);
  const squashed = squash(text);
  if (hasContactBait(tokens, squashed, canonical)) return { ok: false, reason: "contact" };
  if (hasProfanity(tokens, squashed)) return { ok: false, reason: "profanity" };

  const compact = canonical.replace(/[^\p{L}]/gu, "");
  if (REPEAT_CHAR_RE.test(compact) || REPEAT_CHUNK_RE.test(compact)) return { ok: false, reason: "spam" };
  return { ok: true };
}
