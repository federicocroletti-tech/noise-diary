import { expect, test } from '@playwright/test';
import { createEpisode, openLocalDiary } from './fixtures';

test.describe('Diario locale', () => {
  test.beforeEach(async ({ page }) => {
    await openLocalDiary(page);
  });

  test('mostra il diario vuoto dopo lo sblocco', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Diario', exact: true })).toBeVisible();
    await expect(page.getByText('Nessun episodio nel diario')).toBeVisible();
  });

  test('crea un episodio e lo mostra nella lista e nel dettaglio', async ({ page }) => {
    await createEpisode(page, {
      location: 'Cucina',
      room: 'Soggiorno',
      description: 'Ronzio sintetico per il test.',
    });

    const item = page.locator('.event-list li').filter({ hasText: 'Cucina' });
    await expect(item).toBeVisible();
    await item.click();
    await expect(page.getByRole('heading', { name: 'Dettaglio' })).toBeVisible();
    await expect(page.locator('.detail-panel')).toContainText('Ronzio sintetico per il test.');
  });

  test('filtra gli episodi con la ricerca', async ({ page }) => {
    await createEpisode(page, { location: 'Cucina' });
    await expect(page.locator('.event-list li')).toHaveCount(1);
    await createEpisode(page, { location: 'Camera da letto' });
    await expect(page.locator('.event-list li')).toHaveCount(2);

    await page.getByRole('searchbox', { name: 'Cerca evento' }).fill('camera');
    await expect(page.locator('.event-list li')).toHaveCount(1);
    await expect(page.locator('.event-list li')).toContainText('Camera da letto');
  });
});
