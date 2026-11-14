import { expect, test } from '@playwright/test';
import { isolateFromCloud, openLocalDiary } from './fixtures';

test('la guida è accessibile senza login anche da un collegamento diretto', async ({ page }) => {
  await isolateFromCloud(page);
  await page.goto('/#/guida');
  await expect(page.getByRole('heading', { name: 'Guida all’uso di Diario Rumore' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Accedi al tuo diario' })).toBeHidden();

  await page
    .getByRole('navigation', { name: 'Indice della guida' })
    .getByRole('link', { name: 'Backup e importazione' })
    .click();
  await expect(page).toHaveURL(/#\/guida#backup$/);
  await expect(
    page.getByRole('heading', { name: '6. Esporta un backup o importa dati' }),
  ).toBeInViewport();

  await page.reload();
  await expect(
    page.getByRole('heading', { name: '6. Esporta un backup o importa dati' }),
  ).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
    await page.evaluate(() => document.documentElement.clientWidth),
  );

  await page.locator('header.topbar').getByRole('link', { name: 'Torna all’app' }).click();
  await expect(page.getByRole('heading', { name: 'Accedi al tuo diario' })).toBeVisible();
});

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
    await expect(header.getByRole('button', { name: 'Elimina diario locale…' })).toBeVisible();
    await page.locator('.disclaimer').click();
    await expect(header.getByRole('button', { name: 'Elimina diario locale…' })).toBeHidden();
  });

  test('il pulsante Nuovo episodio apre il modulo con il focus su Luogo', async ({ page }) => {
    await page.getByRole('button', { name: 'Nascondi modulo' }).click();
    await page.getByRole('button', { name: 'Nuovo episodio' }).click();

    await expect(page.locator('form.event-form').getByLabel('Luogo')).toBeFocused();
  });

  test('la guida mantiene il modulo in compilazione e offre il modello importabile', async ({
    page,
  }) => {
    const form = page.locator('form.event-form');
    await form.getByLabel('Luogo').fill('Luogo sintetico da conservare');
    await form.getByLabel('Descrizione').fill('Appunti sintetici non ancora salvati.');
    await page.locator('header.topbar').getByRole('link', { name: 'Guida all’uso' }).click();

    await expect(
      page.getByRole('heading', { name: 'Guida all’uso di Diario Rumore' }),
    ).toBeFocused();
    await expect(page.locator('main.layout')).toBeHidden();
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('link', { name: 'Scarica il modello JSON compilabile' }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe('modello-importazione-diario.json');
    expect(await download.failure()).toBeNull();

    await page.locator('header.topbar').getByRole('link', { name: 'Torna all’app' }).click();
    await expect(form.getByLabel('Luogo')).toHaveValue('Luogo sintetico da conservare');
    await expect(form.getByLabel('Descrizione')).toHaveValue(
      'Appunti sintetici non ancora salvati.',
    );
    await form.getByRole('button', { name: 'Salva evento' }).click();
    await expect(
      page.locator('.event-list li').filter({ hasText: 'Luogo sintetico da conservare' }),
    ).toBeVisible();
  });
});
