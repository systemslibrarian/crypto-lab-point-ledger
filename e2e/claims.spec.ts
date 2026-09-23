import { expect, test, type Page } from '@playwright/test';
import { boot, finishDialog, openAct, expectNoHorizontalOverflow } from './gate';

const numberOnPage = async (page: Page, id: string) => Number((await page.getByTestId(id).innerText()).replaceAll(',', '').replace('%', ''));

test.beforeEach(async ({ page }) => { await boot(page); });

test('ledger: parts sum to A1; headline, A1 and Figure 6 paths remain distinct', async ({ page }) => {
  const perAddition = await numberOnPage(page, 'addition-toffoli');
  const lookup = await numberOnPage(page, 'lookup-toffoli');
  const count = await numberOnPage(page, 'addition-count');
  const total = await numberOnPage(page, 'attack-toffoli');
  expect(total).toBe((perAddition + lookup) * count);
  expect(total).toBe(await numberOnPage(page, 'arithmetic-total') + await numberOnPage(page, 'lookup-total'));
  expect(total).toBe(64305024);
  await expect(page.getByTestId('addition-bar')).toHaveCount(count);
  await page.getByLabel('Primed start', { exact: true }).uncheck();
  const a1 = await numberOnPage(page, 'a1-gate-minutes');
  const headline = await numberOnPage(page, 'headline-gate-minutes');
  expect(a1).toBeCloseTo(total * 0.000015 / 60, 4);
  expect(headline).toBe(17.5);
  expect(a1).not.toBe(headline);
  expect(await numberOnPage(page, 'a1-qubit-minutes')).toBeCloseTo(20.2763, 4);
  expect(await numberOnPage(page, 'headline-qubit-minutes')).toBe(22.5);
  const raceTime = await numberOnPage(page, 'race-time');
  expect(raceTime).toBe(9);
  expect(await numberOnPage(page, 'race-bitcoin')).toBeCloseTo(Math.exp(-raceTime / 10), 4);
  await page.getByLabel('Race clock input').selectOption('a1-gate');
  expect(await numberOnPage(page, 'race-time')).toBeCloseTo(a1 / 2, 4);
  expect(await numberOnPage(page, 'race-bitcoin')).toBeCloseTo(0.4476, 4);
  await expect(page.getByTestId('race-attribution')).toHaveText('lab derivation');
  await page.getByLabel('Race clock input').selectOption('figure');
  expect(await numberOnPage(page, 'race-time')).toBe(9);
  await page.getByRole('button', { name: 'Low qubits', exact: true }).click();
  expect(await numberOnPage(page, 'attack-toffoli')).toBe(81105024);
  expect(await numberOnPage(page, 'attack-qubits')).toBe(1191);
  await page.locator('#operating-points > summary').click();
  await expect(page.locator('.operating-table tbody tr')).toHaveCount(11);
  await expect(page.locator('.operating-table .accounting-tag')).toHaveCount(11);
});

test('dialog: independent arithmetic, fixed capacity, and original x restoration', async ({ page }) => {
  await openAct(page, 1);
  const input = BigInt(await page.getByLabel('Multiplier x', { exact: true }).inputValue());
  const multiplicand = BigInt(await page.getByLabel('Multiplicand y', { exact: true }).inputValue());
  await finishDialog(page);
  const output = BigInt(await page.getByTestId('dialog-output').innerText());
  const expectedOnPage = BigInt(await page.getByTestId('dialog-expected').innerText());
  const prime = (2n ** 256n) - (2n ** 32n) - 977n;
  expect(output).toBe(expectedOnPage);
  expect(output).toBe((input * multiplicand) % prime);
  expect(BigInt(await page.getByTestId('dialog-restored').innerText())).toBe(input);
  await expect(page.getByTestId('dialog-verdict')).toHaveAttribute('data-verdict', 'pass');
  const register = page.getByTestId('transcript');
  const capacity = Number(await register.getAttribute('data-capacity'));
  const filled = Number(await register.getAttribute('data-filled'));
  expect(filled).toBe(capacity);
  await expect(register.locator('i')).toHaveCount(capacity);
  await page.getByRole('tab', { name: /The dialog/ }).click();
  await expect(page.getByTestId('dialog-verdict')).toHaveAttribute('data-verdict', 'pass');
  await page.getByLabel('Multiplicand y', { exact: true }).fill('42');
  await expect(page.getByTestId('dialog-verdict')).toHaveCount(0);
  await expect(page.getByTestId('dialog-retired')).toContainText('Result retired');
});

