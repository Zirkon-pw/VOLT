import { test, expect } from '@playwright/test';

const modKey = process.platform === 'darwin' ? 'Meta' : 'Control';

async function gotoHarness(page: import('@playwright/test').Page) {
  await page.goto('/__playwright__/editor');
  await expect(page.getByTestId('playwright-editor-harness')).toBeVisible();
  await expect(page.locator('.ProseMirror')).toContainText('Alpha paragraph');
}

test.beforeEach(async ({ page }) => {
  await gotoHarness(page);
});

test('keeps typed content instead of reloading the file', async ({ page }) => {
  const editor = page.locator('.ProseMirror');

  await editor.click();
  await page.keyboard.press(`${modKey}+End`);
  await page.keyboard.press('Enter');
  await page.keyboard.type('Typed once and kept');

  await expect(editor).toContainText('Typed once and kept');
  await page.waitForTimeout(800);
  await expect(editor).toContainText('Typed once and kept');
});

test('lets you pick a color and closes on escape', async ({ page }) => {
  const editor = page.locator('.ProseMirror');

  await editor.click();
  await page.keyboard.press(`${modKey}+a`);
  await page.getByTitle('Text color').click();
  const picker = page.getByTestId('color-picker');
  await expect(picker).toBeVisible();

  const hexInput = picker.locator('input[type="text"]').first();
  const before = await hexInput.inputValue();
  const hue = page.getByTestId('color-picker-hue');
  const hueBox = await hue.boundingBox();
  if (!hueBox) {
    throw new Error('Hue slider bounding box is not available');
  }

  await page.mouse.move(hueBox.x + 4, hueBox.y + hueBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(hueBox.x + hueBox.width - 4, hueBox.y + hueBox.height / 2, { steps: 10 });
  await page.mouse.up();
  await expect(hexInput).not.toHaveValue(before);

  await page.keyboard.press('Escape');
  await expect(picker).toBeHidden();
});

test('closes the color picker on outside click', async ({ page }) => {
  const editor = page.locator('.ProseMirror');

  await editor.click();
  await page.keyboard.press(`${modKey}+a`);
  await page.getByTitle('Text color').click();
  const picker = page.getByTestId('color-picker');
  await expect(picker).toBeVisible();

  await page.locator('[data-testid="markdown-editor-surface"]').click({ position: { x: 8, y: 8 } });
  await expect(picker).toBeHidden();
});

test('opens external links and internal note links', async ({ page }) => {
  await page.locator('.ProseMirror a[href="https://example.com"]').click();
  await expect.poll(async () => page.evaluate(() => window.__VOLT_PLAYWRIGHT__?.getOpenedUrl() ?? null)).toBe('https://example.com');

  await page.locator('.ProseMirror a[href="../docs/guide.md"]').click();
  await expect.poll(async () => page.evaluate(() => window.__VOLT_PLAYWRIGHT__?.getActiveTab() ?? null)).toBe('docs/guide.md');

  await page.locator('.ProseMirror a[href="../files/spec.pdf"]').click();
  await expect.poll(async () => page.evaluate(() => window.__VOLT_PLAYWRIGHT__?.getActiveTab() ?? null)).toBe('files/spec.pdf');
});

test('inserts a file link once from the picker', async ({ page }) => {
  const editor = page.locator('.ProseMirror');

  await editor.click();
  await page.keyboard.press(`${modKey}+End`);
  await page.keyboard.press('Enter');
  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent('volt:pick-link'));
  });

  await expect(page.getByTestId('link-file-picker')).toBeVisible();
  await page.locator('[data-testid="link-picker-item"][data-path="notes/target.md"]').click();

  await expect(page.locator('.ProseMirror a[href="target.md"]')).toHaveCount(1);
});

test('does not show table toolbar on hover only, but shows notion-like controls on selection', async ({ page }) => {
  const firstCell = page.locator('.ProseMirror td').first();

  await firstCell.hover();
  await expect(page.getByTestId('table-add-col')).toBeVisible();
  await expect(page.getByTestId('table-add-row')).toBeVisible();
  await expect(page.getByTestId('table-toolbar')).toBeHidden();

  await firstCell.click();

  await expect(page.getByTestId('table-toolbar')).toBeVisible();
  await expect(page.getByTestId('table-toolbar-color-picker')).toBeHidden();
  await page.getByTestId('table-toolbar-cell-color').click();
  await expect(page.getByTestId('table-toolbar-color-picker')).toBeVisible();
});

test('opens empty math block for typing instead of deleting it', async ({ page }) => {
  await page.evaluate(() => {
    window.__VOLT_PLAYWRIGHT__?.insertMathBlock();
  });

  const textarea = page.locator('.math-block-textarea');
  await expect(textarea).toBeVisible();
  await textarea.fill('E = mc^2');
  await page.keyboard.press(`${modKey}+Enter`);

  await expect(page.locator('.math-block-render')).toContainText('E');
  await expect.poll(async () => page.evaluate(() => window.__VOLT_PLAYWRIGHT__?.getMarkdown() ?? null)).toContain('$$\nE = mc^2\n$$');
});

test('drops a file from the tree into the editor only once', async ({ page }) => {
  const source = page.locator('[data-testid="file-tree-item"][data-path="notes/target.md"]');
  const editor = page.locator('.ProseMirror');

  await editor.click();
  await page.keyboard.press(`${modKey}+End`);
  await source.dragTo(editor);

  await expect(page.locator('.ProseMirror a[href="target.md"]')).toHaveCount(1);
  await expect.poll(async () => page.evaluate(() => window.__VOLT_PLAYWRIGHT__?.getMarkdown() ?? null)).toContain('[target](target.md)');
  const markdown = await page.evaluate(() => window.__VOLT_PLAYWRIGHT__?.getMarkdown() ?? null);
  expect(markdown).not.toMatch(/target\s+\[target\]\(target\.md\)/);
});

test('keeps the drag handle visible and reorders blocks', async ({ page }) => {
  const alpha = page.locator('.ProseMirror p', { hasText: 'Alpha paragraph' }).first();
  const beta = page.locator('.ProseMirror p', { hasText: 'Beta paragraph' }).first();

  await alpha.hover();
  const handle = page.getByTestId('editor-drag-handle');
  await expect(handle).toBeVisible();

  await handle.hover();
  await expect(handle).toBeVisible();

  const betaBox = await beta.boundingBox();
  if (!betaBox) {
    throw new Error('Target paragraph bounding box is not available');
  }

  const handleBox = await handle.boundingBox();
  if (!handleBox) {
    throw new Error('Drag handle bounding box is not available');
  }

  await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(betaBox.x + betaBox.width / 2, betaBox.y + Math.max(betaBox.height - 4, 1), {
    steps: 12,
  });
  await page.mouse.up();

  const paragraphs = await page.locator('.ProseMirror p').allTextContents();
  const alphaIndex = paragraphs.findIndex((text) => text.includes('Alpha paragraph'));
  const betaIndex = paragraphs.findIndex((text) => text.includes('Beta paragraph'));
  expect(alphaIndex).toBeGreaterThan(betaIndex);
});
