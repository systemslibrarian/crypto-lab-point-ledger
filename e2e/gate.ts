import AxeBuilder from '@axe-core/playwright';
import { expect, type Page } from '@playwright/test';
import { auditContrast, formatContrastFailures } from './contrast';
import { auditNonText } from './nontext';
import { NONTEXT_BASELINE } from './nontext-baseline';
export const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];
export const NARROW = { width: 380, height: 800 };
export async function settle(page: Page, budgetMs = 4000): Promise<void> {
    await page.waitForFunction((budget: number) => {
        const w = window as unknown as {
            __quietFrames?: number;
            __settleStart?: number;
        };
        if (w.__settleStart === undefined)
            w.__settleStart = performance.now();
        const done = (): boolean => {
            w.__quietFrames = 0;
            w.__settleStart = undefined;
            return true;
        };
        const running = document.getAnimations().filter((a) => {
            if (a.playState !== 'running')
                return false;
            const timing = a.effect?.getComputedTiming?.();
            return timing?.iterations !== Infinity;
        });
        w.__quietFrames = running.length === 0 ? (w.__quietFrames ?? 0) + 1 : 0;
        if (w.__quietFrames >= 6)
            return done();
        if (performance.now() - (w.__settleStart ?? 0) > budget)
            return done();
        return false;
    }, budgetMs, { timeout: 20000, polling: 'raf' });
}
async function expectNotBlank(page: Page, label: string): Promise<void> {
    const invisible = await page.evaluate(() => {
        const out: string[] = [];
        for (const el of Array.from(document.querySelectorAll('body *'))) {
            const own = Array.from(el.childNodes)
                .filter((n) => n.nodeType === Node.TEXT_NODE)
                .map((n) => n.textContent ?? '')
                .join('')
                .trim();
            if (!own)
                continue;
            if (!(el as HTMLElement).checkVisibility?.({ checkVisibilityCSS: true }))
                continue;
            if (el.closest('[aria-hidden="true"]'))
                continue;
            let effective = 1;
            let node: Element | null = el;
            while (node) {
                effective *= parseFloat(getComputedStyle(node).opacity);
                node = node.parentElement;
            }
            if (effective === 0) {
                out.push(`${el.tagName.toLowerCase()}.${(el.getAttribute('class') ?? '').trim()}`);
            }
        }
        return Array.from(new Set(out));
    });
    expect(invisible, `no visible text may render at opacity 0 in state: ${label}`).toEqual([]);
}
export function watchPageErrors(page: Page): string[] {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
    page.on('console', (m) => {
        if (m.type() === 'error')
            errors.push(`console.error: ${m.text()}`);
    });
    return errors;
}
export async function assertSingleBanner(page: Page): Promise<void> {
    const banners = await page.evaluate(() => {
        const scoped = new Set(['MAIN', 'ARTICLE', 'ASIDE', 'NAV', 'SECTION']);
        const isBanner = (el: Element): boolean => {
            if (el.getAttribute('role') === 'banner')
                return true;
            if (el.tagName !== 'HEADER')
                return false;
            if (el.getAttribute('role'))
                return false;
            for (let p = el.parentElement; p; p = p.parentElement)
                if (scoped.has(p.tagName))
                    return false;
            return true;
        };
        return [...document.querySelectorAll('header,[role="banner"]')].filter(isBanner).length;
    });
    expect(banners, 'exactly one banner landmark').toBe(1);
}
export async function assertListSemantics(page: Page): Promise<void> {
    const broken = await page.$$eval('ul[role], ol[role]', (els) => els
        .filter((e) => e.getAttribute('role') !== 'list' || e.children.length === 0)
        .map((e) => `${e.tagName.toLowerCase()}[role=${e.getAttribute('role')}] with ${e.children.length} children`));
    expect(broken, 'an explicit non-list role on a list deletes its semantics; an empty role="list" fails aria-required-children').toEqual([]);
}
export async function expectNoHorizontalOverflow(page: Page, label: string): Promise<void> {
    const overflow = await page.evaluate(() => {
        const doc = document.documentElement;
        if (doc.scrollWidth <= doc.clientWidth)
            return null;
        const clipped = (el: Element): boolean => {
            let n = el.parentElement;
            while (n && n !== doc) {
                const ox = getComputedStyle(n).overflowX;
                if (ox === 'auto' || ox === 'scroll' || ox === 'hidden' || ox === 'clip')
                    return true;
                n = n.parentElement;
            }
            return false;
        };
        const over = Array.from(document.querySelectorAll('body *'))
            .map((el) => ({ el, r: el.getBoundingClientRect() }))
            .filter((x) => x.r.width > 0 && x.r.right > doc.clientWidth + 1)
            .sort((a, b) => b.r.right - a.r.right);
        const widest = over.filter((x) => !clipped(x.el))[0] ?? over[0];
        return {
            scrollWidth: doc.scrollWidth,
            clientWidth: doc.clientWidth,
            widest: widest
                ? `${clipped(widest.el) ? '[clipped] ' : ''}${widest.el.tagName.toLowerCase()}${widest.el.id ? '#' + widest.el.id : ''}` +
                    `${widest.el.getAttribute('class') ? '.' + widest.el.getAttribute('class')!.trim().split(/\s+/).join('.') : ''}` +
                    ` @${Math.round(widest.r.width)}px right=${Math.round(widest.r.right)}`
                : '(none identified)',
        };
    });
    expect(overflow, `page must not scroll horizontally in state: ${label}`).toBeNull();
}
export async function expectScrollersReachable(page: Page, label: string): Promise<void> {
    const unreachable = await page.evaluate(() => {
        const FOCUSABLE = 'a[href],button,input,select,textarea,summary,[tabindex]:not([tabindex="-1"])';
        return Array.from(document.querySelectorAll<HTMLElement>('body *'))
            .filter((el) => el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1)
            .filter((el) => {
            const cs = getComputedStyle(el);
            return ['auto', 'scroll'].includes(cs.overflowX) || ['auto', 'scroll'].includes(cs.overflowY);
        })
            .filter((el) => el.tabIndex < 0 && !el.querySelector(FOCUSABLE))
            .map((el) => `${el.tagName.toLowerCase()}.${(el.getAttribute('class') ?? '').trim()}` +
            ` (${el.scrollWidth}x${el.scrollHeight} in ${el.clientWidth}x${el.clientHeight})`);
    });
    expect(Array.from(new Set(unreachable)), `scrolling regions with no keyboard route in state: ${label}`).toEqual([]);
}
export async function expectNoInvisibleFocusTargets(page: Page, label: string): Promise<void> {
    const bad = await page.evaluate(() => {
        const FOCUSABLE = 'a[href],button,input,select,textarea,summary,[tabindex]:not([tabindex="-1"])';
        const out: string[] = [];
        for (const el of Array.from(document.querySelectorAll<HTMLElement>(FOCUSABLE))) {
            if (el.tabIndex < 0)
                continue;
            if (!el.checkVisibility?.({ checkVisibilityCSS: true }))
                continue;
            let effective = 1;
            for (let n: Element | null = el; n; n = n.parentElement) {
                effective *= parseFloat(getComputedStyle(n).opacity);
            }
            const r = el.getBoundingClientRect();
            if (effective !== 0 && r.width > 0 && r.height > 0)
                continue;
            const before = document.activeElement;
            el.focus();
            const took = document.activeElement === el;
            (before as HTMLElement | null)?.focus?.();
            if (took) {
                out.push(`${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}.${(el.getAttribute('class') ?? '').trim()}` +
                    ` (opacity ${effective}, ${Math.round(r.width)}x${Math.round(r.height)})`);
            }
        }
        return Array.from(new Set(out));
    });
    expect(bad, `focusable elements that paint nothing in state: ${label}`).toEqual([]);
}
const COLLECTING = !!process.env.A11Y_COLLECT;
const collected: string[] = [];
function record(entry: string): void {
    collected.push(entry);
    console.log(`\n[A11Y_COLLECT #${collected.length}] ${entry}`);
}
export function softExpect(actual: unknown, message: string, expected: unknown): void {
    if (!COLLECTING) {
        expect(actual, message).toEqual(expected);
        return;
    }
    try {
        expect(actual, message).toEqual(expected);
    }
    catch {
        record(`${message}\n  ${JSON.stringify(actual, null, 2)}`);
    }
}
export function reportCollected(): void {
    if (!COLLECTING)
        return;
    expect(collected, `A11Y_COLLECT recorded ${collected.length} failure(s)`).toEqual([]);
}
async function soft(fn: () => Promise<void>): Promise<void> {
    if (!COLLECTING)
        return fn();
    try {
        await fn();
    }
    catch (e) {
        record(String(e).slice(0, 6000));
    }
}
const nonTextSeen = new Set<string>();
export async function expectNoNewNonTextFailures(page: Page, label: string): Promise<void> {
    const found = await auditNonText(page);
    if (process.env.NT_BASELINE_CAPTURE) {
        for (const f of found) {
            console.log(`NTCAP|${f.kind}|${f.selector}|${f.ratio}|${f.required}|${/POSITIONED/.test(f.detail)}`);
        }
        return;
    }
    const problems: string[] = [];
    for (const f of found) {
        const key = `${f.kind}|${f.selector}`;
        nonTextSeen.add(key);
        const base = NONTEXT_BASELINE[key];
        if (!base) {
            problems.push(`NEW ${f.ratio}:1 (needs ${f.required}:1) [${f.kind}] ${f.selector} — ${f.detail}`);
        }
        else if (f.ratio < base.ratio - 0.01) {
            problems.push(`WORSE ${f.selector}: ${f.ratio}:1, baseline recorded ${base.ratio}:1`);
        }
    }
    expect(problems, `new or worsened non-text contrast in state: ${label}`).toEqual([]);
}
export function expectBaselineNotStale(): void {
    const unseen = Object.keys(NONTEXT_BASELINE).filter((k) => !nonTextSeen.has(k));
    expect(unseen, 'baselined non-text findings that no longer appear — delete them from nontext-baseline.ts (or restore the drive state that showed them)').toEqual([]);
}
export async function boot(page: Page): Promise<void> {
    page.setDefaultTimeout(20000);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.addInitScript(() => localStorage.setItem('theme', 'light'));
    await page.goto('.');
    await expect(page.getByRole('heading', { name: 'Point Ledger', exact: true })).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    expect(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(true);
    await page.evaluate(() => document.fonts.ready);
    await assertSingleBanner(page);
    await assertListSemantics(page);
    await expect(page.locator('main')).toHaveCount(1);
    await expect(page.getByRole('tab')).toHaveCount(4);
    await expect(page.locator('#tab-0')).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByTestId('attack-toffoli')).toHaveText('64,305,024');
    await expect(page.locator('#app')).toHaveCount(1);
    await expect(page.locator('.cl-skip-link')).toHaveAttribute('href', '#app');
    await expect(page.locator('[data-theme-toggle], #theme-toggle, .theme-toggle')).toHaveCount(0);
    for (const index of [1, 2, 3]) await expect(page.locator(`#act-${index}`)).toBeHidden();
    await expect(page.locator('details[open]')).toHaveCount(0);
    await settle(page);
    await expectNotBlank(page, 'Point Ledger arrival');
}