test('dialog: rejects zero and malformed input, flags reduction and budget exhaustion', async ({ page }) => {
  await openAct(page, 1);
  await page.getByLabel('Multiplier x', { exact: true }).fill('0');
  await page.getByRole('button', { name: 'Run dialog', exact: true }).click();
  await expect(page.getByTestId('dialog-error')).toContainText('x = 0');
  await page.getByLabel('Multiplier x', { exact: true }).fill('1e3');
  await page.getByRole('button', { name: 'Run dialog', exact: true }).click();
  await expect(page.getByTestId('dialog-error')).toContainText('nonnegative decimal integer');
  const prime = (1n << 256n) - (1n << 32n) - 977n;
  await page.getByLabel('Multiplier x', { exact: true }).fill((prime + 7n).toString());
  await finishDialog(page);
  await expect(page.getByText('Input x was at least p', { exact: false })).toBeVisible();
  await expect(page.getByTestId('dialog-restored')).toHaveText('7');
  await page.getByLabel('Multiplier x', { exact: true }).fill((prime - 1n).toString());
  await finishDialog(page);
  await expect(page.getByTestId('dialog-verdict')).toHaveAttribute('data-verdict', 'failure');
  await expect(page.getByTestId('dialog-verdict')).toContainText('Iteration budget exhausted');
  await page.getByRole('button', { name: 'x + y = p boundary', exact: true }).click();
  await expect(page.getByTestId('reduction-result')).toHaveText('0');
});

test('ceiling: no point for unknown G; independent inversion checks known budgets', async ({ page }) => {
  await openAct(page, 2);
  await expect(page.getByTestId('unknown-ceiling')).toBeVisible();
  await expect(page.getByTestId('ceiling-result')).toHaveCount(0);
  await page.getByLabel('The number of draws is unknown').uncheck();
  for (const drawBound of [1, 1e8, 2 ** 48]) {
    await page.getByLabel('Draw bound G', { exact: true }).fill(String(drawBound));
    const tests = Number(await page.getByLabel('Ceiling test count').inputValue());
    const confidence = Number(await page.getByLabel('Confidence percent').inputValue()) / 100;
    const ceilingPercent = await numberOnPage(page, 'ceiling-value');
    expect(ceilingPercent).toBeGreaterThan(0);
    expect(ceilingPercent).toBeCloseTo(100 * (1 - ((1 - confidence) / drawBound) ** (1 / tests)), 4);
  }
  await page.getByLabel('The number of draws is unknown').check();
  await expect(page.getByTestId('ceiling-result')).toHaveCount(0);
  await expect(page.getByTestId('unknown-ceiling')).toContainText('no single certified ceiling');
});

test('grind: selected checks pass while all-input correctness remains unproved', async ({ page }) => {
  await openAct(page, 2);
  await page.getByLabel('Demo tests per draw').selectOption('4');
  await page.getByRole('button', { name: 'Grind nonces', exact: true }).click();
  await expect(page.getByTestId('grind-verdict')).toHaveAttribute('data-verdict', 'lands');
  await expect(page.getByTestId('negative-claim')).toBeVisible();
  await expect(page.getByTestId('negative-claim')).toContainText('does not establish all-input correctness');
  await page.getByText('Inspect the final draw', { exact: true }).click();
  const rows = page.locator('.draw-table tbody tr');
  await expect(rows).toHaveCount(4);
  for (const row of await rows.all()) {
    const cells = await row.locator('td').allTextContents();
    expect(cells[4]).toBe('pass');
    expect(cells[2]).toBe(cells[3]);
    const prime = 2n ** 256n - 2n ** 32n - 977n;
    expect(BigInt(`0x${cells[3]}`)).toBe(BigInt(`0x${cells[0]}`) * BigInt(`0x${cells[1]}`) % prime);
  }
  await expect(page.getByTestId('commitment')).toHaveText(/^[a-f0-9]{64}$/);
  expect(Number((await page.getByTestId('draw-duration').innerText()).replace(' ms', ''))).toBeLessThan(500);
  await page.getByLabel('Demo tests per draw').selectOption('4');
  await expect(page.getByTestId('grind-verdict')).toBeVisible();
  await page.getByLabel('Demo tests per draw').selectOption('8');
  await expect(page.getByTestId('grind-verdict')).toHaveCount(0);
  await expect(page.getByTestId('grind-retired')).toContainText('Result retired');
});

