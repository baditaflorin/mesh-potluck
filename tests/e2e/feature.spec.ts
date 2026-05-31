import { expect, test } from "@playwright/test";
import { openTwoPeers } from "@baditaflorin/mesh-common/testing";
import { readFileSync } from "node:fs";

const pkg = JSON.parse(readFileSync(new URL("../../package.json", import.meta.url), "utf8")) as {
  name: string;
};
const storagePrefix = pkg.name;

/**
 * Advertised core action: "Who's bringing what — live de-dupe so you don't
 * end up with 6 salads." The falsifiable claim is twofold:
 *   1. an item one peer adds is visible on the OTHER peer (basic sync), and
 *   2. when two DIFFERENT peers bring the same dish, BOTH peers see the
 *      live de-dupe warning (×2 + .is-dupe) — that is the whole point of
 *      the app, and it has to cross the mesh in both directions.
 */
test("an item added on A appears on B, and a same-dish collision flags ×2 on both peers", async ({
  browser,
  baseURL,
}) => {
  const { a, b, cleanup } = await openTwoPeers(browser, baseURL ?? "", { storagePrefix });
  try {
    await a.getByPlaceholder("your name").fill("alice");
    await b.getByPlaceholder("your name").fill("bob");
    await a.waitForTimeout(400);

    // Peer A brings a salad.
    await a.getByPlaceholder("I'll bring…").fill("Salad");
    await a.getByRole("button", { name: "add", exact: true }).click();

    // Cross-peer #1: B sees A's item with A's name attached.
    const bRow = b.locator(".pot-item").filter({ hasText: "Salad" });
    await expect(bRow).toHaveCount(1);
    await expect(bRow).toContainText("alice");

    // Before the collision, A's lone salad is NOT a dupe.
    const aRow = a.locator(".pot-item").filter({ hasText: "Salad" });
    await expect(aRow).not.toHaveClass(/is-dupe/);
    await expect(a.locator(".pot-item-warn")).toHaveCount(0);

    // Peer B brings the same dish (case-insensitive: "salad" vs "Salad").
    await b.getByPlaceholder("I'll bring…").fill("salad");
    await b.getByRole("button", { name: "add", exact: true }).click();

    // Cross-peer #2 (the heart of the app): the live de-dupe must light up on
    // BOTH peers — the opposite peer from whoever just added. Two salad rows
    // each flagged ×2 with the is-dupe class, on A and on B.
    for (const page of [a, b]) {
      const dupeRows = page.locator(".pot-item.is-dupe");
      await expect(dupeRows).toHaveCount(2);
      await expect(page.locator(".pot-item-warn")).toHaveCount(2);
      await expect(page.locator(".pot-item-warn").first()).toHaveText("×2");
    }

    // And it is reactive: B removes its own salad → the warning clears on BOTH
    // peers, proving the de-dupe is recomputed live across the mesh, not a
    // sticky one-shot.
    await b
      .locator(".pot-item")
      .filter({ hasText: "salad" })
      .getByRole("button", { name: "×" })
      .click();
    for (const page of [a, b]) {
      await expect(page.locator(".pot-item")).toHaveCount(1);
      await expect(page.locator(".pot-item-warn")).toHaveCount(0);
      await expect(page.locator(".pot-item.is-dupe")).toHaveCount(0);
    }
  } finally {
    await cleanup();
  }
});