export async function openAct(page: Page, index: number) {
    await page.locator(`#tab-${index}`).click();
    await expect(page.locator(`#act-${index}`)).toBeVisible();
    await expect(page.locator(`#tab-${index}`)).toHaveAttribute('aria-selected', 'true');
}

export async function finishDialog(page: Page) {
    await page.getByRole('button', { name: 'Run dialog', exact: true }).click();
    await page.getByRole('button', { name: 'Finish dialog phase', exact: true }).click();
    await page.getByRole('button', { name: 'Replay backward', exact: true }).click();
    await page.getByRole('button', { name: 'Finish dialog phase', exact: true }).click();
    await expect(page.getByTestId('dialog-verdict')).toBeVisible();
}

export async function openDisclosures(page: Page, root: string) {
    for (const disclosure of await page.locator(`${root} details`).all()) {
        const summary = disclosure.locator(':scope > summary');
        if (await summary.isVisible() && await disclosure.getAttribute('open') === null) await summary.click();
    }
}

export async function driveAllStates(page: Page, label: string) {
    const scanAt = (state: string) => scan(page, `${label} / ${state}`);
    await scanAt('arrival, default low-gate ledger');
    await page.locator('.cl-skip-link').focus();
    await expect(page.locator('.cl-skip-link')).toBeFocused();
    await scanAt('focused skip link');
    await openDisclosures(page, '#act-0');
    await scanAt('ledger rows, cost shares and factory disclosure');
    await page.getByRole('button', { name: 'Low qubits', exact: true }).click();
    await page.getByLabel('Primed start', { exact: true }).uncheck();
    await page.getByLabel('Race clock input').selectOption('a1-qubit');
    await expect(page.getByTestId('race-attribution')).toHaveText('lab derivation');
    await scanAt('low-qubit unprimed clock and derived race');
    await openAct(page, 1);
    await scanAt('dialog defaults');
    await page.getByRole('button', { name: 'Run dialog', exact: true }).click();
    await page.getByRole('button', { name: 'Next dialog step', exact: true }).click();
    await scanAt('recording step and fixed register');
    await finishDialog(page);
    await expect(page.getByTestId('dialog-verdict')).toHaveAttribute('data-verdict', 'pass');
    await openDisclosures(page, '#act-1');
    await page.getByRole('button', { name: 'x + y = p boundary', exact: true }).click();
    await scanAt('replay pass, exact values and boundary handling');
    await page.getByLabel('Multiplier x', { exact: true }).fill('0');
    await page.getByRole('button', { name: 'Run dialog', exact: true }).click();
    await expect(page.getByTestId('dialog-error')).toContainText('x = 0');
    await scanAt('zero multiplier rejected');
    await page.getByLabel('Multiplier x', { exact: true }).fill('115792089237316195423570985008687907853269984665640564039457584007908834671662');
    await finishDialog(page);
    await expect(page.getByTestId('dialog-verdict')).toContainText('Iteration budget exhausted');
    await scanAt('exhausted dialog budget');
    await page.getByLabel('Measurement sample count').selectOption('64');
    await page.getByRole('button', { name: 'Measure random inputs', exact: true }).click();
    await expect(page.getByTestId('failure-estimate')).toBeVisible();
    await scanAt('worker measurement and uncertainty interval');
    await openAct(page, 2);
    await scanAt('unknown draw budget and ceiling curve');
    await page.getByLabel('The number of draws is unknown').uncheck();
    await page.getByLabel('Draw bound G', { exact: true }).fill('100000000');
    await expect(page.getByTestId('ceiling-value')).toContainText('0.2548');
    await scanAt('known draw-bound conditional ceiling');
    await page.getByRole('button', { name: 'Grind nonces', exact: true }).click();
    await expect(page.getByTestId('grind-verdict')).toHaveAttribute('data-verdict', 'lands');
    await openDisclosures(page, '#act-2');
    await scanAt('clean draw, calibration, log plots and contested accounts');
    await page.getByLabel('Ceiling test count').fill('0');
    await expect(page.getByTestId('ceiling-result')).toHaveCount(0);
    await scanAt('invalid statistical parameters');
    await openAct(page, 3);
    await scanAt('proof pipeline and safe toy defaults');
    for (const name of ['Generate and test', 'Assert resources', 'Prove execution', 'Wrap in Groth16']) {
        await page.getByRole('button', { name: new RegExp(name) }).click();
        await scanAt(`proof pipeline: ${name}`);
    }
    await page.getByRole('button', { name: 'Apply CCX', exact: true }).click();
    await expect(page.getByTestId('toy-verdict')).toContainText('Rejected');
    await scanAt('aliased CCX rejected');
    await page.getByLabel('Check operand aliasing', { exact: true }).uncheck();
    await page.getByRole('button', { name: 'Apply CCX', exact: true }).click();
    await scanAt('unchecked forward step, before reverse');
    await page.getByRole('button', { name: 'Apply reverse', exact: true }).click();
    await expect(page.getByTestId('toy-verdict')).toHaveAttribute('data-verdict', 'irreversible');
    await scanAt('unchecked aliasing reversibility failure');
    await page.getByRole('button', { name: 'CCX(q0, q1, q2)', exact: true }).click();
    await page.getByLabel('Check operand aliasing', { exact: true }).check();
    await page.getByRole('button', { name: 'Apply CCX', exact: true }).click();
    await page.getByRole('button', { name: 'Apply reverse', exact: true }).click();
    await expect(page.getByTestId('toy-verdict')).toHaveAttribute('data-verdict', 'reversible');
    await scanAt('distinct operands round-trip');
    await page.locator('#sources > summary').click();
    await scanAt('sources and read-status disclosure');
    await page.locator('.cl-btn').first().hover();
    await scanAt('fleet button hover');
    await page.locator('#tab-0').hover();
    await scanAt('inactive tab hover');
    await page.getByRole('button', { name: 'Apply CCX', exact: true }).focus();
    await scanAt('primary button focused');
}

