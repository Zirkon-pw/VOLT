import { test, expect } from '@playwright/test';

const modKey = process.platform === 'darwin' ? 'Meta' : 'Control';

async function gotoHarness(page: import('@playwright/test').Page) {
  await page.goto('/__playwright__/editor');
  await expect(page.getByTestId('playwright-editor-harness')).toBeVisible();
  await expect(page.locator('.ProseMirror')).toContainText('Alpha paragraph');
}

async function pasteClipboardText(page: import('@playwright/test').Page, text: string) {
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.evaluate(async (value) => {
    await navigator.clipboard.writeText(value);
  }, text);
  await page.keyboard.press(`${modKey}+V`);
}

async function expectNoAppOverflow(page: import('@playwright/test').Page) {
  await expect.poll(async () => page.evaluate(() => {
    const root = document.documentElement;
    return (
      root.scrollWidth - root.clientWidth <= 1
      && root.scrollHeight - root.clientHeight <= 1
      && window.scrollX === 0
      && window.scrollY === 0
    );
  })).toBe(true);
}

async function selectParagraphText(
  page: import('@playwright/test').Page,
  paragraphText: string,
  from: number,
  to: number,
) {
  await page.locator('.ProseMirror').click();
  await page.evaluate(({ paragraphText: text, from: start, to: end }) => {
    const paragraph = Array.from(document.querySelectorAll('.ProseMirror p'))
      .find((node) => node.textContent?.includes(text));

    if (!(paragraph instanceof HTMLElement)) {
      throw new Error(`Paragraph not found: ${text}`);
    }

    const textNode = Array.from(paragraph.childNodes).find(
      (node) => node.nodeType === Node.TEXT_NODE && (node.textContent?.length ?? 0) >= end,
    );

    if (!(textNode instanceof Text)) {
      throw new Error(`Paragraph text node not found: ${text}`);
    }

    const selection = window.getSelection();
    const range = document.createRange();
    range.setStart(textNode, start);
    range.setEnd(textNode, end);
    selection?.removeAllRanges();
    selection?.addRange(range);
    document.dispatchEvent(new Event('selectionchange'));
  }, { paragraphText, from, to });
}

async function scrollEditorViewport(
  page: import('@playwright/test').Page,
  left: number,
  top: number,
) {
  await page.evaluate(({ left: scrollLeft, top: scrollTop }) => {
    const editor = document.querySelector('.ProseMirror');
    if (!(editor instanceof HTMLElement)) {
      throw new Error('Editor root not found');
    }

    let current: HTMLElement | null = editor.parentElement;
    while (current) {
      const canScrollX = current.scrollWidth > current.clientWidth + 1;
      const canScrollY = current.scrollHeight > current.clientHeight + 1;
      if (canScrollX || canScrollY) {
        current.scrollBy({ left: scrollLeft, top: scrollTop });
        return;
      }
      current = current.parentElement;
    }

    throw new Error('Scrollable editor viewport not found');
  }, { left, top });
}

async function setHarnessMarkdown(
  page: import('@playwright/test').Page,
  markdown: string,
) {
  await page.evaluate((value) => {
    window.__VOLT_PLAYWRIGHT__?.setMarkdown(value);
  }, markdown);
}

function createTocMarkdown() {
  const intro = Array.from({ length: 8 }, (_, index) => `Intro paragraph ${index + 1}.`).join('\n\n');
  const gettingStarted = Array.from({ length: 14 }, (_, index) => `Getting started note ${index + 1}.`).join('\n\n');
  const deepDive = Array.from({ length: 14 }, (_, index) => `Deep dive explanation ${index + 1}.`).join('\n\n');
  const advanced = Array.from({ length: 14 }, (_, index) => `Advanced usage detail ${index + 1}.`).join('\n\n');
  const appendix = Array.from({ length: 12 }, (_, index) => `Appendix reference ${index + 1}.`).join('\n\n');

  return `# Overview

${intro}

## Getting started

${gettingStarted}

### Deep dive

${deepDive}

## Advanced usage

${advanced}

### Appendix and follow-up references

${appendix}
`;
}

function createDenseTocMarkdown(sectionCount = 18) {
  const sections = Array.from({ length: sectionCount }, (_, index) => {
    const sectionNumber = index + 1;
    const level = sectionNumber === 1
      ? '#'
      : sectionNumber % 3 === 0
        ? '###'
        : '##';
    const body = Array.from(
      { length: sectionNumber % 4 === 0 ? 9 : 7 },
      (_, paragraphIndex) => `Section ${sectionNumber} paragraph ${paragraphIndex + 1}.`,
    ).join('\n\n');

    return `${level} Section ${sectionNumber}\n\n${body}`;
  });

  return sections.join('\n\n');
}

async function getActiveTocItemText(page: import('@playwright/test').Page) {
  const activeItem = page.locator('[data-testid="editor-toc-item"][aria-current="location"]').first();
  const text = await activeItem.textContent();
  return text?.trim() ?? null;
}

async function getTocMarkerMetrics(page: import('@playwright/test').Page) {
  return page.evaluate(() => Array.from(document.querySelectorAll('[data-testid="editor-toc-marker"]'))
    .map((element) => {
      if (!(element instanceof HTMLElement)) {
        return null;
      }

      const styles = getComputedStyle(element);
      return {
        width: element.getBoundingClientRect().width,
        backgroundColor: styles.backgroundColor,
        opacity: styles.opacity,
        current: element.getAttribute('aria-current') === 'location',
      };
    })
    .filter((value): value is {
      width: number;
      backgroundColor: string;
      opacity: string;
      current: boolean;
    } => value !== null));
}

