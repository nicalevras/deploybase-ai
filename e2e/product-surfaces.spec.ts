import { expect, test } from "@playwright/test";

const routes = [
  ["research", "/"],
  ["gpu-explorer", "/gpus"],
  ["gpu-provider", "/gpus/runpod"],
  ["gpu-model", "/gpus/models/nvidia-h100"],
  ["llm-explorer", "/llms"],
  ["llm-provider", "/llms/openai"],
  ["mlops-explorer", "/tools"],
  ["articles", "/articles"],
  ["article-category", "/articles/category/gpu-pricing"],
  ["article", "/articles/claude-vs-gpt-4"],
  ["privacy", "/privacy"],
  ["terms", "/terms"],
  ["reset-password", "/reset-password"],
  ["not-found", "/definitely-not-a-deploybase-route"],
] as const;

test.describe("product page families", () => {
  for (const [name, route] of routes) {
    test(`${name} renders without layout or hydration failures`, async ({
      page,
    }, testInfo) => {
      const runtimeErrors: string[] = [];
      page.on("pageerror", (error) => runtimeErrors.push(error.message));
      page.on("console", (message) => {
        if (
          message.type() === "error" &&
          /hydration|did not match/i.test(message.text())
        ) {
          runtimeErrors.push(message.text());
        }
      });

      const response = await page.goto(route, {
        waitUntil: "domcontentloaded",
      });
      expect(response?.status() ?? 500).toBeLessThan(500);
      await expect(page.locator("h1").first()).toBeVisible();
      await page.waitForTimeout(300);

      const horizontalOverflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      );
      expect(horizontalOverflow).toBeLessThanOrEqual(2);
      expect(runtimeErrors).toEqual([]);

      await page.screenshot({
        path: testInfo.outputPath(`${name}.png`),
        fullPage: !route.includes("explorer"),
      });
    });
  }
});

test("auth and settings overlays remain usable", async ({ page }, testInfo) => {
  await page.goto("/?auth=signin", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("heading", { name: /sign in/i })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("auth-dialog.png") });
  await page.goto("/", { waitUntil: "domcontentloaded" });

  await page.getByRole("button", { name: "Account" }).click();
  await page.getByRole("menuitem", { name: "Settings" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByText("Send us a message")).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("settings-dialog.png") });
});

test("legacy GPU queries redirect without consuming campaign-only URLs", async ({
  page,
}) => {
  await page.goto("/?utm_source=launch", { waitUntil: "domcontentloaded" });
  expect(new URL(page.url()).pathname).toBe("/");

  await page.goto("/?gpu_model=NVIDIA+H100&utm_source=launch", {
    waitUntil: "domcontentloaded",
  });
  const redirected = new URL(page.url());
  expect(redirected.pathname).toBe("/gpus");
  expect(redirected.searchParams.get("gpu_model")).toBe("NVIDIA H100");
  expect(redirected.searchParams.get("utm_source")).toBe("launch");
});

test("legacy article searches redirect without consuming campaign-only URLs", async ({
  page,
}) => {
  await page.goto("/articles?utm_source=archive", {
    waitUntil: "domcontentloaded",
  });
  expect(new URL(page.url()).pathname).toBe("/articles");

  await page.goto("/articles?search=H100+pricing&utm_source=archive", {
    waitUntil: "domcontentloaded",
  });
  const redirected = new URL(page.url());
  expect(redirected.pathname).toBe("/articles/search");
  expect(redirected.searchParams.get("search")).toBe("H100 pricing");
  expect(redirected.searchParams.get("utm_source")).toBe("archive");
});

test("article collection structured data and archive links stay consistent", async ({
  page,
}) => {
  await page.goto("/articles", { waitUntil: "domcontentloaded" });
  const collection = await getCollectionJsonLd(page);
  expect(collection.mainEntity.numberOfItems).toBe(
    collection.mainEntity.itemListElement.length,
  );

  const archive = page.locator('section[aria-labelledby="archive-title"]');
  const declaredCounts = await archive
    .locator("details summary .numeric")
    .allTextContents();
  const declaredTotal = declaredCounts.reduce(
    (total, value) => total + Number.parseInt(value, 10),
    0,
  );
  const archiveLinks = await archive
    .locator('a[href^="/articles/"]')
    .count();
  expect(archiveLinks).toBe(declaredTotal);

  await page.goto("/articles/category/gpu-pricing", {
    waitUntil: "domcontentloaded",
  });
  const categoryCollection = await getCollectionJsonLd(page);
  expect(categoryCollection.mainEntity.numberOfItems).toBe(
    categoryCollection.mainEntity.itemListElement.length,
  );
});

test("research selection routes return stable uncached validation errors", async ({
  request,
}) => {
  for (const route of ["/api/research/gpus", "/api/research/llms"]) {
    const response = await request.get(route);
    expect(response.status()).toBe(400);
    expect(response.headers()["cache-control"]).toBe("private, no-store");
    expect(await response.json()).toEqual({
      error:
        route.endsWith("gpus")
          ? "A valid GPU model is required."
          : "A valid LLM model is required.",
    });
  }

  for (const route of [
    "/api/research/gpus?model=__missing__",
    "/api/research/llms?permaslug=__missing__",
  ]) {
    const response = await request.get(route);
    expect(response.status()).toBe(404);
    expect(response.headers()["cache-control"]).toBe("private, no-store");
    expect(await response.json()).toEqual({
      error: route.includes("/gpus")
        ? "GPU model is not available."
        : "LLM model is not available.",
    });
  }
});

async function getCollectionJsonLd(page: import("@playwright/test").Page) {
  const schemas = await page
    .locator('script[type="application/ld+json"]')
    .evaluateAll((elements) =>
      elements.map((element) => JSON.parse(element.textContent ?? "{}")),
    );
  const collection = schemas.find(
    (schema) => schema["@type"] === "CollectionPage",
  );
  expect(collection).toBeTruthy();
  return collection as {
    mainEntity: {
      numberOfItems: number;
      itemListElement: unknown[];
    };
  };
}