test('toy: guarded alias rejection and failed unchecked reverse, then valid reversal', async ({ page }) => {
  await openAct(page, 3);
  await expect(page.getByLabel('Check operand aliasing', { exact: true })).toBeChecked();
  await page.getByRole('button', { name: 'Apply CCX', exact: true }).click();
  await expect(page.getByTestId('toy-verdict')).toHaveAttribute('data-verdict', 'rejected');
  await page.getByRole('button', { name: 'CCX(q, q, q)', exact: true }).click();
  await expect(page.getByTestId('toy-verdict')).toHaveAttribute('data-verdict', 'rejected');
  await page.getByLabel('Check operand aliasing', { exact: true }).uncheck();
  await expect(page.getByTestId('toy-verdict')).toHaveCount(0);
  await expect(page.getByTestId('toy-retired')).toContainText('Result retired');
  await page.getByRole('button', { name: 'Apply CCX', exact: true }).click();
  await page.getByRole('button', { name: 'Apply reverse', exact: true }).click();
  await expect(page.getByTestId('toy-verdict')).toHaveAttribute('data-verdict', 'irreversible');
  const brokenRows = await page.locator('.toy-table tbody tr').allTextContents();
  expect(brokenRows[1]).toContain('|1>|0>|0>');
  await page.getByRole('button', { name: 'CCX(q0, q1, q2)', exact: true }).click();
  await page.getByLabel('Check operand aliasing', { exact: true }).check();
  await page.getByRole('button', { name: 'Apply CCX', exact: true }).click();
  await page.getByRole('button', { name: 'Apply reverse', exact: true }).click();
  await expect(page.getByTestId('toy-verdict')).toHaveAttribute('data-verdict', 'reversible');
  for (const row of await page.locator('.toy-table tbody tr').all()) {
    const cells = await row.locator('td').allTextContents();
    expect(cells[0]).toBe(cells[2]);
  }
});

test('scope: honest negative claims, theme-only persistence and real hidden panels', async ({ page }) => {
  await expect(page.locator('.scope-note')).toContainText('not a quantum circuit');
  await expect(page.locator('.scope-note')).toContainText('not an attack');
  await expect(page.locator('.scope-note')).toContainText('not a submission tool');
  await expect(page.locator('.scope-note')).toContainText('Not production crypto');
  await expect(page.locator('body')).not.toContainText('This lab is a quantum circuit');
  await expect(page.locator('body')).not.toContainText('This lab is an attack');
  await expect(page.locator('body')).not.toContainText('This lab is a submission tool');
  for (const index of [1, 2, 3]) {
    const panel = page.locator(`#act-${index}`);
    await expect(panel).toHaveAttribute('hidden', '');
    expect(await panel.evaluate(element => getComputedStyle(element).display)).toBe('none');
  }
  expect(await page.evaluate(() => Object.keys(localStorage))).toEqual(['theme']);
  expect(await page.evaluate(() => localStorage.getItem('theme'))).toBe('dark');
  await page.locator('#tab-0').focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('#tab-1')).toBeFocused();
  await expect(page.locator('#act-1')).toBeVisible();
});

test('responsive: nonblank plots, no horizontal overflow, desktop and mobile screenshots', async ({ page }, testInfo) => {
  for (const viewport of [{ width: 1440, height: 900 }, { width: 380, height: 844 }]) {
    await page.setViewportSize(viewport);
    await openAct(page, 0);
    await expectNoHorizontalOverflow(page, `ledger ${viewport.width}`);
    await page.screenshot({ path: testInfo.outputPath(`ledger-${viewport.width}.png`), fullPage: true });
    await openAct(page, 2);
    const canvas = page.getByTestId('ceiling-plot');
    await expect.poll(() => canvas.evaluate(element => {
      const canvasElement = element as HTMLCanvasElement;
      const context = canvasElement.getContext('2d')!;
      const pixels = context.getImageData(0, 0, canvasElement.width, canvasElement.height).data;
      let colored = 0;
      for (let index = 0; index < pixels.length; index += 4) if (pixels[index + 1] > 170 && pixels[index] < 100) colored += 1;
      return colored;
    })).toBeGreaterThan(50);
    await expectNoHorizontalOverflow(page, `ceiling ${viewport.width}`);
    await page.screenshot({ path: testInfo.outputPath(`ceiling-${viewport.width}.png`), fullPage: true });
    await openAct(page, 1);
    await finishDialog(page);
    await expectNoHorizontalOverflow(page, `dialog ${viewport.width}`);
    await page.screenshot({ path: testInfo.outputPath(`dialog-${viewport.width}.png`), fullPage: true });
    await openAct(page, 3);
    await expectNoHorizontalOverflow(page, `proof ${viewport.width}`);
  }
});