test.beforeEach(async ({ page }) => {
  await gotoHarness(page);
});

test('opens command palette with the search shortcut and regular search with double shift', async ({ page }) => {
  const searchInput = page.getByTestId('workspace-search-input');

  await page.locator('.ProseMirror').click();
  await page.keyboard.press(`${modKey}+K`);
  await expect(page.getByTestId('workspace-search-popup')).toBeVisible();
  await expect(searchInput).toHaveValue('>');

  await page.keyboard.press('Escape');
  await expect(page.getByTestId('workspace-search-popup')).toBeHidden();

  await page.getByTestId('playwright-editor-harness').click({ position: { x: 12, y: 12 } });
  await page.keyboard.press('Shift');
  await page.waitForTimeout(120);
  await page.keyboard.press('Shift');

  await expect(page.getByTestId('workspace-search-popup')).toBeVisible();
  await expect(searchInput).toHaveValue('');
});

test('finds matches in the current file with the file-search shortcut', async ({ page }) => {
  const editor = page.locator('.ProseMirror');
  const count = page.getByTestId('find-in-file-count');

  await editor.click();
  await page.keyboard.press(`${modKey}+F`);

  await expect(page.getByTestId('find-in-file-panel')).toBeVisible();
  await page.getByTestId('find-in-file-input').fill('paragraph');
  await expect(count).toContainText('1');
  await expect(count).toContainText('2');

  const firstRange = await page.evaluate(() => window.__VOLT_PLAYWRIGHT__?.getSelectionRange() ?? null);
  await page.keyboard.press('Enter');
  await expect(count).toContainText('2');
  await expect(count).toContainText('2');

  const secondRange = await page.evaluate(() => window.__VOLT_PLAYWRIGHT__?.getSelectionRange() ?? null);
  expect(secondRange).not.toEqual(firstRange);

  await page.keyboard.press('Shift+Enter');
  const thirdRange = await page.evaluate(() => window.__VOLT_PLAYWRIGHT__?.getSelectionRange() ?? null);
  expect(thirdRange).toEqual(firstRange);
});

test('renders a simplified toc rail and swaps it with the panel without shrinking editor content', async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 1200 });
  await setHarnessMarkdown(page, createTocMarkdown());

  const surface = page.getByTestId('markdown-editor-surface');
  const rail = page.getByTestId('editor-toc-rail');
  const dock = page.getByTestId('editor-toc-dock');
  const panel = page.getByTestId('editor-toc-panel');
  const content = page.locator('.tiptap');

  await expect(rail).toBeVisible();
  await expect(page.getByTestId('editor-toc-marker')).toHaveCount(5);
  await expect(panel).toBeHidden();

  const markerMetrics = await getTocMarkerMetrics(page);
  expect(markerMetrics).toHaveLength(5);
  const activeMarkers = markerMetrics.filter((marker) => marker.current);
  const inactiveMarkers = markerMetrics.filter((marker) => !marker.current);
  expect(activeMarkers).toHaveLength(1);
  const inactiveWidths = inactiveMarkers.map((marker) => marker.width);
  expect(activeMarkers[0]?.width ?? 0).toBeGreaterThan(Math.max(...inactiveWidths) + 1);
  expect(Math.max(...inactiveWidths) - Math.min(...inactiveWidths)).toBeLessThanOrEqual(1);
  expect(new Set(markerMetrics.map((marker) => marker.backgroundColor)).size).toBe(1);
  expect(new Set(markerMetrics.map((marker) => marker.opacity)).size).toBe(1);

  const widthBefore = await content.boundingBox();
  if (!widthBefore) {
    throw new Error('Editor content bounds are not available');
  }

  await dock.hover();
  await expect(panel).toBeVisible();
  await expect(rail).toBeHidden();
  await expect(page.getByTestId('editor-toc-item')).toHaveCount(5);

  const panelBox = await panel.boundingBox();
  const surfaceBox = await surface.boundingBox();
  if (!panelBox || !surfaceBox) {
    throw new Error('TOC bounds are not available');
  }

  const panelHeightRatio = panelBox.height / surfaceBox.height;
  expect(Math.abs(panelHeightRatio - 0.6)).toBeLessThanOrEqual(0.03);
  const surfaceCenterY = surfaceBox.y + surfaceBox.height / 2;
  const panelCenterY = panelBox.y + panelBox.height / 2;
  expect(Math.abs(panelCenterY - surfaceCenterY)).toBeLessThanOrEqual(6);

  const widthAfter = await content.boundingBox();
  if (!widthAfter) {
    throw new Error('Editor content bounds are not available after TOC hover');
  }

  expect(Math.abs(widthAfter.width - widthBefore.width)).toBeLessThanOrEqual(1);

  await page.getByTestId('playwright-editor-harness').hover({ position: { x: 12, y: 12 } });
  await expect(panel).toBeHidden();
  await expect(rail).toBeVisible();
});

