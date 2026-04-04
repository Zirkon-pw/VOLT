import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(frontendRoot, '..');

const sourceLogoPath = path.join(frontendRoot, 'src', 'shared', 'assets', 'volt-logo.svg');
const appIconPath = path.join(repoRoot, 'build', 'appicon.png');
const windowsIconPath = path.join(repoRoot, 'build', 'windows', 'icon.ico');
const buildPreviewPath = path.join(repoRoot, 'build', 'preview.png');
const publicPreviewPath = path.join(frontendRoot, 'public', 'volt-preview.png');

const palette = {
  bg: '#fbf8f3',
  bgSecondary: '#ece5db',
  bgTertiary: '#e1d8cb',
  surface: '#f7f1e8',
  surfaceStrong: '#fffaf4',
  border: '#d4c8ba',
  shadow: '#43372e',
  text: '#40362f',
  textSoft: '#6e6258',
  accent: '#c67b62',
  accentSoft: '#eddad8',
  sage: '#8da286',
};

function prepareLogoMarkup(rawSvg) {
  return rawSvg
    .replace(/\swidth="[^"]*"/g, '')
    .replace(/\sheight="[^"]*"/g, '')
    .replace(/fill="black"/g, 'fill="currentColor"');
}

function wrapHtml(body, extraCss = '') {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <style>
    html, body {
      margin: 0;
      width: 100%;
      height: 100%;
    }

    body {
      overflow: hidden;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      -webkit-font-smoothing: antialiased;
      text-rendering: geometricPrecision;
      background: ${palette.bg};
    }

    * {
      box-sizing: border-box;
    }

    svg {
      display: block;
    }

    ${extraCss}
  </style>
</head>
<body>${body}</body>
</html>`;
}

function buildIconMarkup(logoMarkup) {
  return wrapHtml(
    `
      <main class="icon-stage">
        <div class="icon-noise icon-noise-top"></div>
        <div class="icon-noise icon-noise-bottom"></div>
        <div class="icon-shell">
          <div class="icon-mark">${logoMarkup}</div>
        </div>
      </main>
    `,
    `
      .icon-stage {
        position: relative;
        width: 100%;
        height: 100%;
        background:
          radial-gradient(circle at 18% 18%, ${palette.accentSoft} 0, transparent 34%),
          radial-gradient(circle at 82% 80%, rgba(141, 162, 134, 0.18) 0, transparent 32%),
          linear-gradient(180deg, ${palette.bg} 0%, ${palette.bgSecondary} 100%);
      }

      .icon-noise {
        position: absolute;
        border-radius: 999px;
        filter: blur(8px);
        opacity: 0.9;
      }

      .icon-noise-top {
        top: 100px;
        left: 120px;
        width: 240px;
        height: 240px;
        background: rgba(198, 123, 98, 0.16);
      }

      .icon-noise-bottom {
        right: 110px;
        bottom: 120px;
        width: 220px;
        height: 220px;
        background: rgba(141, 162, 134, 0.14);
      }

      .icon-shell {
        position: absolute;
        inset: 84px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 280px;
        background:
          linear-gradient(180deg, rgba(255, 255, 255, 0.72), rgba(255, 255, 255, 0.28)),
          ${palette.surface};
        border: 1px solid rgba(212, 200, 186, 0.84);
        box-shadow:
          0 42px 80px rgba(67, 55, 46, 0.12),
          inset 0 1px 0 rgba(255, 255, 255, 0.78);
      }

      .icon-mark {
        width: 56%;
        height: 56%;
        color: ${palette.text};
        filter: drop-shadow(0 14px 22px rgba(67, 55, 46, 0.12));
      }

      .icon-mark svg {
        width: 100%;
        height: 100%;
      }
    `,
  );
}

function buildPreviewMarkup(logoMarkup) {
  return wrapHtml(
    `
      <main class="preview-stage">
        <div class="preview-aura preview-aura-left"></div>
        <div class="preview-aura preview-aura-right"></div>
        <div class="preview-watermark">${logoMarkup}</div>
        <section class="preview-card">
          <div class="preview-icon-shell">
            <div class="preview-icon">${logoMarkup}</div>
          </div>
          <div class="preview-copy">
            <div class="preview-label">NEW MARK</div>
            <div class="preview-wordmark">VOLT</div>
            <div class="preview-caption">Brand preview</div>
          </div>
        </section>
      </main>
    `,
    `
      .preview-stage {
        position: relative;
        width: 100%;
        height: 100%;
        background:
          radial-gradient(circle at 14% 22%, rgba(198, 123, 98, 0.22) 0, transparent 28%),
          radial-gradient(circle at 88% 18%, rgba(141, 162, 134, 0.16) 0, transparent 24%),
          linear-gradient(135deg, ${palette.bg} 0%, ${palette.bgSecondary} 100%);
        overflow: hidden;
      }

      .preview-aura {
        position: absolute;
        border-radius: 999px;
        filter: blur(8px);
      }

      .preview-aura-left {
        left: -80px;
        bottom: -120px;
        width: 360px;
        height: 360px;
        background: rgba(198, 123, 98, 0.14);
      }

      .preview-aura-right {
        right: -60px;
        top: -90px;
        width: 320px;
        height: 320px;
        background: rgba(141, 162, 134, 0.12);
      }

      .preview-watermark {
        position: absolute;
        top: 36px;
        right: 24px;
        width: 360px;
        height: 360px;
        color: rgba(64, 54, 47, 0.05);
        transform: rotate(12deg);
      }

      .preview-watermark svg {
        width: 100%;
        height: 100%;
      }

      .preview-card {
        position: absolute;
        left: 84px;
        right: 84px;
        bottom: 72px;
        display: flex;
        align-items: center;
        gap: 42px;
        padding: 44px 48px;
        border-radius: 44px;
        background:
          linear-gradient(180deg, rgba(255, 255, 255, 0.7), rgba(255, 255, 255, 0.44)),
          ${palette.surfaceStrong};
        border: 1px solid rgba(212, 200, 186, 0.84);
        box-shadow:
          0 28px 56px rgba(67, 55, 46, 0.12),
          inset 0 1px 0 rgba(255, 255, 255, 0.76);
      }

      .preview-icon-shell {
        flex: 0 0 auto;
        width: 220px;
        height: 220px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 56px;
        background:
          radial-gradient(circle at 22% 18%, rgba(198, 123, 98, 0.12) 0, transparent 32%),
          linear-gradient(180deg, ${palette.surfaceStrong} 0%, ${palette.surface} 100%);
        border: 1px solid rgba(212, 200, 186, 0.92);
        box-shadow:
          inset 0 1px 0 rgba(255, 255, 255, 0.88),
          0 22px 48px rgba(67, 55, 46, 0.08);
      }

      .preview-icon {
        width: 60%;
        height: 60%;
        color: ${palette.text};
      }

      .preview-icon svg {
        width: 100%;
        height: 100%;
      }

      .preview-copy {
        min-width: 0;
        color: ${palette.text};
      }

      .preview-label {
        font-size: 22px;
        letter-spacing: 0.28em;
        color: ${palette.textSoft};
        text-transform: uppercase;
      }

      .preview-wordmark {
        margin-top: 10px;
        font-size: 128px;
        line-height: 0.92;
        letter-spacing: 0.16em;
        font-weight: 700;
      }

      .preview-caption {
        margin-top: 18px;
        font-size: 28px;
        letter-spacing: 0.08em;
        color: ${palette.accent};
        text-transform: uppercase;
      }
    `,
  );
}

async function renderPng(browser, html, width, height) {
  const page = await browser.newPage({
    viewport: { width, height },
    deviceScaleFactor: 1,
  });

  try {
    await page.setContent(html, { waitUntil: 'load' });
    return await page.screenshot({ type: 'png' });
  } finally {
    await page.close();
  }
}

function createIcoFromPng(pngBuffer) {
  const header = Buffer.alloc(6 + 16);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(1, 4);
  header.writeUInt8(0, 6);
  header.writeUInt8(0, 7);
  header.writeUInt8(0, 8);
  header.writeUInt8(0, 9);
  header.writeUInt16LE(1, 10);
  header.writeUInt16LE(32, 12);
  header.writeUInt32LE(pngBuffer.length, 14);
  header.writeUInt32LE(22, 18);
  return Buffer.concat([header, pngBuffer]);
}

async function writeBinary(targetPath, contents) {
  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  await fs.writeFile(targetPath, contents);
}

async function main() {
  const rawLogo = await fs.readFile(sourceLogoPath, 'utf8');
  const logoMarkup = prepareLogoMarkup(rawLogo);

  const browser = await chromium.launch({ headless: true });

  try {
    const appIcon = await renderPng(browser, buildIconMarkup(logoMarkup), 1024, 1024);
    const windowsIconPng = await renderPng(browser, buildIconMarkup(logoMarkup), 256, 256);
    const preview = await renderPng(browser, buildPreviewMarkup(logoMarkup), 1200, 630);

    await writeBinary(appIconPath, appIcon);
    await writeBinary(windowsIconPath, createIcoFromPng(windowsIconPng));
    await writeBinary(buildPreviewPath, preview);
    await writeBinary(publicPreviewPath, preview);
  } finally {
    await browser.close();
  }

  console.log(`Updated ${path.relative(repoRoot, appIconPath)}`);
  console.log(`Updated ${path.relative(repoRoot, windowsIconPath)}`);
  console.log(`Updated ${path.relative(repoRoot, buildPreviewPath)}`);
  console.log(`Updated ${path.relative(repoRoot, publicPreviewPath)}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
