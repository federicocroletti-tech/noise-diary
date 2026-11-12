import { expect, test } from '@playwright/test';
import { openLocalDiary } from './fixtures';

test.describe('Intestazione', () => {
  test.beforeEach(async ({ page }) => {
    await openLocalDiary(page);
  });

  test('mostra solo le azioni principali e il titolo su una riga', async ({ page }) => {
    const header = page.locator('header.topbar');
    await expect(header.getByRole('button', { name: 'Nascondi modulo' })).toBeVisible();
    await expect(header.getByText('Backup', { exact: true })).toBeVisible();
    await expect(header.getByText('Profilo', { exact: true })).toBeVisible();
    await expect(header.getByRole('button', { name: /Elimina diario/ })).toBeHidden();
    await expect(header.getByRole('button', { name: 'Esporta backup cifrato' })).toBeHidden();

    const title = header.locator('h1');
    const lineHeight = await title.evaluate((element) =>
      parseFloat(getComputedStyle(element).lineHeight),
    );
    expect((await title.boundingBox())!.height).toBeLessThan(lineHeight * 1.5);
  });

  test('i menu si aprono, restano nello schermo e si chiudono', async ({ page }) => {
    const header = page.locator('header.topbar');
    const viewport = page.viewportSize()!;

    await header.getByText('Backup', { exact: true }).click();
    const exportButton = header.getByRole('button', { name: 'Esporta backup cifrato' });
    await expect(exportButton).toBeVisible();
    const panel = (await header.locator('details.menu[open] .menu-panel').boundingBox())!;
    expect(panel.x).toBeGreaterThanOrEqual(0);
    expect(panel.x + panel.width).toBeLessThanOrEqual(viewport.width);

    await page.keyboard.press('Escape');
    await expect(exportButton).toBeHidden();

    await header.getByText('Profilo', { exact: true }).click();
    await expect(header.getByRole('button', { name: /Elimina diario locale/ })).toBeVisible();
    await page.locator('.disclaimer').click();
    await expect(header.getByRole('button', { name: /Elimina diario locale/ })).toBeHidden();
  });

  test('il pulsante Nuovo episodio apre il modulo con il focus su Luogo', async ({ page }) => {
    await page.getByRole('button', { name: 'Nascondi modulo' }).click();
    await page.getByRole('button', { name: 'Nuovo episodio' }).click();

    await expect(page.locator('form.event-form').getByLabel('Luogo')).toBeFocused();
  });
});