test('scrolls to headings, keeps toc sync stable, and tracks active section in both directions', async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 1200 });
  await setHarnessMarkdown(page, createDenseTocMarkdown());

  const dock = page.getByTestId('editor-toc-dock');
  await dock.hover();

  await expect.poll(async () => getActiveTocItemText(page)).toBe('Section 1');
  await page.getByTestId('editor-toc-item').filter({ hasText: 'Section 12' }).click();

  await expect.poll(async () => page.evaluate(() => {
    const heading = Array.from(document.querySelectorAll('.ProseMirror h1, .ProseMirror h2, .ProseMirror h3'))
      .find((node) => node.textContent?.includes('Section 12'));
    const container = document.querySelector('[data-testid="editor-content-scroll"]');

    if (!(heading instanceof HTMLElement) || !(container instanceof HTMLElement)) {
      return Number.POSITIVE_INFINITY;
    }

    return heading.getBoundingClientRect().top - container.getBoundingClientRect().top;
  })).toBeLessThan(160);

  await expect.poll(async () => getActiveTocItemText(page)).toBe('Section 12');
  await expect.poll(async () => page.evaluate(() => {
    const activeItem = document.querySelector('[data-testid="editor-toc-item"][aria-current="location"]');
    const list = document.querySelector('[data-testid="editor-toc-panel"] ul');
    const activeMarker = document.querySelector('[data-testid="editor-toc-marker"][aria-current="location"]');
    const railElement = document.querySelector('[data-testid="editor-toc-rail"]');

    if (!(activeItem instanceof HTMLElement) || !(list instanceof HTMLElement) || !(activeMarker instanceof HTMLElement) || !(railElement instanceof HTMLElement)) {
      return false;
    }

    const itemRect = activeItem.getBoundingClientRect();
    const listRect = list.getBoundingClientRect();
    const markerRect = activeMarker.getBoundingClientRect();
    const railRect = railElement.getBoundingClientRect();

    return (
      itemRect.top >= listRect.top
      && itemRect.bottom <= listRect.bottom
      && markerRect.top >= railRect.top
      && markerRect.bottom <= railRect.bottom
    );
  })).toBe(true);
  await expect.poll(async () => page.evaluate(() => {
    const activeItem = document.querySelector('[data-testid="editor-toc-item"][aria-current="location"]');
    const inactiveItem = document.querySelector('[data-testid="editor-toc-item"]:not([aria-current="location"])');

    if (!(activeItem instanceof HTMLElement) || !(inactiveItem instanceof HTMLElement)) {
      return null;
    }

    const activeStyles = getComputedStyle(activeItem);
    const inactiveStyles = getComputedStyle(inactiveItem);
    return {
      activeBackground: activeStyles.backgroundColor,
      inactiveBackground: inactiveStyles.backgroundColor,
      activeBoxShadow: activeStyles.boxShadow,
      inactiveBoxShadow: inactiveStyles.boxShadow,
      activeWeight: Number.parseInt(activeStyles.fontWeight, 10),
      inactiveWeight: Number.parseInt(inactiveStyles.fontWeight, 10),
    };
  })).toEqual({
    activeBackground: 'rgba(0, 0, 0, 0)',
    inactiveBackground: 'rgba(0, 0, 0, 0)',
    activeBoxShadow: 'none',
    inactiveBoxShadow: 'none',
    activeWeight: 700,
    inactiveWeight: 600,
  });

  await page.evaluate(() => {
    const container = document.querySelector('[data-testid="editor-content-scroll"]');
    if (!(container instanceof HTMLElement)) {
      throw new Error('Editor scroll container not found');
    }

    container.scrollTo({ top: container.scrollHeight, behavior: 'auto' });
  });

  await expect.poll(async () => getActiveTocItemText(page)).toBe('Section 18');

  await page.evaluate(() => {
    const container = document.querySelector('[data-testid="editor-content-scroll"]');
    if (!(container instanceof HTMLElement)) {
      throw new Error('Editor scroll container not found');
    }

    container.scrollTo({ top: 0, behavior: 'auto' });
  });

  await expect.poll(async () => getActiveTocItemText(page)).toBe('Section 1');
});

test('hides the table of contents when headings are missing or the editor pane is too narrow', async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 1200 });
  await setHarnessMarkdown(page, 'Plain paragraph.\n\nAnother paragraph.\n\nOne more paragraph.');
  await expect(page.getByTestId('editor-toc')).toHaveCount(0);

  await setHarnessMarkdown(page, createTocMarkdown());
  await expect(page.getByTestId('editor-toc-rail')).toBeVisible();

  await page.keyboard.down(modKey);
  await page.locator('[data-testid="file-tree-item"][data-path="notes/target.md"]').click();
  await page.keyboard.up(modKey);

  const splitSeam = page.getByTestId('workspace-split-seam');
  const seamBox = await splitSeam.boundingBox();
  if (!seamBox) {
    throw new Error('Split seam bounds are not available');
  }

  await page.mouse.move(seamBox.x + seamBox.width / 2, seamBox.y + seamBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(seamBox.x + 420, seamBox.y + seamBox.height / 2, { steps: 10 });
  await page.mouse.up();

  await expect.poll(async () => page.evaluate(() => {
    const pane = document.querySelector('[data-testid="workspace-pane-primary"]');
    return pane instanceof HTMLElement ? pane.getBoundingClientRect().width : Number.POSITIVE_INFINITY;
  })).toBeLessThan(960);
  await expect(page.getByTestId('editor-toc')).toHaveCount(0);
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

  await editor.click({ position: { x: 12, y: 96 } });
  await expect(picker).toBeHidden();
});

test('applies inline code from the bubble menu and serializes markdown with backticks', async ({ page }) => {
  await selectParagraphText(page, 'Alpha paragraph', 0, 5);

  await expect(page.getByTestId('text-bubble-menu')).toBeVisible();
  const inlineCodeButton = page.getByTestId('text-bubble-inline-code');
  await inlineCodeButton.click();

  await expect.poll(async () => page.evaluate(() => window.__VOLT_PLAYWRIGHT__?.getMarkdown() ?? null))
    .toContain('`Alpha` paragraph');

  await inlineCodeButton.click();
  await expect.poll(async () => page.evaluate(() => window.__VOLT_PLAYWRIGHT__?.getMarkdown() ?? null))
    .not.toContain('`Alpha` paragraph');
});

