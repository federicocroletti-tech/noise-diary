import { expect, test } from '@playwright/test';
import { openLocalDiary } from './fixtures';

test.describe('Layout e stili di base', () => {
  test('la pagina non ha bordi chiari e usa controlli nativi scuri', async ({ page }) => {
    await openLocalDiary(page);

    const page_ = await page.evaluate(() => {
      const body = getComputedStyle(document.body);
      const html = getComputedStyle(document.documentElement);
      return {
        bodyMargin: body.margin,
        colorScheme: html.colorScheme,
        htmlBackground: html.backgroundColor,
      };
    });

    expect(page_.bodyMargin).toBe('0px');
    expect(page_.colorScheme).toBe('dark');
    expect(page_.htmlBackground).not.toBe('rgb(255, 255, 255)');
  });

  test('i campi mostrano un indicatore di focus da tastiera', async ({ page }) => {
    await openLocalDiary(page);

    const location = page.locator('form.event-form').getByLabel('Luogo');
    await location.focus();
    await page.keyboard.press('Shift+Tab');
    await page.keyboard.press('Tab');

    await expect(location).toBeFocused();
    const boxShadow = await location.evaluate((element) => getComputedStyle(element).boxShadow);
    expect(boxShadow).not.toBe('none');
  });
});
