import { LocalVaultService } from './local-vault.service';

describe('LocalVaultService', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('encrypts local data and requires the password again after locking', async () => {
    const vault = new LocalVaultService();
    const password = 'local-test-passphrase-2026';
    const value = { description: 'private diary entry' };

    const recoveryKey = await vault.create(password);
    const encrypted = await vault.encryptJson(value);

    expect(vault.isConfigured()).toBe(true);
    expect(recoveryKey).toMatch(/^DR-(?:[A-F0-9]{8}-){7}[A-F0-9]{8}$/);
    expect(JSON.stringify(encrypted)).not.toContain(value.description);

    vault.lock();
    await expect(
      vault.decryptJson(encrypted, (item): item is typeof value => {
        return (
          item !== null &&
          typeof item === 'object' &&
          'description' in item &&
          item.description === value.description
        );
      }),
    ).rejects.toThrow('Sblocca il diario');
    await expect(vault.unlock('incorrect-passphrase')).rejects.toThrow('Password errata');

    await expect(vault.unlock(password)).resolves.toBeNull();
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

  it('keeps vault configuration and unlock keys isolated per local profile', async () => {
    const vault = new LocalVaultService();
    await vault.create('first-profile-passphrase-2026');

    const secondProfileId = 'profile-00000000-0000-4000-8000-000000000001';
    vault.useProfile(secondProfileId);
    await vault.create('second-profile-passphrase-2026');

    expect(localStorage.getItem('noise-diary.vault')).not.toBeNull();
    expect(localStorage.getItem(`noise-diary.vault.${secondProfileId}`)).not.toBeNull();
    vault.lock();
    await expect(vault.unlock('first-profile-passphrase-2026')).rejects.toThrow('Password errata');
    await expect(vault.unlock('second-profile-passphrase-2026')).resolves.toBeNull();

    vault.useProfile('legacy');
    await expect(vault.unlock('first-profile-passphrase-2026')).resolves.toBeNull();
  });

  it('deletes the local vault configuration and locks the data key', async () => {
    const vault = new LocalVaultService();
    const password = 'local-test-passphrase-2026';
    await vault.create(password);

    vault.deleteConfiguration();

    expect(vault.isConfigured()).toBe(false);
    expect(localStorage.getItem('noise-diary.vault')).toBeNull();
    await expect(vault.unlock(password)).rejects.toThrow('non è ancora configurato');
  });

  it('encrypts portable backups with the local password and rejects a wrong password', async () => {
    const vault = new LocalVaultService();
    const password = 'local-test-passphrase-2026';
    await vault.create(password);

    const encrypted = await vault.encryptBackup(
      { privateNote: 'synthetic local backup data' },
      password,
    );
    expect(encrypted).not.toContain('synthetic local backup data');
    const envelope: unknown = JSON.parse(encrypted);
    expect(vault.isEncryptedBackup(envelope)).toBe(true);
    vault.lock();

    await expect(vault.decryptBackup(envelope, 'incorrect-passphrase')).rejects.toThrow(
      'Password del backup errata',
    );
    await expect(vault.decryptBackup(envelope, password)).resolves.toEqual({
      privateNote: 'synthetic local backup data',
    });
  });

  it('recovers the data key with the recovery key and rotates it while preserving encrypted data', async () => {
    const vault = new LocalVaultService();
    const firstRecoveryKey = await vault.create('local-test-passphrase-2026');
    const encrypted = await vault.encryptJson({ description: 'preserved local data' });
    vault.lock();

    await expect(
      vault.recover(
        'DR-00000000-00000000-00000000-00000000-00000000-00000000-00000000-00000000',
        'new-test-password-2026',
      ),
    ).rejects.toThrow('Chiave di recupero errata');

    const secondRecoveryKey = await vault.recover(firstRecoveryKey, 'new-test-password-2026');
    expect(secondRecoveryKey).not.toBe(firstRecoveryKey);
    vault.commitRecoveryChange();
    await expect(vault.decryptJson(encrypted, isDescription)).resolves.toEqual({
      description: 'preserved local data',
    });

    vault.lock();
    await expect(vault.unlock('local-test-passphrase-2026')).rejects.toThrow('Password errata');
    await expect(vault.unlock('new-test-password-2026')).resolves.toBeNull();
    await expect(vault.decryptJson(encrypted, isDescription)).resolves.toEqual({
      description: 'preserved local data',
    });
    await expect(vault.recover(firstRecoveryKey, 'another-test-password-2026')).rejects.toThrow(
      'Chiave di recupero errata',
    );
  });

  it('rotates a recovery key without changing the password or encrypted data', async () => {
    const vault = new LocalVaultService();
    const password = 'local-test-passphrase-2026';
    const originalRecoveryKey = await vault.create(password);
    const encrypted = await vault.encryptJson({ description: 'rotation preserves local data' });

    const rotatedRecoveryKey = await vault.rotateRecoveryKey();
    expect(rotatedRecoveryKey).not.toBe(originalRecoveryKey);
    vault.commitRecoveryChange();
    vault.lock();

    await expect(vault.recover(originalRecoveryKey, 'new-test-password-2026')).rejects.toThrow(
      'Chiave di recupero errata',
    );
    const nextRecoveryKey = await vault.recover(rotatedRecoveryKey, 'new-test-password-2026');
    vault.commitRecoveryChange();
    await expect(vault.decryptJson(encrypted, isDescription)).resolves.toEqual({
      description: 'rotation preserves local data',
    });

    vault.lock();
    await expect(vault.unlock('new-test-password-2026')).resolves.toBeNull();
    await expect(vault.decryptJson(encrypted, isDescription)).resolves.toEqual({
      description: 'rotation preserves local data',
    });
    await expect(vault.recover(nextRecoveryKey, 'another-test-password-2026')).resolves.toMatch(
      /^DR-/,
    );
  });

  it('migrates a legacy vault only after its recovery key is acknowledged', async () => {
    const password = 'legacy-local-password-2026';
    const { config, encrypted } = await createLegacyVault(password);
    localStorage.setItem('noise-diary.vault', JSON.stringify(config));
    const vault = new LocalVaultService();

    const recoveryKey = await vault.unlock(password);
    if (!recoveryKey) {
      throw new Error('Legacy vault migration did not provide a recovery key.');
    }
    expect(recoveryKey).toMatch(/^DR-/);
    expect(vault.hasPendingRecoveryChange()).toBe(true);
    expect(JSON.parse(localStorage.getItem('noise-diary.vault') ?? '{}').version).toBe(1);
    await expect(vault.decryptJson(encrypted, isDescription)).resolves.toEqual({
      description: 'legacy encrypted data',
    });

    vault.commitRecoveryChange();
    expect(vault.hasPendingRecoveryChange()).toBe(false);
    expect(JSON.parse(localStorage.getItem('noise-diary.vault') ?? '{}').version).toBe(2);
    vault.lock();
    await expect(vault.recover(recoveryKey, 'migrated-new-password-2026')).resolves.toMatch(/^DR-/);
    vault.commitRecoveryChange();
    await expect(vault.decryptJson(encrypted, isDescription)).resolves.toEqual({
      description: 'legacy encrypted data',
    });
  });
});

function isDescription(value: unknown): value is { description: string } {
  return (
    value !== null &&
    typeof value === 'object' &&
    'description' in value &&
    typeof value.description === 'string'
  );
}

async function createLegacyVault(password: string): Promise<{
  config: Record<string, unknown>;
  encrypted: { iv: ArrayBuffer; ciphertext: ArrayBuffer };
}> {
  const salt = globalThis.crypto.getRandomValues(new Uint8Array(16));
  const material = await globalThis.crypto.subtle.importKey(
    'raw',
    toArrayBuffer(new TextEncoder().encode(password)),
    'PBKDF2',
    false,
    ['deriveKey'],
  );
  const key = await globalThis.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: toArrayBuffer(salt),
      iterations: 310_000,
      hash: 'SHA-256',
    },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const verifier = await globalThis.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: toArrayBuffer(iv) },
    key,
    toArrayBuffer(new TextEncoder().encode('noise-diary-local-vault-v1')),
  );
  const encryptedIv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const encryptedValue = await globalThis.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: toArrayBuffer(encryptedIv) },
    key,
    toArrayBuffer(
      new TextEncoder().encode(JSON.stringify({ description: 'legacy encrypted data' })),
    ),
  );
  const toHex = (bytes: Uint8Array): string =>
    Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return {
    config: {
      version: 1,
      salt: toHex(salt),
      iv: toHex(iv),
      verifier: toHex(new Uint8Array(verifier)),
      iterations: 310_000,
    },
    encrypted: {
      iv: toArrayBuffer(encryptedIv),
      ciphertext: encryptedValue,
    },
  };
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(copy).set(bytes);
  return copy;
}