test('opens external links and internal note links', async ({ page }) => {
  await page.locator('.ProseMirror a[href="https://example.com"]').click();
  await expect.poll(async () => page.evaluate(() => window.__VOLT_PLAYWRIGHT__?.getOpenedUrl() ?? null)).toBe('https://example.com');

  await page.locator('.ProseMirror a[href="../files/spec.pdf"]').click();
  await expect.poll(async () => page.evaluate(() => window.__VOLT_PLAYWRIGHT__?.getActiveTab() ?? null)).toBe('files/spec.pdf');

  await page.locator('[data-testid="file-tab"][data-path="notes/test.md"]').click();
  await page.locator('.ProseMirror a[href="../docs/guide.md"]').click();
  await expect.poll(async () => page.evaluate(() => window.__VOLT_PLAYWRIGHT__?.getActiveTab() ?? null)).toBe('docs/guide.md');
});

test('opens files in a secondary pane with modifier-click and preserves the primary tab', async ({ page }) => {
  await expect(page.getByTestId('workspace-pane-primary')).toHaveAttribute('data-tab-id', 'notes/test.md');

  await page.keyboard.down(modKey);
  await page.locator('[data-testid="file-tree-item"][data-path="notes/target.md"]').click();
  await page.keyboard.up(modKey);

  await expect(page.getByTestId('workspace-pane-primary')).toHaveAttribute('data-tab-id', 'notes/test.md');
  await expect(page.getByTestId('workspace-pane-secondary')).toHaveAttribute('data-tab-id', 'notes/target.md');
  await expect.poll(async () => page.evaluate(() => window.__VOLT_PLAYWRIGHT__?.getWorkspaceView() ?? null)).toMatchObject({
    primaryTabId: 'notes/test.md',
    secondaryTabId: 'notes/target.md',
    activePane: 'secondary',
  });
});

test('opens internal note links in a secondary pane with modifier-click and restores single-pane mode on close', async ({ page }) => {
  await page.keyboard.down(modKey);
  await page.locator('.ProseMirror a[href="../docs/guide.md"]').click();
  await page.keyboard.up(modKey);

  await expect(page.getByTestId('workspace-pane-secondary')).toHaveAttribute('data-tab-id', 'docs/guide.md');
  await page.getByTestId('workspace-secondary-close').click();
  await expect(page.getByTestId('workspace-pane-secondary')).toHaveCount(0);
  await expect.poll(async () => page.evaluate(() => window.__VOLT_PLAYWRIGHT__?.getWorkspaceView() ?? null)).toMatchObject({
    primaryTabId: 'notes/test.md',
    secondaryTabId: null,
    activePane: 'primary',
  });
});

test('keeps legacy inline markdown as plain text after inline math removal', async ({ page }) => {
  await expect(page.locator('.ProseMirror')).toContainText('Legacy inline $math$ text');
  await expect(page.locator('.math-inline-node')).toHaveCount(0);
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

  const link = page.locator('.ProseMirror a[href="./target.md"]');
  await expect(link).toHaveCount(1);
  await link.click();
  await expect.poll(async () => page.evaluate(() => window.__VOLT_PLAYWRIGHT__?.getActiveTab() ?? null)).toBe('notes/target.md');
});

test('restores the editor selection after closing the link picker', async ({ page }) => {
  const editor = page.locator('.ProseMirror');

  await editor.click();
  await page.keyboard.press(`${modKey}+End`);
  await page.keyboard.press('Enter');
  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent('volt:pick-link'));
  });

  await expect(page.getByTestId('link-file-picker')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('link-file-picker')).toBeHidden();

  await page.keyboard.type('Cursor restored');
  await expect.poll(async () => page.evaluate(() => window.__VOLT_PLAYWRIGHT__?.getMarkdown() ?? null)).toContain('Cursor restored');
});

test('closes slash commands on escape and inserts math blocks from the slash menu', async ({ page }) => {
  const editor = page.locator('.ProseMirror');

  await editor.click();
  await page.keyboard.press(`${modKey}+End`);
  await page.keyboard.press('Enter');
  await page.keyboard.type('/');
  await expect(page.getByTestId('slash-command-menu')).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(page.getByTestId('slash-command-menu')).toBeHidden();

  await page.keyboard.press('Enter');
  await page.keyboard.type('/math');
  await expect(page.getByTestId('slash-command-menu')).toBeVisible();
  await page.keyboard.press('Enter');

  await expect(page.locator('.math-block-node')).toBeVisible();
  await expect.poll(async () => page.evaluate(() => window.__VOLT_PLAYWRIGHT__?.getMarkdown() ?? null)).toContain('$$');
});

test('opens embed picker from slash command and inserts a generic preview block', async ({ page }) => {
  const editor = page.locator('.ProseMirror');

  await editor.click();
  await page.keyboard.press(`${modKey}+End`);
  await page.keyboard.press('Enter');
  await page.keyboard.type('/embed');
  await expect(page.getByTestId('slash-command-menu')).toBeVisible();
  await page.keyboard.press('Enter');

  await expect(page.getByTestId('embed-url-picker')).toBeVisible();
  await page.getByTestId('embed-url-input').fill('https://example.com/article');
  await page.getByTestId('embed-url-submit').click();

  await expect(page.getByTestId('embed-block-generic')).toBeVisible();
  await expect.poll(async () => page.evaluate(() => window.__VOLT_PLAYWRIGHT__?.getMarkdown() ?? null))
    .toContain('<volt-embed url="https://example.com/article"></volt-embed>');
});

