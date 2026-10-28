import { chromium } from "playwright";

const BASE = "http://localhost:3002";

async function signIn(page, email, password) {
  await page.goto(`${BASE}/sign-in`);
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL(/\/(student|teacher|admin)/, { timeout: 10000 });
}

const browser = await chromium.launch();
const page = await browser.newPage();
page.on("console", (msg) => {
  if (msg.type() === "error") console.log("[browser console error]", msg.text());
});
page.on("pageerror", (err) => console.log("[browser pageerror]", err.message));

console.log("--- Signing in as teacher1@satps.edu ---");
await signIn(page, "teacher1@satps.edu", "Password123!");
console.log("URL after sign-in:", page.url());

console.log("--- Navigating to /teacher/grades ---");
await page.goto(`${BASE}/teacher/grades`);
await page.waitForTimeout(1500);
await page.screenshot({ path: "/tmp/claude-1000/-home-ghost-projects-exper-senior-ui/7cb2351a-a74a-4b94-94ea-752fb9ca6bdf/scratchpad/grades-before.png", fullPage: true });

// Find the first numeric score input in the grade grid and change its value.
const inputs = page.locator("table input");
const count = await inputs.count();
console.log("Grade input count:", count);
if (count > 0) {
  const first = inputs.first();
  const before = await first.inputValue();
  console.log("First input value before:", before);
  await first.fill("");
  const newValue = String((Number(before) || 70) + 1);
  await first.fill(newValue);
  await first.blur();
  console.log("Set value to:", newValue);

  const saveButton = page.getByRole("button", { name: /save/i }).first();
  await saveButton.click();
  await page.waitForTimeout(2000);
  console.log("Clicked save.");
}

await page.screenshot({ path: "/tmp/claude-1000/-home-ghost-projects-exper-senior-ui/7cb2351a-a74a-4b94-94ea-752fb9ca6bdf/scratchpad/grades-after.png", fullPage: true });

console.log("--- Navigating to /teacher/attendance ---");
await page.goto(`${BASE}/teacher/attendance`);
await page.waitForTimeout(1500);
const markAllBtn = page.getByRole("button", { name: /mark all present/i });
if (await markAllBtn.count()) {
  await markAllBtn.click();
  await page.getByRole("button", { name: /save attendance/i }).click();
  await page.waitForTimeout(2000);
  console.log("Marked and saved attendance.");
}

console.log("--- Navigating to /teacher/risks to add a note ---");
await page.goto(`${BASE}/teacher/risks`);
await page.waitForTimeout(1500);
const noteInput = page.getByPlaceholder(/add a note/i).first();
if (await noteInput.count()) {
  await noteInput.fill("Playwright verification note " + Date.now());
  await page.getByRole("button", { name: /^add$/i }).first().click();
  await page.waitForTimeout(2000);
  console.log("Added teacher note.");
} else {
  console.log("No note input found (no at-risk students yet?).");
}

await browser.close();
console.log("--- Done ---");
