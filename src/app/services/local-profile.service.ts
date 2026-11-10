import { Injectable } from '@angular/core';

export interface LocalDiaryProfile {
  id: string;
  name: string;
  legacy: boolean;
}

export const LEGACY_PROFILE_ID = 'legacy';
const PROFILES_STORAGE_KEY = 'noise-diary.profiles.v1';
const LEGACY_VAULT_STORAGE_KEY = 'noise-diary.vault';
const PROFILE_ID_PATTERN = /^profile-[a-f0-9-]{36}$/;
const PROFILE_NAME_MAX_LENGTH = 40;

export function vaultStorageKeyForProfile(profileId: string): string {
  return profileId === LEGACY_PROFILE_ID
    ? LEGACY_VAULT_STORAGE_KEY
    : `${LEGACY_VAULT_STORAGE_KEY}.${profileId}`;
}

export function databaseNameForProfile(profileId: string): string {
  return profileId === LEGACY_PROFILE_ID ? 'noise-diary' : `noise-diary.${profileId}`;
}

@Injectable({ providedIn: 'root' })
export class LocalProfileService {
  listProfiles(): LocalDiaryProfile[] {
    const storedProfiles = this.readStoredProfiles();
    const profiles = storedProfiles.map(({ id, name }) => ({ id, name, legacy: false }));
    if (localStorage.getItem(LEGACY_VAULT_STORAGE_KEY) !== null) {
      profiles.unshift({ id: LEGACY_PROFILE_ID, name: 'Diario esistente', legacy: true });
    }
    return profiles;
  }

  createProfile(name: string): LocalDiaryProfile {
    const normalizedName = name.trim();
    if (!normalizedName || normalizedName.length > PROFILE_NAME_MAX_LENGTH) {
      throw new Error(
        `Il nome del profilo deve contenere da 1 a ${PROFILE_NAME_MAX_LENGTH} caratteri.`,
      );
    }

    const profiles = this.readStoredProfiles();
    if (
      localStorage.getItem(LEGACY_VAULT_STORAGE_KEY) !== null &&
      normalizedName.localeCompare('Diario esistente', undefined, { sensitivity: 'accent' }) === 0
    ) {
      throw new Error('Esiste già un profilo con questo nome.');
    }
    if (
      profiles.some(
        (profile) =>
          profile.name.localeCompare(normalizedName, undefined, {
            sensitivity: 'accent',
          }) === 0,
      )
    ) {
      throw new Error('Esiste già un profilo con questo nome.');
    }

    const profile: LocalDiaryProfile = {
      id: `profile-${crypto.randomUUID()}`,
      name: normalizedName,
      legacy: false,
    };
    profiles.push({ id: profile.id, name: profile.name });
    localStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(profiles));
    return profile;
  }

  deleteProfile(profileId: string): void {
    if (profileId === LEGACY_PROFILE_ID) {
      throw new Error(
        'Il profilo del diario esistente non può essere rimosso da questa operazione.',
      );
    }
    const profiles = this.readStoredProfiles();
    const remainingProfiles = profiles.filter((profile) => profile.id !== profileId);
    if (remainingProfiles.length === profiles.length) {
      throw new Error('Il profilo locale selezionato non esiste.');
    }
    localStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(remainingProfiles));
  }

  private readStoredProfiles(): Array<{ id: string; name: string }> {
    const serialized = localStorage.getItem(PROFILES_STORAGE_KEY);
    if (serialized === null) {
      return [];
    }

    let value: unknown;
    try {
      value = JSON.parse(serialized);
    } catch (error) {
      throw new Error(
        `L’elenco dei profili locali non è leggibile; i dati non sono stati modificati. Dettaglio: ${String(error)}`,
      );
    }
    if (!Array.isArray(value)) {
      throw new Error(
        'L’elenco dei profili locali non è valido; i dati non sono stati modificati.',
      );
    }

    const profiles: Array<{ id: string; name: string }> = [];
    for (const candidate of value) {
      if (
        candidate === null ||
        typeof candidate !== 'object' ||
        !('id' in candidate) ||
        typeof candidate.id !== 'string' ||
        !PROFILE_ID_PATTERN.test(candidate.id) ||
        !('name' in candidate) ||
        typeof candidate.name !== 'string' ||
        !candidate.name.trim() ||
        candidate.name.length > PROFILE_NAME_MAX_LENGTH
      ) {
        throw new Error(
          'Un profilo locale salvato non è valido; i dati non sono stati modificati.',
        );
      }
      if (profiles.some((profile) => profile.id === candidate.id)) {
        throw new Error(
          'L’elenco contiene ID profilo duplicati; i dati non sono stati modificati.',
        );
      }
      if (
        profiles.some(
          (profile) =>
            profile.name.localeCompare(candidate.name, undefined, { sensitivity: 'accent' }) === 0,
        )
      ) {
        throw new Error(
          'L’elenco contiene nomi profilo duplicati; i dati non sono stati modificati.',
        );
      }
      profiles.push({ id: candidate.id, name: candidate.name });
    }
    return profiles;
  }
}
