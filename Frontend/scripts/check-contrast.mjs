import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const STYLESHEET_PATH = resolve(SCRIPT_DIR, '../src/styles/global.css');
const THEMES = ['dark', 'light'];
const REQUIRED_TOKENS = [
  '--text',
  '--background',
  '--surface',
  '--text-muted',
  '--text-longform',
  '--text-longform-soft',
  '--primary',
];
const TEXT_PAIRS = [
  ['--text', '--background'],
  ['--text', '--surface'],
  ['--text-muted', '--background'],
  ['--text-longform', '--surface'],
  ['--text-longform-soft', '--surface'],
];
const CONTRAST_THRESHOLD = 4.5;
const HEX_COLOR_PATTERN = /^#(?:[\da-f]{3}|[\da-f]{6})$/i;

function extractBlock(stylesheet, selector) {
  const selectorPattern = new RegExp(`${selector}\\s*\\{`, 'i');
  const match = selectorPattern.exec(stylesheet);

  if (!match) {
    throw new Error(`Missing CSS token block: ${selector}`);
  }

  const blockStart = match.index + match[0].length;
  const blockEnd = stylesheet.indexOf('}', blockStart);
  if (blockEnd === -1) {
    throw new Error(`Unterminated CSS token block: ${selector}`);
  }

  return stylesheet.slice(blockStart, blockEnd);
}

function parseTokenBlock(block, selector) {
  const tokens = new Map();
  const declarationPattern = /(--[\w-]+)\s*:\s*([^;{}]+)\s*;/g;
  let match;

  while ((match = declarationPattern.exec(block)) !== null) {
    tokens.set(match[1], match[2].trim());
  }

  if (tokens.size === 0) {
    throw new Error(`No custom-property declarations found in ${selector}`);
  }

  return tokens;
}

function parseHexColor(value, theme, token) {
  if (!HEX_COLOR_PATTERN.test(value)) {
    throw new Error(
      `${theme} ${token} must be a supported hex color, received ${JSON.stringify(value)}`,
    );
  }

  const digits = value.slice(1);
  const expanded = digits.length === 3
    ? digits.split('').map((digit) => `${digit}${digit}`).join('')
    : digits;

  return [0, 2, 4].map((offset) => parseInt(expanded.slice(offset, offset + 2), 16) / 255);
}

function relativeLuminance(rgb) {
  const linearized = rgb.map((channel) => (
    channel <= 0.04045
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4
  ));

  return (0.2126 * linearized[0])
    + (0.7152 * linearized[1])
    + (0.0722 * linearized[2]);
}

function contrastRatio(foreground, background) {
  const foregroundLuminance = relativeLuminance(foreground);
  const backgroundLuminance = relativeLuminance(background);
  const lighter = Math.max(foregroundLuminance, backgroundLuminance);
  const darker = Math.min(foregroundLuminance, backgroundLuminance);

  return (lighter + 0.05) / (darker + 0.05);
}

function formatRatio(ratio) {
  return `${ratio.toFixed(2)}:1`;
}

async function main() {
  const stylesheet = await readFile(STYLESHEET_PATH, 'utf8');
  const darkTokens = parseTokenBlock(extractBlock(stylesheet, ':root'), ':root');
  const lightTokens = parseTokenBlock(
    extractBlock(stylesheet, 'html\\[data-theme="light"\\]'),
    'html[data-theme="light"]',
  );
  const themeTokens = { dark: darkTokens, light: lightTokens };
  const failures = [];
  let assertionCount = 0;

  for (const theme of THEMES) {
    const tokens = themeTokens[theme];
    const colors = new Map();

    for (const token of REQUIRED_TOKENS) {
      if (!tokens.has(token)) {
        failures.push(`${theme} ${token}: required token is missing`);
        continue;
      }

      try {
        colors.set(token, parseHexColor(tokens.get(token), theme, token));
      } catch (error) {
        failures.push(error.message);
      }
    }

    for (const [foregroundToken, backgroundToken] of TEXT_PAIRS) {
      assertionCount += 1;
      const foreground = colors.get(foregroundToken);
      const background = colors.get(backgroundToken);

      if (!foreground || !background) {
        failures.push(`${theme} ${foregroundToken}/${backgroundToken}: cannot evaluate missing or invalid token`);
        continue;
      }

      const ratio = contrastRatio(foreground, background);
      if (ratio < CONTRAST_THRESHOLD) {
        failures.push(
          `${theme} ${foregroundToken}/${backgroundToken}: ${formatRatio(ratio)} `
            + `(required >= ${CONTRAST_THRESHOLD}:1)`,
        );
      }
    }

    assertionCount += 1;
    const primary = colors.get('--primary');
    if (!primary) {
      failures.push(`${theme} #fff/--primary: cannot evaluate missing or invalid token`);
    } else {
      const ratio = contrastRatio(parseHexColor('#fff', theme, 'fixed button text'), primary);
      if (ratio < CONTRAST_THRESHOLD) {
        failures.push(
          `${theme} #fff/--primary: ${formatRatio(ratio)} `
            + `(required >= ${CONTRAST_THRESHOLD}:1)`,
        );
      }
    }
  }

  if (failures.length > 0) {
    console.error(`Contrast check failed with ${failures.length} issue(s):`);
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log(`Contrast check passed: ${assertionCount} assertions across dark and light themes.`);
}

try {
  await main();
} catch (error) {
  console.error(`Contrast check failed: ${error.message}`);
  process.exitCode = 1;
}
