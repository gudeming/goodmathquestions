import { expect, test, type Page } from "@playwright/test";

/**
 * Chompulator (/chompulator, a static page in public/). Runs against a running server:
 *   E2E_BASE_URL=http://localhost:3000 npx playwright test e2e/chompulator.spec.ts
 */
test.skip(!process.env.E2E_BASE_URL, "Set E2E_BASE_URL to run the Chompulator checks against a running server.");

const SAVE_KEY = "chompulator.save.v1";

/** Opens the page with an empty save and collects every console error / page error. */
async function open(page: Page, save?: unknown) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  await page.addInitScript(
    ([key, value]) => {
      if (window.sessionStorage.getItem("chomp-e2e-seeded")) return;
      window.sessionStorage.setItem("chomp-e2e-seeded", "1");
      window.localStorage.clear();
      if (value) window.localStorage.setItem(key as string, value as string);
    },
    [SAVE_KEY, save ? JSON.stringify(save) : ""],
  );
  await page.goto("/chompulator");
  await expect(page.locator("#keys")).toBeVisible();
  return errors;
}

const out = (page: Page) => page.locator("#out");
const nospace = (s: string | null) => (s ?? "").replace(/\s+/g, "");

test("BASIC still computes 7 × 6 = 42 and only unlocks FIRST BITE (or a lucky crit)", async ({ page }) => {
  const errors = await open(page);
  for (const k of ["7", "×", "6", "="]) await page.locator(`#keys [data-k="${k}"]`).click();
  await expect(out(page)).toHaveAttribute("aria-label", "42");
  const got = await page.locator(".sticker.got").evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.id));
  expect(got).toContain("first");
  expect(got.filter((id) => id !== "first" && id !== "crit")).toEqual([]);
  await expect(page.locator("#stickerCount")).toHaveText(new RegExp(`^${got.length} / 40$`));
  expect(errors).toEqual([]);
});

test("SCI: sin(30) in DEG is exactly 0.5", async ({ page }) => {
  const errors = await open(page);
  await page.locator("#tab-sci").click();
  await expect(page.locator("#sciPad")).toBeVisible();
  await expect(page.locator('#sciPad [data-sk="angle"]')).toHaveText("DEG");
  for (const k of ["sin", "3", "0", ")", "="]) await page.locator(`#sciPad [data-sk="${k}"]`).click();
  await expect(page.locator("#expr")).toHaveText("sin(30) =");
  await expect(out(page)).toHaveAttribute("aria-label", "0.5");
  // keyboard too: tan(45) = 1
  await page.keyboard.press("Escape");
  await page.keyboard.type("t45)");
  await page.keyboard.press("Enter");
  await expect(out(page)).toHaveAttribute("aria-label", "1");
  // domain error is typed, not a crash
  for (const k of ["ac", "2nd", "sin", "2", "="]) await page.locator(`#sciPad [data-sk="${k}"]`).click();
  await expect(out(page)).toHaveAttribute("aria-label", "domain error");
  expect(errors).toEqual([]);
});

test("BITS: FF in HEX is 255 / 11111111; flipping bit 0 gives 254", async ({ page }) => {
  const errors = await open(page);
  await page.locator("#tab-bits").click();
  await page.locator('#bases [data-base="HEX"]').click();
  await expect(page.locator('#bitsKeys [data-bk="F"]')).toBeEnabled();
  await page.locator('#bitsKeys [data-bk="F"]').click();
  await page.locator('#bitsKeys [data-bk="F"]').click();
  await expect(page.locator("#bvDEC")).toHaveText("255");
  expect(nospace(await page.locator("#bvBIN").textContent())).toBe("11111111");
  expect(nospace(await page.locator("#bvOCT").textContent())).toBe("377");
  await page.locator('#bitGrid .bit[data-i="0"]').click();
  await expect(page.locator("#bvDEC")).toHaveText("254");
  await expect(page.locator('#bitGrid .bit[data-i="0"]')).toHaveAttribute("aria-pressed", "false");
  // BIN only allows 0 and 1
  await page.locator('#bases [data-base="BIN"]').click();
  await expect(page.locator('#bitsKeys [data-bk="2"]')).toBeDisabled();
  expect(errors).toEqual([]);
});

