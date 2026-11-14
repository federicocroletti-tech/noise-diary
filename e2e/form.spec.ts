import { expect, test } from '@playwright/test';
import { openLocalDiary } from './fixtures';

test.describe('Modulo episodio', () => {
  test.beforeEach(async ({ page }) => {
    await openLocalDiary(page);
  });

  test('raggruppa i campi e chiarisce luogo e stanza', async ({ page }) => {
    const form = page.locator('form.event-form');
    await expect(form.locator('fieldset')).toHaveCount(4);
    await expect(form.getByRole('group', { name: 'Quando' })).toBeVisible();
    await expect(form.getByRole('group', { name: 'Dove' })).toBeVisible();
    await expect(form.getByRole('group', { name: 'Cosa hai percepito' })).toBeVisible();
    await expect(form.getByRole('group', { name: 'Contesto' })).toBeVisible();
    await expect(form.getByLabel('Luogo')).toBeVisible();
    await expect(form.getByText('Dove hai percepito il rumore?')).toBeVisible();
    await expect(form.getByLabel('Stanza (se applicabile)')).toBeVisible();
    await expect(
      form.getByText('La stanza in cui ti trovavi, se vuoi specificarla.'),
    ).toBeVisible();
    await expect(form.getByLabel('Data e ora di inizio')).toHaveAttribute('required', '');
    await expect(form.getByText('Campo obbligatorio')).toBeVisible();
  });

  test('seleziona finestra e porta e salva la descrizione scelta', async ({ page }) => {
    const form = page.locator('form.event-form');
    await form.getByLabel('Luogo').fill('Cucina');
    await form.getByRole('combobox', { name: 'Finestra', exact: true }).selectOption('Aperta');
    await form.getByRole('combobox', { name: 'Porta', exact: true }).selectOption('Socchiusa');
    await form.getByRole('button', { name: 'Salva evento' }).click();

    const episode = page.locator('.event-list li').filter({ hasText: 'Cucina' });
    await expect(episode).toBeVisible();
    await episode.click();
    const detail = page.locator('.detail-panel');
    await expect(detail).toContainText('Aperta');
    await expect(detail).toContainText('Socchiusa');
  });

  test('il pulsante di salvataggio ha dimensioni piene ed è separato dai campi', async ({
    page,
  }) => {
    const actions = page.locator('form.event-form .form-actions');
    const save = actions.getByRole('button', { name: 'Salva evento' });
    const style = await save.evaluate((element) => {
      const computed = getComputedStyle(element);
      return { fontSize: parseFloat(computed.fontSize), height: element.getBoundingClientRect().height };
    });
    expect(style.fontSize).toBeGreaterThanOrEqual(15);
    expect(style.height).toBeGreaterThanOrEqual(44);
    expect(await actions.evaluate((element) => getComputedStyle(element).borderTopStyle)).toBe(
      'solid',
    );
  });
});
