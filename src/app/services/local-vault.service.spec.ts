import { LocalVaultService } from './local-vault.service';

describe('LocalVaultService', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('encrypts local data and requires the password again after locking', async () => {
    const vault = new LocalVaultService();
    const password = 'local-test-passphrase-2026';
    const value = { description: 'private diary entry' };

    await vault.create(password);
    const encrypted = await vault.encryptJson(value);

    expect(vault.isConfigured()).toBe(true);
    expect(JSON.stringify(encrypted)).not.toContain(value.description);

    vault.lock();
    await expect(vault.decryptJson(encrypted, (item): item is typeof value => {
      return (
        item !== null &&
        typeof item === 'object' &&
        'description' in item &&
        item.description === value.description
      );
    })).rejects.toThrow('Sblocca il diario');
    await expect(vault.unlock('incorrect-passphrase')).rejects.toThrow('Password errata');

    await vault.unlock(password);
    await expect(
      vault.decryptJson(encrypted, (item): item is typeof value => {
        return (
          item !== null &&
          typeof item === 'object' &&
          'description' in item &&
          item.description === value.description
        );
      }),
    ).resolves.toEqual(value);
  });

  it('does not replace an existing password when creation is attempted again', async () => {
    const vault = new LocalVaultService();
    await vault.create('local-test-passphrase-2026');

    await expect(vault.create('another-test-passphrase')).rejects.toThrow('già protetto');
  });
});
