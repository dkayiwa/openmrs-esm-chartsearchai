import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

/**
 * i18next HTML-escapes every string it interpolates unless the call opts out, and the app shell
 * leaves that default on. React escapes the text again, so an escaped value reaches the screen as
 * its entity: an order named "Solu-Medrol 125mg/5ml" was drawn "Solu-Medrol 125mg&#x2F;5ml". So
 * every translation call that interpolates a value other than `count`, a number nothing escapes,
 * passes `interpolation: { escapeValue: false }`. Nothing is lost: React's own escaping is what
 * keeps the value inert, and no component renders raw HTML.
 */
function sourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return entry.name.startsWith('__') ? [] : sourceFiles(full);
    return /\.tsx?$/.test(full) && !/\.test\.tsx?$/.test(full) ? [full] : [];
  });
}

/**
 * Each `t(` call in `text` with the line it opens on, from its opening parenthesis to the one that
 * closes it — string literals stepped over, since a default text can hold a parenthesis.
 */
function translationCalls(text: string): Array<{ line: number; call: string }> {
  const calls: Array<{ line: number; call: string }> = [];
  const opener = /\bt\(/g;
  let match: RegExpExecArray | null;
  while ((match = opener.exec(text))) {
    let depth = 0;
    let quote: string | null = null;
    let end = match.index + 1;
    for (; end < text.length; end++) {
      const c = text[end];
      if (quote) {
        if (c === '\\') end++;
        else if (c === quote) quote = null;
      } else if (c === "'" || c === '"' || c === '`') quote = c;
      else if (c === '(') depth++;
      else if (c === ')' && --depth === 0) break;
    }
    calls.push({ line: text.slice(0, match.index).split('\n').length, call: text.slice(match.index, end + 1) });
  }
  return calls;
}

describe('interpolated translation values', () => {
  it('are never escaped by i18next, since React escapes them', () => {
    const offenders: string[] = [];
    for (const file of sourceFiles(__dirname)) {
      for (const { line, call } of translationCalls(fs.readFileSync(file, 'utf8'))) {
        const values = [...call.matchAll(/\{\{\s*(\w+)\s*\}\}/g)].map((m) => m[1]).filter((name) => name !== 'count');
        if (values.length > 0 && !/escapeValue:\s*false/.test(call)) {
          offenders.push(`${path.relative(__dirname, file)}:${line} (${values.join(', ')})`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it('finds the calls it checks', () => {
    // The scan above passes vacuously if it reads no call at all.
    const calls = sourceFiles(__dirname).flatMap((file) => translationCalls(fs.readFileSync(file, 'utf8')));
    expect(calls.some(({ call }) => call.includes("'alreadyPrescribedOrders'"))).toBe(true);
  });
});