test('converts a pasted standalone url into an embed block only in an empty paragraph', async ({ page }) => {
  await page.evaluate(() => {
    window.__VOLT_PLAYWRIGHT__?.appendEmptyParagraphAtEnd();
  });
  await pasteClipboardText(page, 'https://example.com/article');

  await expect(page.getByTestId('embed-block-generic')).toBeVisible();
  await expect.poll(async () => page.evaluate(() => window.__VOLT_PLAYWRIGHT__?.getMarkdown() ?? null))
    .toContain('<volt-embed url="https://example.com/article"></volt-embed>');
});

test('keeps pasted urls as text when the cursor is inside non-empty text', async ({ page }) => {
  await page.locator('.ProseMirror p', { hasText: 'Alpha paragraph' }).click();
  await page.keyboard.press('End');
  await page.keyboard.type(' ');
  await pasteClipboardText(page, 'https://example.com/article');

  await expect(page.getByTestId('embed-block-generic')).toHaveCount(0);
  await expect.poll(async () => page.evaluate(() => window.__VOLT_PLAYWRIGHT__?.getMarkdown() ?? null))
    .toContain('https://example.com/article');
});

test('renders github repository embeds', async ({ page }) => {
  await page.evaluate(() => {
    window.__VOLT_PLAYWRIGHT__?.insertEmbedBlock('https://github.com/example/volt');
  });

  await expect(page.getByTestId('embed-block-github')).toBeVisible();
  await expect(page.locator('.embed-block-title')).toContainText('example/volt');
  await expect(page.getByText('TypeScript')).toBeVisible();
});

test('renders direct video embeds with a playable video element', async ({ page }) => {
  await page.evaluate(() => {
    window.__VOLT_PLAYWRIGHT__?.insertEmbedBlock('https://videos.example.com/demo.mp4');
  });

  const video = page.getByTestId('embed-video-player');
  await expect(video).toBeVisible();
  await expect(video).toHaveAttribute('src', /https:\/\/videos\.example\.com\/demo\.mp4/);
});

test('renders youtube embeds as iframe previews', async ({ page }) => {
  await page.evaluate(() => {
    window.__VOLT_PLAYWRIGHT__?.insertEmbedBlock('https://youtu.be/volt-demo-123');
  });

  await expect(page.getByTestId('embed-video-frame')).toHaveAttribute(
    'src',
    /https:\/\/www\.youtube\.com\/embed\/volt-demo-123/,
  );
});

test('saves and reloads embed blocks without losing markdown structure', async ({ page }) => {
  await page.evaluate(() => {
    window.__VOLT_PLAYWRIGHT__?.insertEmbedBlock('https://example.com/article');
  });

  await page.waitForTimeout(800);
  await page.locator('[data-testid="file-tree-item"][data-path="notes/target.md"]').click();
  await page.locator('[data-testid="file-tree-item"][data-path="notes/test.md"]').click();

  await expect(page.getByTestId('embed-block-generic')).toBeVisible();
  await expect.poll(async () => page.evaluate(() => window.__VOLT_PLAYWRIGHT__?.getSavedFile('notes/test.md') ?? null))
    .toContain('<volt-embed url="https://example.com/article"></volt-embed>');
});

test('shows only append handles for tables, keeps them stable, and appends at the edges', async ({ page }) => {
  const firstCell = page.locator('.ProseMirror td').first();
  const surface = page.getByTestId('markdown-editor-surface');
  const tableWrapper = page.locator('.ProseMirror .tableWrapper');

  await firstCell.click();
  await expect.poll(async () => tableWrapper.evaluate((node) => getComputedStyle(node).backgroundColor)).toBe('rgba(0, 0, 0, 0)');
  await expect.poll(async () => tableWrapper.evaluate((node) => getComputedStyle(node).borderTopWidth)).toBe('0px');
  await expect(page.getByTestId('table-add-col')).toBeVisible();
  await expect(page.getByTestId('table-add-row')).toBeVisible();
  await expect(page.getByTestId('table-select-col')).toHaveCount(0);
  await expect(page.getByTestId('table-select-row')).toHaveCount(0);
  await expect(page.getByTestId('table-toolbar')).toHaveCount(0);

  const rowCountBefore = await page.locator('.ProseMirror tr').count();
  const colCountBefore = await page.locator('.ProseMirror tr').first().locator('th, td').count();

  await page.getByTestId('table-add-col').click();
  await expect(page.locator('.ProseMirror tr').first().locator('th, td')).toHaveCount(colCountBefore + 1);

  await page.getByTestId('table-add-row').click();
  await expect(page.locator('.ProseMirror tr')).toHaveCount(rowCountBefore + 1);

  await scrollEditorViewport(page, 0, 120);
  await expect(page.getByTestId('table-add-col')).toBeVisible();
  await expect(page.getByTestId('table-add-row')).toBeVisible();

  const surfaceBox = await surface.boundingBox();
  const colHandleBox = await page.getByTestId('table-add-col').boundingBox();
  const rowHandleBox = await page.getByTestId('table-add-row').boundingBox();
  if (!surfaceBox || !colHandleBox || !rowHandleBox) {
    throw new Error('Table handle bounds are not available');
  }

  expect(colHandleBox.x + colHandleBox.width / 2).toBeGreaterThanOrEqual(surfaceBox.x - 1);
  expect(colHandleBox.x + colHandleBox.width / 2).toBeLessThanOrEqual(surfaceBox.x + surfaceBox.width + 1);
  expect(rowHandleBox.y + rowHandleBox.height / 2).toBeGreaterThanOrEqual(surfaceBox.y - 1);
  expect(rowHandleBox.y + rowHandleBox.height / 2).toBeLessThanOrEqual(surfaceBox.y + surfaceBox.height + 1);
});

