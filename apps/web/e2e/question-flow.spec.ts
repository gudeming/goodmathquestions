import { expect, test, type Page } from "@playwright/test";

/**
 * Three-act question flow (Phase 4). Runs against a running server:
 *   E2E_BASE_URL=http://localhost:3200 E2E_HERO_SLUG=gauss-sum E2E_HERO_ANSWER=5050 \
 *     npx playwright test e2e/question-flow.spec.ts
 * Optional: E2E_HERO_WRONG (default "1"), E2E_HERO_ID (checks the id → slug redirect),
 * E2E_DRILL_ID (legacy DRILL question id).
 */
const BASE = process.env.E2E_BASE_URL;
const SLUG = process.env.E2E_HERO_SLUG;
const ANSWER = process.env.E2E_HERO_ANSWER;
const WRONG = process.env.E2E_HERO_WRONG ?? "1";
const HERO_ID = process.env.E2E_HERO_ID;
const DRILL_ID = process.env.E2E_DRILL_ID;

/** Picks a guess whatever the control is: the first option card, or the slider as it is. */
async function makeGuess(page: Page, buttonName: RegExp) {
  const stage = page.getByTestId("stage-hook");
  const radios = stage.getByRole("radio");
  if ((await radios.count()) > 0) await radios.first().click();
  await stage.getByRole("button", { name: buttonName }).click();
}

/** Types into the answer box, or picks the option card with that label (CHOICE). */
async function answerWith(page: Page, value: string) {
  const input = page.getByTestId("answer-input");
  if ((await input.count()) > 0) {
    await input.first().fill(value);
  } else {
    await page.getByTestId("stage-explore").getByRole("radio", { name: value }).click();
  }
  await page.getByTestId("check-answer").click();
}

test.describe("hero question: three acts", () => {
  test.skip(!BASE || !SLUG, "Set E2E_BASE_URL and E2E_HERO_SLUG to run the three-act flow.");

  test("guest: hook → guess → histogram → explore → wrong → coach → hint → correct → reveal", async ({ page }) => {
    test.skip(!ANSWER, "Set E2E_HERO_ANSWER to the correct answer.");
    await page.goto(`/en/questions/${SLUG}`);

    await expect(page.getByTestId("stage-hook")).toBeVisible();
    await makeGuess(page, /make a guess/i);
    await expect(page.getByTestId("guess-histogram")).toBeVisible();
    await page.getByTestId("continue-explore").click();

    await expect(page.getByTestId("stage-explore")).toBeVisible();
    await answerWith(page, WRONG);
    await expect(page.getByTestId("wrong-answer-coach")).toBeVisible();
    await expect(page.getByTestId("wrong-answer-coach")).not.toBeEmpty();

    await page.getByTestId("hint-button").click();
    await expect(page.getByTestId("hint-ladder").getByRole("listitem")).toHaveCount(1);

    await answerWith(page, ANSWER!);
    await expect(page.getByTestId("stage-reveal")).toBeVisible();
    const aha = page.getByTestId("aha-card");
    await expect(aha).toBeVisible();
    await expect(aha.locator("p").nth(1)).not.toBeEmpty();
    await expect(page.getByTestId("discussion")).toBeVisible();
  });

  test("refresh restores the act from localStorage", async ({ page }) => {
    await page.goto(`/en/questions/${SLUG}`);
    await page.getByTestId("stage-hook").getByRole("button", { name: /skip/i }).click();
    await expect(page.getByTestId("stage-explore")).toBeVisible();
    await page.reload();
    await expect(page.getByTestId("stage-explore")).toBeVisible();
  });

  test("keyboard only: guess and answer without a mouse", async ({ page }) => {
    test.skip(!ANSWER, "Set E2E_HERO_ANSWER to the correct answer.");
    await page.goto(`/en/questions/${SLUG}`);
    await expect(page.getByTestId("stage-hook")).toBeVisible();

    const radios = page.getByTestId("stage-hook").getByRole("radio");
    if ((await radios.count()) > 0) {
      await radios.first().focus();
      await page.keyboard.press("ArrowDown"); // arrows move and select
      await expect(radios.nth(1)).toHaveAttribute("aria-checked", "true");
      await page.keyboard.press("Space");
    } else {
      await page.getByRole("slider").focus();
      await page.keyboard.press("ArrowRight");
    }
    const guessButton = page.getByRole("button", { name: /make a guess/i });
    await guessButton.focus();
    await page.keyboard.press("Enter");
    const next = page.getByTestId("continue-explore");
    await expect(next).toBeVisible();
    await next.focus();
    await page.keyboard.press("Enter");

    await expect(page.getByTestId("stage-explore")).toBeVisible();
    const input = page.getByTestId("answer-input");
    test.skip((await input.count()) === 0, "keyboard answer path covers typed answer types");
    await input.focus();
    await page.keyboard.type(ANSWER!);
    await page.keyboard.press("Enter");
    await expect(page.getByTestId("stage-reveal")).toBeVisible();
  });

  test("zh: the hook and the guess button are in Chinese", async ({ page }) => {
    await page.goto(`/zh/questions/${SLUG}`);
    await expect(page.getByTestId("stage-hook")).toBeVisible();
    await expect(page.getByRole("button", { name: /我先猜一下/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /跳过/ })).toBeVisible();
  });

  test("an id URL redirects to the slug URL", async ({ page }) => {
    test.skip(!HERO_ID, "Set E2E_HERO_ID to check the redirect.");
    await page.goto(`/en/questions/${HERO_ID}`);
    await expect(page).toHaveURL(new RegExp(`/questions/${SLUG}$`));
  });
});

test.describe("legacy DRILL question", () => {
  test.skip(!BASE || !DRILL_ID, "Set E2E_BASE_URL and E2E_DRILL_ID to run the DRILL spec.");

  test("opens by id, no empty animation card, no 'Animation type' placeholder", async ({ page }) => {
    await page.goto(`/en/questions/${DRILL_ID}`);
    await expect(page.getByTestId("drill-question")).toBeVisible();
    await expect(page.getByText(/Animation type/i)).toHaveCount(0);

    const card = page.getByTestId("scene-card");
    if ((await card.count()) > 0) {
      // A scene card may only exist with a rendered scene inside it.
      await expect(card.locator("*").first()).toBeVisible();
      const box = await card.boundingBox();
      expect(box?.height ?? 0).toBeGreaterThan(80);
    }
    await expect(page.getByTestId("answer-input")).toBeVisible();
  });
});
