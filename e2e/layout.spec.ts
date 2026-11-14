import { expect, test } from '@playwright/test';
import { createEpisode, openLocalDiary } from './fixtures';

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

  test('i pannelli occupano tutta la larghezza senza colonne vuote', async ({ page }) => {
    await openLocalDiary(page);
    const workspace = page.locator('.workspace');
    const gapToRightEdge = async () => {
      const workspaceBox = (await workspace.boundingBox())!;
      const lastPanel = (await workspace.locator(':scope > .panel').last().boundingBox())!;
      return Math.abs(lastPanel.x + lastPanel.width - (workspaceBox.x + workspaceBox.width));
    };

    expect(await gapToRightEdge()).toBeLessThan(2);

    await createEpisode(page, { location: 'Cucina' });
    await page.locator('.event-list li').first().click();
    await expect(page.locator('.detail-panel')).toBeVisible();
    expect(await gapToRightEdge()).toBeLessThan(2);
  });

  test('il pannello lista non si allunga oltre il suo contenuto', async ({ page }) => {
    await openLocalDiary(page);
    const listBox = (await page.locator('.list-panel').boundingBox())!;
    expect(listBox.height).toBeLessThan(300);
  });

  test('il riepilogo è una griglia compatta di quattro indicatori', async ({ page }) => {
    await openLocalDiary(page);
    const overview = page.locator('.overview');
    await expect(overview).not.toHaveClass(/panel/);
    const cards = overview.locator('.stat-card');
    await expect(cards).toHaveCount(4);
    await expect(cards.nth(3)).toContainText('Intensità media');
    await expect(cards.nth(3)).toContainText('Non disponibile');

    const tops = new Set(
      await cards.evaluateAll((elements) =>
        elements.map((element) => Math.round(element.getBoundingClientRect().top)),
      ),
    );
    const isMobile = page.viewportSize()!.width < 640;
    expect(tops.size).toBe(isMobile ? 2 : 1);
    expect((await overview.boundingBox())!.height).toBeLessThan(isMobile ? 220 : 120);
  });
});
