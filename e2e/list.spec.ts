import { expect, test } from '@playwright/test';
import { createEpisode, openLocalDiary } from './fixtures';

test.describe('Lista episodi', () => {
  test.beforeEach(async ({ page }) => {
    await openLocalDiary(page);
  });

  test('il diario vuoto offre di creare il primo episodio e sposta il focus sul modulo', async ({
    page,
  }) => {
    await page.getByRole('button', { name: 'Nascondi modulo' }).click();
    await expect(page.locator('form.event-form')).toHaveCount(0);

    await page.getByRole('button', { name: 'Crea il primo episodio' }).click();

    await expect(page.locator('form.event-form').getByLabel('Luogo')).toBeFocused();
  });

  test('i filtri sono leggibili e non troncati', async ({ page }) => {
    await createEpisode(page, { location: 'Cucina' });

    const search = page.getByRole('searchbox', { name: 'Cerca evento' });
    const sort = page.getByRole('combobox', { name: 'Ordina episodi' });
    expect((await search.boundingBox())!.width).toBeGreaterThanOrEqual(180);
    const sortFits = await sort.evaluate((element) => {
      const select = element as HTMLSelectElement;
      const probe = document.createElement('span');
      probe.style.font = getComputedStyle(select).font;
      probe.style.position = 'absolute';
      probe.textContent = select.selectedOptions[0].text;
      document.body.append(probe);
      const fits = probe.offsetWidth + 40 <= select.clientWidth;
      probe.remove();
      return fits;
    });
    expect(sortFits).toBe(true);
  });

  test('una ricerca senza risultati si può annullare', async ({ page }) => {
    await createEpisode(page, { location: 'Cucina' });

    await page.getByRole('searchbox', { name: 'Cerca evento' }).fill('garage');
    await expect(page.getByText('Nessun episodio corrisponde a “garage”')).toBeVisible();
    await expect(page.getByText('Nessun episodio nel diario')).toHaveCount(0);

    await page.getByRole('button', { name: 'Cancella ricerca' }).click();
    await expect(page.locator('.event-list li')).toHaveCount(1);
  });
});
