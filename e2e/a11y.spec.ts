import { expect, test } from '@playwright/test';
import { boot, driveAllStates, expectBaselineNotStale, NARROW, reportCollected, watchPageErrors } from './gate';

for (const viewport of [{ width: 1280, height: 900 }, NARROW]) {
  test(`WCAG A/AA gate at ${viewport.width}px`, async ({ page }) => {
    test.setTimeout(600000);
    const errors = watchPageErrors(page);
    await page.setViewportSize(viewport);
    await boot(page);
    await driveAllStates(page, `dark ${viewport.width}px`);
    expect(errors, errors.join('\n')).toEqual([]);
    expectBaselineNotStale();
    reportCollected();
  });
}