test("FLOAT: 0.1 shows mantissa 0x4CCCCD and its exact stored value", async ({ page }) => {
  const errors = await open(page);
  await page.locator("#tab-float").click();
  const input = page.locator("#floatIn");
  await input.fill("0.1");
  await input.press("Enter");
  const f32 = page.locator('.fl-col[data-w="32"]');
  await expect(f32.locator('[data-f="hex"]')).toHaveText("0x3DCCCCCD");
  await expect(f32.locator('[data-f="man"]')).toContainText("0x4CCCCD");
  await expect(f32.locator('[data-f="exact"]')).toHaveText("0.100000001490116119384765625");
  await expect(f32.locator('[data-f="exp"]')).toContainText("123");
  // the 0.1 + 0.2 demo
  await page.getByRole("button", { name: "X-ray 0.1 + 0.2" }).click();
  await expect(out(page)).toContainText("0.30000000000000004");
  await expect(page.locator('.sticker[data-id="float"]')).toHaveClass(/got/);
  expect(errors).toEqual([]);
});

test("mode strip is a keyboard-navigable tablist", async ({ page }) => {
  const errors = await open(page);
  await expect(page.getByRole("tablist", { name: "Calculator mode" })).toBeVisible();
  await page.locator("#tab-basic").focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.locator("#tab-sci")).toBeFocused();
  await expect(page.locator("#tab-sci")).toHaveAttribute("aria-selected", "true");
  await expect(page.locator("#sciPad")).toBeVisible();
  await expect(page.locator("#keys")).toBeHidden();
  await page.keyboard.press("End");
  await expect(page.locator("#tab-float")).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("ArrowRight");
  await expect(page.locator("#tab-basic")).toHaveAttribute("aria-selected", "true");
  await expect(page.locator("#keys")).toBeVisible();
  expect(errors).toEqual([]);
});

test("an old v1 save (no calc fields) still loads", async ({ page }) => {
  const errors = await open(page, {
    xp: 40, level: 7, solves: 120, presses: 900, questsDone: 6, best: 9001, bosses: 2, quizBest: 11,
    stickers: ["first", "deci", "frac", "boss1", "quiz10", "retired-sticker"],
    skin: "neon", mixedMode: false, fracMode: true, sfxOn: false,
  });
  await expect(page.locator("#lvlNum")).toHaveText("7");
  // the 5 shipped stickers survive (the retired id is dropped), plus EVOLVED, which a level-7 save earns on boot
  await expect(page.locator("#stickerCount")).toHaveText("6 / 40");
  await expect(page.locator("body")).toHaveAttribute("data-skin", "neon");
  await expect(page.locator("#tab-basic")).toHaveAttribute("aria-selected", "true");
  // the next save keeps the old fields and adds the new "calc" block
  await page.locator("#tab-sci").click();
  const saved = await page.evaluate((k) => JSON.parse(localStorage.getItem(k) ?? "{}"), SAVE_KEY);
  expect(saved).toMatchObject({ level: 7, skin: "neon", bosses: 2, calc: { mode: "sci", angle: "DEG", word: 8 } });
  expect(saved.stickers).toHaveLength(6);
  expect(errors).toEqual([]);
});

test("valid structure: no duplicate ids, every key labelled, no horizontal scroll at 390 px", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors = await open(page);
  const dupes = await page.evaluate(() => {
    const ids = [...document.querySelectorAll("[id]")].map((e) => e.id);
    return ids.filter((id, i) => ids.indexOf(id) !== i);
  });
  expect(dupes).toEqual([]);
  for (const mode of ["basic", "sci", "bits", "float"]) {
    await page.locator(`#tab-${mode}`).click();
    const unlabelled = await page.evaluate(() =>
      [...document.querySelectorAll(".key")].filter((k) => !k.getAttribute("aria-label")).length,
    );
    expect(unlabelled).toBe(0);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, `horizontal scroll in ${mode}`).toBeLessThanOrEqual(0);
  }
  await page.locator("#tab-bits").click();
  await page.locator('#wordSeg [data-word="64"]').click();
  await page.locator('#bases [data-base="BIN"]').click();
  for (let i = 0; i < 64; i++) await page.locator('#bitsKeys [data-bk="1"]').click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
  await page.locator("#tab-float").click();
  await page.locator('#floatWidth [data-show="64"]').click();
  await expect(page.locator('.fl-col[data-w="64"]')).toBeVisible();
  await expect(page.locator('.fl-col[data-w="32"]')).toBeHidden();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
  expect(errors).toEqual([]);
});
