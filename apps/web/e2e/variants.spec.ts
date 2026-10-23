import { expect, test } from "@playwright/test";

/**
 * "Try another number" on handshake-party (seeded hero question with variants people6/8/9/12).
 *   E2E_BASE_URL=http://localhost:3000 npx playwright test e2e/variants.spec.ts
 */
const BASE = process.env.E2E_BASE_URL;

const handshakes = (variantId: string) => {
  const n = Number(variantId.replace("people", ""));
  return { n, answer: (n * (n - 1)) / 2 };
};

test.describe("try another number", () => {
  test.skip(!BASE, "Set E2E_BASE_URL to run.");

  test("guest: standard version → reveal → variant (wrong → feedback → correct) → another → back", async ({ page }) => {
    await page.goto("/en/questions/handshake-party");
    await page.getByTestId("stage-hook").getByRole("button", { name: /skip/i }).click();
    await page.getByTestId("answer-input").fill("45");
    await page.getByTestId("check-answer").click();
    await expect(page.getByTestId("stage-reveal")).toBeVisible();

    const play = page.getByTestId("variant-play");
    await expect(play).toBeVisible();
    await expect(page.getByTestId("variant-progress")).toHaveText("0/4");
    await page.getByTestId("variant-start").click();

    const round = page.getByTestId("variant-round");
    await expect(round).toHaveAttribute("data-phase", "explore");
    const first = (await round.getAttribute("data-variant"))!;
    const { n, answer } = handshakes(first);
    await expect(round.getByText(`${n} friends each shake hands`)).toBeVisible();

    // The standard answer is not this variant's answer; n × (n − 1) gets its own feedback.
    await round.getByTestId("answer-input").fill(String(n * (n - 1)));
    await round.getByTestId("check-answer").click();
    await expect(round.getByTestId("wrong-answer-coach")).toContainText(`${n} × ${n - 1}`);

    await round.getByTestId("answer-input").fill(String(answer));
    await round.getByTestId("check-answer").click();
    await expect(round).toHaveAttribute("data-phase", "reveal");
    await expect(page.getByTestId("variant-aha")).toContainText(`${answer} handshakes`);
    await expect(page.getByTestId("variant-progress")).toHaveText("1/4");

    await page.getByTestId("variant-next").click();
    await expect(round).toHaveAttribute("data-phase", "explore");
    await expect(round).not.toHaveAttribute("data-variant", first);

    await page.getByTestId("variant-back").click();
    await expect(round).toHaveCount(0);
    await expect(page.getByTestId("variant-start")).toBeVisible();
  });

  test("the world page marks questions that have other numbers", async ({ page }) => {
    await page.goto("/zh/worlds/huge-numbers");
    await expect(page.getByTestId("variant-badge").first()).toContainText("可换数 ×4");
  });
});