test('keeps table add handles inside the visible wrapper when the table is horizontally scrolled', async ({ page }) => {
  await setHarnessMarkdown(page, `# Wide table

| H1 | H2 | H3 | H4 | H5 | H6 | H7 | H8 | H9 | H10 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| A1 | A2 | A3 | A4 | A5 | A6 | A7 | A8 | A9 | A10 |
| B1 | B2 | B3 | B4 | B5 | B6 | B7 | B8 | B9 | B10 |`);

  const tableWrapper = page.locator('.ProseMirror .tableWrapper');
  const firstCell = page.locator('.ProseMirror td').first();

  await expect(tableWrapper).toBeVisible();
  await firstCell.click();
  await expect(page.getByTestId('table-add-col')).toBeVisible();
  await expect(page.getByTestId('table-add-row')).toBeVisible();

  await page.evaluate(() => {
    const wrapper = document.querySelector('.ProseMirror .tableWrapper');
    if (!(wrapper instanceof HTMLElement)) {
      throw new Error('Table wrapper not found');
    }

    wrapper.scrollTo({ left: wrapper.scrollWidth, top: 0 });
  });

  await expect(page.getByTestId('table-add-col')).toBeVisible();
  await expect(page.getByTestId('table-add-row')).toBeVisible();

  const wrapperBox = await tableWrapper.boundingBox();
  const colHandleBox = await page.getByTestId('table-add-col').boundingBox();
  const rowHandleBox = await page.getByTestId('table-add-row').boundingBox();
  if (!wrapperBox || !colHandleBox || !rowHandleBox) {
    throw new Error('Wide table handle bounds are not available');
  }

  expect(colHandleBox.x + colHandleBox.width / 2).toBeGreaterThanOrEqual(wrapperBox.x - 1);
  expect(colHandleBox.x + colHandleBox.width / 2).toBeLessThanOrEqual(wrapperBox.x + wrapperBox.width + 1);
  expect(rowHandleBox.x + rowHandleBox.width / 2).toBeGreaterThanOrEqual(wrapperBox.x - 1);
  expect(rowHandleBox.x + rowHandleBox.width / 2).toBeLessThanOrEqual(wrapperBox.x + wrapperBox.width + 1);
});

test('keeps root overflow locked while editing and opening editor overlays', async ({ page }) => {
  const editor = page.locator('.ProseMirror');
  const firstCell = page.locator('.ProseMirror td').first();
  const alpha = page.locator('.ProseMirror p', { hasText: 'Alpha paragraph' }).first();

  await expectNoAppOverflow(page);

  await editor.click();
  await page.keyboard.press(`${modKey}+End`);
  await page.keyboard.press('Enter');
  await page.keyboard.type('Regular editing should stay inside the editor canvas.');

  await alpha.hover();
  await expect(page.getByTestId('editor-drag-handle')).toBeVisible();

  await firstCell.click({ button: 'right' });
  await expect(page.getByTestId('context-menu')).toBeVisible();
  await page.getByRole('menuitem', { name: 'Cell color...' }).click();
  await expect(page.getByTestId('table-context-color-picker')).toBeVisible();

  await page.evaluate(() => {
    window.scrollTo(120, 120);
  });

  await expectNoAppOverflow(page);
});

