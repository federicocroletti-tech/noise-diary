import { expect, type Page } from '@playwright/test';

const LOCAL_PASSWORD = 'e2e-password-sintetica';

/** Blocks every Neon request so the suite never touches the real cloud backend. */
export async function isolateFromCloud(page: Page): Promise<void> {
  await page.route(/neon\.tech/, (route) => route.abort());
}

/** Opens a fresh local profile and unlocks its encrypted diary. */
export async function openLocalDiary(page: Page, profileName = 'Profilo e2e'): Promise<void> {
  await isolateFromCloud(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Apri diario salvato in questo browser' }).click();
  await page.getByLabel('Crea un nuovo profilo').fill(profileName);
  await page.getByRole('button', { name: 'Crea profilo' }).click();
  await page.getByLabel('Crea una password (almeno 12 caratteri)').fill(LOCAL_PASSWORD);
  await page.getByLabel('Conferma password').fill(LOCAL_PASSWORD);
  await page.getByRole('button', { name: 'Crea password e sblocca' }).click();
  await page.getByLabel('Ho conservato la chiave in un luogo sicuro separato').check();
  await page.getByRole('button', { name: 'Ho salvato la chiave, continua' }).click();
  await expect(page.locator('main.layout')).toBeVisible();
  await expect(page.getByText('Nessun episodio nel diario')).toBeVisible();
}

export interface EpisodeInput {
  location: string;
  room?: string;
  description?: string;
}

export async function createEpisode(page: Page, episode: EpisodeInput): Promise<void> {
  const form = page.locator('form.event-form');
  if (!(await form.isVisible())) {
    await page.getByRole('button', { name: 'Nuovo episodio' }).click();
  }
  await form.getByLabel('Luogo').fill(episode.location);
  if (episode.room) {
    await form.getByLabel('Stanza').fill(episode.room);
  }
  if (episode.description) {
    await form.getByLabel('Descrizione').fill(episode.description);
  }
  await form.getByRole('button', { name: 'Salva evento' }).click();
  await expect(page.locator('.event-list li').filter({ hasText: episode.location })).toBeVisible();
}