export async function scan(page: Page, label: string): Promise<void> {
    await settle(page);
    await expectNotBlank(page, label);
    const wcag = await new AxeBuilder({ page }).withTags(TAGS).analyze();
    const landmarks = await new AxeBuilder({ page })
        .withRules([
        'landmark-no-duplicate-banner',
        'landmark-unique',
        'landmark-one-main',
        'landmark-complementary-is-top-level',
    ])
        .analyze();
    const results = {
        violations: [...wcag.violations, ...landmarks.violations],
        incomplete: [...wcag.incomplete, ...landmarks.incomplete],
    };
    const violations = results.violations.map((v) => ({
        state: label,
        id: v.id,
        impact: v.impact,
        help: v.help,
        nodes: v.nodes.map((n) => n.target.join(' ')).slice(0, 8),
    }));
    softExpect(violations, `axe violations in state: ${label}`, []);
    const unexplainedIncomplete = results.incomplete
        .filter((v) => v.id !== 'color-contrast')
        .map((v) => ({
        state: label,
        id: v.id,
        nodes: v.nodes.map((n) => n.target.join(' ')).slice(0, 8),
    }));
    softExpect(unexplainedIncomplete, `axe incomplete results in state: ${label}`, []);
    const contrast = Array.from(new Set(formatContrastFailures(await auditContrast(page))));
    softExpect(contrast, `measured contrast failures in state: ${label}`, []);
    const hiddenContrast = Array.from(new Set(formatContrastFailures(await auditContrast(page, '[aria-hidden="true"], [aria-hidden="true"] *', true))));
    softExpect(hiddenContrast, `measured aria-hidden contrast failures in state: ${label}`, []);
    await soft(() => expectNoNewNonTextFailures(page, label));
    await soft(() => expectScrollersReachable(page, label));
    await soft(() => expectNoInvisibleFocusTargets(page, label));
    await soft(() => expectNoHorizontalOverflow(page, label));
}