test('resizes split panes from the seam and collapses the sidebar from the seam control', async ({ page }) => {
  await page.keyboard.down(modKey);
  await page.locator('[data-testid="file-tree-item"][data-path="notes/target.md"]').click();
  await page.keyboard.up(modKey);

  const primaryPane = page.getByTestId('workspace-pane-primary');
  const splitSeam = page.getByTestId('workspace-split-seam');
  const before = await primaryPane.boundingBox();
  const seamBox = await splitSeam.boundingBox();

  if (!before || !seamBox) {
    throw new Error('Split pane bounds are not available');
  }

  await page.mouse.move(seamBox.x + seamBox.width / 2, seamBox.y + seamBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(seamBox.x + seamBox.width / 2 + 96, seamBox.y + seamBox.height / 2, { steps: 8 });
  await page.mouse.up();

  const after = await primaryPane.boundingBox();
  if (!after) {
    throw new Error('Primary pane bounds are not available after resize');
  }

  expect(after.width).toBeGreaterThan(before.width + 40);

  await expect(page.getByTestId('sidebar-pane')).toBeVisible();
  await page.getByTestId('sidebar-toggle').click();
  await expect(page.getByTestId('sidebar-pane')).toHaveCount(0);
  await page.getByTestId('sidebar-toggle').click();
  await expect(page.getByTestId('sidebar-pane')).toBeVisible();
});

test('keeps breadcrumbs inside an auto-width capsule', async ({ page }) => {
  const capsule = page.getByTestId('breadcrumbs-capsule');
  const pane = page.getByTestId('workspace-pane-primary');
  const capsuleBox = await capsule.boundingBox();
  const paneBox = await pane.boundingBox();

  if (!capsuleBox || !paneBox) {
    throw new Error('Breadcrumb bounds are not available');
  }

  expect(capsuleBox.width).toBeLessThan(paneBox.width * 0.6);
});

test('stays stable after closing the last open tab', async ({ page }) => {
  await page.locator('[data-testid="file-tab"][data-path="notes/test.md"] button').click();
  await expect(page.getByTestId('file-tabs')).toHaveCount(0);
  await expect(page.getByTestId('workspace-pane-primary')).toBeVisible();
  await expect(page.getByText('Something went wrong')).toHaveCount(0);
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

  await expect(page.locator('.ProseMirror a[href="./target.md"]')).toHaveCount(1);
  await expect.poll(async () => page.evaluate(() => window.__VOLT_PLAYWRIGHT__?.getMarkdown() ?? null)).toContain('[target](./target.md)');
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

test('flushes pending autosave before switching files and updates shell chrome', async ({ page }) => {
  const editor = page.locator('.ProseMirror');

  await editor.click();
  await page.keyboard.press(`${modKey}+End`);
  await page.keyboard.press('Enter');
  await page.keyboard.type('Pending save survives file switch');

  await page.locator('[data-testid="file-tree-item"][data-path="notes/target.md"]').click();

  await expect.poll(async () => page.evaluate(() => window.__VOLT_PLAYWRIGHT__?.getSavedFile('notes/test.md') ?? null)).toContain('Pending save survives file switch');
  await expect.poll(async () => page.evaluate(() => window.__VOLT_PLAYWRIGHT__?.getActiveTab() ?? null)).toBe('notes/target.md');
  await expect(page.locator('[data-testid="file-tab"][data-path="notes/target.md"]')).toBeVisible();
  await expect(page.getByTestId('breadcrumb-active')).toHaveText('target.md');
});

test('keeps undo history scoped to the current file after switching files', async ({ page }) => {
  const editor = page.locator('.ProseMirror');

  await editor.click();
  await page.keyboard.press(`${modKey}+End`);
  await page.keyboard.press('Enter');
  await page.keyboard.type('Undo stays local');
  await page.waitForTimeout(800);

  await page.locator('[data-testid="file-tree-item"][data-path="notes/target.md"]').click();
  await expect(editor).toContainText('Secondary target content.');

  await editor.click();
  await page.keyboard.press(`${modKey}+Z`);

  await expect.poll(async () => page.evaluate(() => window.__VOLT_PLAYWRIGHT__?.getActiveTab() ?? null)).toBe('notes/target.md');
  await expect(editor).toContainText('Secondary target content.');
  await expect(editor).not.toContainText('Undo stays local');
  await expect.poll(async () => page.evaluate(() => window.__VOLT_PLAYWRIGHT__?.getSavedFile('notes/test.md') ?? null))
    .toContain('Undo stays local');
  await expect.poll(async () => page.evaluate(() => window.__VOLT_PLAYWRIGHT__?.getSavedFile('notes/target.md') ?? null))
    .toBe('# Target note\n\nSecondary target content.\n');
});

test('opens a custom context menu, closes it with escape and outside click, and does not hijack plain inputs', async ({ page }) => {
  const fileTreeItem = page.locator('[data-testid="file-tree-item"][data-path="notes/target.md"]');

  await fileTreeItem.click({ button: 'right' });
  await expect(page.getByTestId('context-menu')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('context-menu')).toHaveCount(0);

  await fileTreeItem.click({ button: 'right' });
  await expect(page.getByTestId('context-menu')).toBeVisible();
  await page.getByTestId('context-menu-overlay').click({ position: { x: 2, y: 2 } });
  await expect(page.getByTestId('context-menu')).toHaveCount(0);

  await page.locator('.ProseMirror').click();
  await page.keyboard.press(`${modKey}+F`);
  const input = page.getByTestId('find-in-file-input');
  await expect(input).toBeVisible();
  await input.click({ button: 'right' });
  await expect(page.getByTestId('context-menu')).toHaveCount(0);
});

test('opens the editor context menu from the keyboard without duplicating bubble actions', async ({ page }) => {
  const editor = page.locator('.ProseMirror');

  await editor.click();
  await page.keyboard.press(`${modKey}+End`);
  await page.keyboard.press('Enter');
  await page.keyboard.press('Shift+F10');

  await expect(page.getByTestId('context-menu')).toBeVisible();
  await expect(page.getByRole('menuitem', { name: 'Undo' })).toBeVisible();
  await expect(page.getByRole('menuitem', { name: 'Select all' })).toBeVisible();
  await expect(page.getByTestId('context-menu-item')).toHaveCount(6);
  await expect(page.getByRole('menuitem', { name: 'Bold' })).toHaveCount(0);
  await expect(page.getByRole('menuitem', { name: 'Italic' })).toHaveCount(0);
  await expect(page.getByRole('menuitem', { name: 'Underline' })).toHaveCount(0);
  await expect(page.getByRole('menuitem', { name: 'Strikethrough' })).toHaveCount(0);
  await expect(page.getByRole('menuitem', { name: 'Add link' })).toHaveCount(0);
  await expect(page.getByRole('menuitem', { name: 'Heading 1' })).toHaveCount(0);
  await expect(page.getByRole('menuitem', { name: 'Table' })).toHaveCount(0);
});

test('shows only link navigation actions in the editor context menu for links', async ({ page }) => {
  const link = page.locator('.ProseMirror a[href="https://example.com"]').first();

  await link.click({ button: 'right' });
  await expect(page.getByTestId('context-menu')).toBeVisible();
  await expect(page.getByRole('menuitem', { name: 'Copy link' })).toBeVisible();
  await expect(page.getByRole('menuitem', { name: 'Open link' })).toBeVisible();
  await expect(page.getByRole('menuitem', { name: 'Add link' })).toHaveCount(0);
  await expect(page.getByRole('menuitem', { name: 'Bold' })).toHaveCount(0);
});

test('opens table actions from the context menu and applies cell colors from the popup', async ({ page }) => {
  const firstCell = page.locator('.ProseMirror td').first();

  await firstCell.click({ button: 'right' });
  await expect(page.getByTestId('context-menu')).toBeVisible();
  await expect(page.getByRole('menuitem', { name: 'Select row' })).toBeVisible();
  await expect(page.getByRole('menuitem', { name: 'Select column' })).toBeVisible();
  await expect(page.getByRole('menuitem', { name: 'Select table' })).toBeVisible();
  await expect(page.getByRole('menuitem', { name: 'Add row above' })).toBeVisible();
  await expect(page.getByRole('menuitem', { name: 'Add row below' })).toBeVisible();
  await expect(page.getByRole('menuitem', { name: 'Add column left' })).toBeVisible();
  await expect(page.getByRole('menuitem', { name: 'Add column right' })).toBeVisible();
  await expect(page.getByRole('menuitem', { name: 'Delete row' })).toBeVisible();
  await expect(page.getByRole('menuitem', { name: 'Delete column' })).toBeVisible();
  await expect(page.getByRole('menuitem', { name: 'Delete table' })).toBeVisible();
  await expect(page.getByRole('menuitem', { name: 'Cell color...' })).toBeVisible();
  await expect(page.getByRole('menuitem', { name: 'Undo' })).toHaveCount(0);
  await expect(page.getByRole('menuitem', { name: 'Bold' })).toHaveCount(0);

  await page.getByRole('menuitem', { name: 'Cell color...' }).click();
  const colorPicker = page.getByTestId('table-context-color-picker');
  await expect(colorPicker).toBeVisible();
  await colorPicker.locator('[data-testid="color-picker-preset"]').nth(1).click();
  await expect(colorPicker).toHaveCount(0);
  await expect.poll(async () => firstCell.evaluate((node) => (node as HTMLTableCellElement).style.backgroundColor)).not.toBe('');

  await page.keyboard.press('Escape');
  await expect(page.getByTestId('context-menu')).toHaveCount(0);

  await firstCell.click({ button: 'right' });
  await expect(page.getByRole('menuitem', { name: 'Clear cell color' })).toBeVisible();
  await page.getByRole('menuitem', { name: 'Clear cell color' }).click();
  await expect.poll(async () => firstCell.evaluate((node) => (node as HTMLTableCellElement).style.backgroundColor)).toBe('');
});

test('opens the same table menu from the keyboard', async ({ page }) => {
  const firstCellText = page.locator('.ProseMirror td').first().getByText('One');

  await firstCellText.click();
  await page.keyboard.press('Shift+F10');

  await expect(page.getByTestId('context-menu')).toBeVisible();
  await expect(page.getByRole('menuitem', { name: 'Select row' })).toBeVisible();
  await expect(page.getByRole('menuitem', { name: 'Add row above' })).toBeVisible();
  await expect(page.getByRole('menuitem', { name: 'Delete table' })).toBeVisible();
  await expect(page.getByRole('menuitem', { name: 'Undo' })).toHaveCount(0);
});

test('keeps editor menus floating on small screens and still opens the touch context menu', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });

  const editor = page.locator('.ProseMirror');
  await editor.click();
  await page.keyboard.press(`${modKey}+a`);
  await expect(page.getByTestId('text-bubble-menu')).toBeVisible();
  await expect(page.getByTestId('text-bubble-sheet')).toHaveCount(0);
  await expectNoAppOverflow(page);

  await page.keyboard.press(`${modKey}+F`);
  await expect(page.getByTestId('find-in-file-panel')).toBeVisible();
  await expectNoAppOverflow(page);
  await page.keyboard.press('Escape');

  await page.evaluate(async () => {
    const target = document.querySelector('.ProseMirror p');
    if (!(target instanceof HTMLElement)) {
      throw new Error('Editor paragraph not found');
    }

    const rect = target.getBoundingClientRect();
    const x = rect.left + 28;
    const y = rect.top + rect.height / 2;

    target.dispatchEvent(new PointerEvent('pointerdown', {
      bubbles: true,
      pointerType: 'touch',
      clientX: x,
      clientY: y,
    }));

    await new Promise((resolve) => window.setTimeout(resolve, 450));

    target.dispatchEvent(new PointerEvent('pointerup', {
      bubbles: true,
      pointerType: 'touch',
      clientX: x,
      clientY: y,
    }));
  });

  await expect(page.getByTestId('context-menu')).toBeVisible();
  await expect(page.getByRole('menuitem', { name: 'Undo' })).toBeVisible();
  await expect(page.getByRole('menuitem', { name: 'Bold' })).toHaveCount(0);
  await expect(page.getByRole('menuitem', { name: 'Heading 1' })).toHaveCount(0);
});

test('sets the code block language from the floating selector and closes it on escape', async ({ page }) => {
  await page.evaluate(() => {
    window.__VOLT_PLAYWRIGHT__?.insertCodeBlock();
  });

  const languageButton = page.getByTestId('codeblock-language-button');
  await expect(languageButton).toBeVisible();

  await languageButton.click();
  const dropdown = page.getByTestId('codeblock-language-dropdown');
  await expect(dropdown).toBeVisible();

  await page.getByTestId('codeblock-language-search').fill('javascript');
  await page.locator('[data-testid="codeblock-language-item"][data-language="javascript"]').click();
  await expect.poll(async () => page.evaluate(() => window.__VOLT_PLAYWRIGHT__?.getMarkdown() ?? null)).toContain('```javascript');

  await languageButton.click();
  await expect(dropdown).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dropdown).toBeHidden();
});
