import { LocalProfileService } from './local-profile.service';

describe('LocalProfileService', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('creates distinct named profiles without changing the existing local diary', () => {
    const previousVault = '{"version":2}';
    const previousEvents = '[{"id":"previous-event"}]';
    localStorage.setItem('noise-diary.vault', previousVault);
    localStorage.setItem('noise-diary.events', previousEvents);
    const profiles = new LocalProfileService();

    const first = profiles.createProfile('Anna');
    const second = profiles.createProfile('Marco');

    expect(first.id).not.toBe(second.id);
    expect(profiles.listProfiles()).toEqual([
      { id: 'legacy', name: 'Diario esistente', legacy: true },
      first,
      second,
    ]);
    expect(localStorage.getItem('noise-diary.vault')).toBe(previousVault);
    expect(localStorage.getItem('noise-diary.events')).toBe(previousEvents);
  });

  it('rejects empty, overly long, and duplicate profile names', () => {
    const profiles = new LocalProfileService();

    expect(() => profiles.createProfile('  ')).toThrow('da 1 a 40 caratteri');
    expect(() => profiles.createProfile('A'.repeat(41))).toThrow('da 1 a 40 caratteri');
    profiles.createProfile('Anna');
    expect(() => profiles.createProfile(' anna ')).toThrow('Esiste già un profilo');
  });

  it('reports corrupt profile metadata instead of silently discarding it', () => {
    localStorage.setItem('noise-diary.profiles.v1', '{invalid');
    const profiles = new LocalProfileService();

    expect(() => profiles.listProfiles()).toThrow('non è leggibile');
    expect(localStorage.getItem('noise-diary.profiles.v1')).toBe('{invalid');
  });

  it('removes only the selected profile metadata', () => {
    const profiles = new LocalProfileService();
    const first = profiles.createProfile('Anna');
    const second = profiles.createProfile('Marco');
    localStorage.setItem(`noise-diary.vault.${second.id}`, 'encrypted-vault-config');

    profiles.deleteProfile(first.id);

    expect(profiles.listProfiles()).toEqual([second]);
    expect(localStorage.getItem(`noise-diary.vault.${second.id}`)).toBe('encrypted-vault-config');
  });
});
