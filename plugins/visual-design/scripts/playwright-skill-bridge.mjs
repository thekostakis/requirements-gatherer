#!/usr/bin/env node
/**
 * Headless Playwright bridge for design-reviewer / functional-tester (CI-safe, no MCP).
 * Keep in sync with plugins/functional-tester/scripts/playwright-skill-bridge.mjs
 *
 * Usage:
 *   node playwright-skill-bridge.mjs snapshot <url>
 *   node playwright-skill-bridge.mjs screenshot <url> <out.png> [width] [height]
 *   node playwright-skill-bridge.mjs network <url>
 *   node playwright-skill-bridge.mjs probe-login <url>
 *   node playwright-skill-bridge.mjs run <url> <module.mjs>
 *
 * run: module must export default async function (page, context) { return value; }
 *
 * Env: PW_STORAGE_STATE=path/to/state.json  PW_IGNORE_HTTPS_ERRORS=1
 */
import path from 'path';
import { pathToFileURL } from 'url';

const storageState = process.env.PW_STORAGE_STATE || undefined;
const ignoreHTTPSErrors =
  process.env.PW_IGNORE_HTTPS_ERRORS === '1' ||
  process.env.PW_IGNORE_HTTPS_ERRORS === 'true';

async function launch(chromium) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    storageState,
    ignoreHTTPSErrors,
  });
  return { browser, context };
}

async function withPage(chromium, url, fn, { waitUntil = 'domcontentloaded' } = {}) {
  const { browser, context } = await launch(chromium);
  try {
    const page = await context.newPage();
    await page.goto(url, { waitUntil, timeout: 90_000 });
    return await fn(page, context);
  } finally {
    await browser.close();
  }
}

function help() {
  console.error(`playwright-skill-bridge.mjs — headless Chromium via Playwright
  snapshot <url>              — accessibility tree JSON (stdout)
  screenshot <url> <out.png> [w] [h] — full-page PNG
  network <url>               — request log JSON (first 500 reqs)
  probe-login <url>           — { behindLogin, signals } JSON
  run <url> <module.mjs>      — default export async (page, context) => any`);
}

async function main() {
  const [, , cmd, url, ...rest] = process.argv;
  if (!cmd || cmd === '--help' || cmd === '-h') {
    help();
    process.exit(0);
  }
  if (!url) {
    help();
    process.exit(1);
  }

  const { chromium } = await import('playwright');

  if (cmd === 'snapshot') {
    const snap = await withPage(chromium, url, async (page) => page.accessibility.snapshot());
    console.log(JSON.stringify(snap));
    return;
  }

  if (cmd === 'screenshot') {
    const out = rest[0];
    const w = rest[1] ? parseInt(rest[1], 10) : 1280;
    const h = rest[2] ? parseInt(rest[2], 10) : 720;
    if (!out) throw new Error('screenshot requires output path');
    await withPage(chromium, url, async (page) => {
      await page.setViewportSize({ width: w, height: h });
      await page.screenshot({ path: out, fullPage: true });
    });
    console.log(JSON.stringify({ ok: true, path: path.resolve(out) }));
    return;
  }

  if (cmd === 'network') {
    const { browser, context } = await launch(chromium);
    try {
      const page = await context.newPage();
      const requests = [];
      page.on('request', (req) => {
        try {
          requests.push({
            url: req.url(),
            method: req.method(),
            resourceType: req.resourceType(),
          });
        } catch {
          /* ignore */
        }
      });
      await page.goto(url, { waitUntil: 'networkidle', timeout: 90_000 }).catch(() => {});
      await new Promise((r) => setTimeout(r, 2000));
      console.log(
        JSON.stringify({
          count: requests.length,
          requests: requests.slice(0, 500),
        }),
      );
    } finally {
      await browser.close();
    }
    return;
  }

  if (cmd === 'probe-login') {
    const result = await withPage(chromium, url, async (page) =>
      page.evaluate(() => {
        const loginSignals = [
          document.querySelector('input[type="password"]'),
          document.querySelector('form[action*="login"]'),
          document.querySelector('form[action*="signin"]'),
          document.querySelector('[data-testid*="login"]'),
          document.querySelector('[data-testid*="signin"]'),
        ].filter(Boolean);
        const urlSignals = /\/(login|signin|sign-in|auth)\b/i.test(
          window.location.href,
        );
        return {
          behindLogin: loginSignals.length > 0 || urlSignals,
          signals: loginSignals.map(
            (el) => el.tagName + (el.type ? `[type=${el.type}]` : ''),
          ),
        };
      }),
    );
    console.log(JSON.stringify(result));
    return;
  }

  if (cmd === 'run') {
    const modPath = rest[0];
    if (!modPath) throw new Error('run requires module path');
    const abs = path.resolve(modPath);
    const mod = await import(pathToFileURL(abs).href);
    const fn = mod.default;
    if (typeof fn !== 'function') {
      throw new Error('module must export default async function (page, context)');
    }
    const { browser, context } = await launch(chromium);
    try {
      const page = await context.newPage();
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90_000 });
      const out = await fn(page, context);
      console.log(JSON.stringify(out === undefined ? { ok: true } : out));
    } finally {
      await browser.close();
    }
    return;
  }

  help();
  process.exit(1);
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
