import { Injectable } from '@angular/core';

export interface EncryptedPayload {
  iv: ArrayBuffer;
  ciphertext: ArrayBuffer;
}

export function isArrayBuffer(value: unknown): value is ArrayBuffer {
  return (
    value !== null &&
    typeof value === 'object' &&
    Object.prototype.toString.call(value) === '[object ArrayBuffer]'
  );
}

interface LegacyVaultConfiguration {
  version: 1;
  salt: string;
  iv: string;
  verifier: string;
  iterations: number;
}

interface RecoverableVaultConfiguration {
  version: 2;
  salt: string;
  iterations: number;
  passwordIv: string;
  passwordWrappedKey: string;
  recoverySalt: string;
  recoveryIv: string;
  recoveryWrappedKey: string;
}

type VaultConfiguration = LegacyVaultConfiguration | RecoverableVaultConfiguration;

interface EncryptedBackupEnvelope {
  format: 'noise-diary-encrypted-backup';
  version: 1;
  salt: string;
  iterations: number;
  iv: string;
  ciphertext: string;
}

interface WrappedDataKey {
  iv: Uint8Array;
  ciphertext: Uint8Array;
}

const STORAGE_KEY = 'noise-diary.vault';
const VAULT_VERIFIER = 'noise-diary-local-vault-v1';
const LEGACY_VAULT_VERSION = 1;
const VAULT_VERSION = 2;
const PBKDF2_ITERATIONS = 310_000;
const PASSWORD_MIN_LENGTH = 12;
const DATA_KEY_BYTES = 32;

@Injectable({ providedIn: 'root' })
export class LocalVaultService {
  private key?: CryptoKey;
  private dataKeyBytes?: Uint8Array;
  private pendingRecoveryConfiguration?: RecoverableVaultConfiguration;

  isConfigured(): boolean {
    return this.readConfiguration() !== null;
  }

  async create(password: string): Promise<string> {
    this.validatePassword(password);
    if (this.readConfiguration()) {
      throw new Error('Il diario è già protetto. Sbloccalo con la password esistente.');
    }

    this.assertCryptoAvailable();
    const dataKeyBytes = globalThis.crypto.getRandomValues(new Uint8Array(DATA_KEY_BYTES));
    const recoveryKey = this.generateRecoveryKey();
    const configuration = await this.createConfiguration(password, dataKeyBytes, recoveryKey);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(configuration));
    await this.setDataKey(dataKeyBytes);
    return recoveryKey;
  }

  async unlock(password: string): Promise<string | null> {
    const configuration = this.readConfiguration();
    if (!configuration) {
      throw new Error('Il diario non è ancora configurato con una password.');
    }

    if (configuration.version === LEGACY_VAULT_VERSION) {
      const legacyKey = await this.deriveKey(password, this.fromHex(configuration.salt));
      let verifier: ArrayBuffer;
      try {
        verifier = await globalThis.crypto.subtle.decrypt(
          {
            name: 'AES-GCM',
            iv: this.toArrayBuffer(this.fromHex(configuration.iv)),
          },
          legacyKey,
          this.toArrayBuffer(this.fromHex(configuration.verifier)),
        );
      } catch (error) {
        if (error instanceof Error && error.name === 'OperationError') {
          throw new Error('Password errata. I dati non sono stati modificati.');
        }
        throw error;
      }

      if (new TextDecoder().decode(verifier) !== VAULT_VERIFIER) {
        throw new Error('Password non valida o configurazione del diario danneggiata.');
      }

      const dataKeyBytes = await this.deriveKeyBytes(
        password,
        this.fromHex(configuration.salt),
      );
      const recoveryKey = this.generateRecoveryKey();
      this.pendingRecoveryConfiguration = await this.createConfiguration(
        password,
        dataKeyBytes,
        recoveryKey,
      );
      await this.setDataKey(dataKeyBytes);
      return recoveryKey;
    }

    const dataKeyBytes = await this.unwrapDataKey(
      password,
      this.fromHex(configuration.salt),
      this.fromHex(configuration.passwordIv),
      this.fromHex(configuration.passwordWrappedKey),
      'Password errata. I dati non sono stati modificati.',
    );
    await this.setDataKey(dataKeyBytes);
    return null;
  }

  async recover(recoveryKey: string, newPassword: string): Promise<string> {
    this.validatePassword(newPassword);
    const configuration = this.readConfiguration();
    if (!configuration || configuration.version !== VAULT_VERSION) {
      throw new Error('Questa configurazione non supporta il recupero del diario.');
    }

    const normalizedRecoveryKey = this.normalizeRecoveryKey(recoveryKey);
    const dataKeyBytes = await this.unwrapDataKey(
      normalizedRecoveryKey,
      this.fromHex(configuration.recoverySalt),
      this.fromHex(configuration.recoveryIv),
      this.fromHex(configuration.recoveryWrappedKey),
      'Chiave di recupero errata. I dati non sono stati modificati.',
    );
    const nextRecoveryKey = this.generateRecoveryKey();
    const nextConfiguration = await this.createConfiguration(
      newPassword,
      dataKeyBytes,
      nextRecoveryKey,
    );

    this.pendingRecoveryConfiguration = nextConfiguration;
    await this.setDataKey(dataKeyBytes);
    return nextRecoveryKey;
  }

  async rotateRecoveryKey(): Promise<string> {
    const configuration = this.readConfiguration();
    const dataKeyBytes = this.dataKeyBytes;
    if (
      !this.key ||
      !dataKeyBytes ||
      !configuration ||
      configuration.version !== VAULT_VERSION
    ) {
      throw new Error('Sblocca il diario prima di rigenerare la chiave di recupero.');
    }

    const recoveryKey = this.generateRecoveryKey();
    const recoverySalt = globalThis.crypto.getRandomValues(new Uint8Array(16));
    const recoveryWrappingKey = await this.deriveKey(
      this.normalizeRecoveryKey(recoveryKey),
      recoverySalt,
    );
    const wrappedDataKey = await this.encryptWithKey(recoveryWrappingKey, dataKeyBytes);
    this.pendingRecoveryConfiguration = {
      ...configuration,
      recoverySalt: this.toHex(recoverySalt),
      recoveryIv: this.toHex(new Uint8Array(wrappedDataKey.iv)),
      recoveryWrappedKey: this.toHex(new Uint8Array(wrappedDataKey.ciphertext)),
    };
    return recoveryKey;
  }

  hasPendingRecoveryChange(): boolean {
    return this.pendingRecoveryConfiguration !== undefined;
  }

  commitRecoveryChange(): void {
    if (!this.pendingRecoveryConfiguration) {
      return;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.pendingRecoveryConfiguration));
    this.pendingRecoveryConfiguration = undefined;
  }

  async verifyPassword(password: string): Promise<void> {
    const configuration = this.readConfiguration();
    if (!configuration) {
      throw new Error('Il diario non è ancora configurato con una password.');
    }
    if (configuration.version === LEGACY_VAULT_VERSION) {
      const key = await this.deriveKey(password, this.fromHex(configuration.salt));
      try {
        const verifier = await globalThis.crypto.subtle.decrypt(
          {
            name: 'AES-GCM',
            iv: this.toArrayBuffer(this.fromHex(configuration.iv)),
          },
          key,
          this.toArrayBuffer(this.fromHex(configuration.verifier)),
        );
        if (new TextDecoder().decode(verifier) === VAULT_VERIFIER) {
          return;
        }
      } catch (error) {
        if (!(error instanceof Error && error.name === 'OperationError')) {
          throw error;
        }
      }
      throw new Error('Password errata.');
    }

    const dataKeyBytes = await this.unwrapDataKey(
      password,
      this.fromHex(configuration.salt),
      this.fromHex(configuration.passwordIv),
      this.fromHex(configuration.passwordWrappedKey),
      'Password errata.',
    );
    dataKeyBytes.fill(0);
  }

  lock(): void {
    this.key = undefined;
    this.dataKeyBytes?.fill(0);
    this.dataKeyBytes = undefined;
    this.pendingRecoveryConfiguration = undefined;
  }

  deleteConfiguration(): void {
    localStorage.removeItem(STORAGE_KEY);
    this.lock();
  }

  async encryptJson(value: unknown): Promise<EncryptedPayload> {
    const serialized = JSON.stringify(value);
    if (serialized === undefined) {
      throw new Error('I dati del diario non possono essere serializzati.');
    }
    return this.encryptBytes(new TextEncoder().encode(serialized));
  }

  async decryptJson<T>(
    payload: EncryptedPayload,
    isExpectedType: (value: unknown) => value is T,
  ): Promise<T> {
    const serialized = new TextDecoder().decode(await this.decryptBytes(payload));
    let value: unknown;
    try {
      value = JSON.parse(serialized);
    } catch (error) {
      throw new Error(`I dati cifrati non contengono JSON valido: ${String(error)}`);
    }
    if (!isExpectedType(value)) {
      throw new Error('I dati cifrati non rispettano il formato previsto.');
    }
    return value;
  }

  async encryptBackup(value: unknown, password: string): Promise<string> {
    await this.verifyPassword(password);
    const salt = globalThis.crypto.getRandomValues(new Uint8Array(16));
    const backupKey = await this.deriveKey(password, salt);
    const serialized = JSON.stringify(value);
    if (serialized === undefined) {
      throw new Error('I dati del diario non possono essere serializzati.');
    }
    const encrypted = await this.encryptWithKey(backupKey, new TextEncoder().encode(serialized));
    const envelope: EncryptedBackupEnvelope = {
      format: 'noise-diary-encrypted-backup',
      version: 1,
      salt: this.toHex(salt),
      iterations: PBKDF2_ITERATIONS,
      iv: this.toBase64(new Uint8Array(encrypted.iv)),
      ciphertext: this.toBase64(new Uint8Array(encrypted.ciphertext)),
    };
    return JSON.stringify(envelope);
  }

  isEncryptedBackup(value: unknown): value is EncryptedBackupEnvelope {
    if (value === null || typeof value !== 'object') {
      return false;
    }
    const envelope = value as Record<string, unknown>;
    return (
      envelope['format'] === 'noise-diary-encrypted-backup' &&
      envelope['version'] === 1 &&
      typeof envelope['salt'] === 'string' &&
      /^[a-f0-9]{32}$/i.test(envelope['salt']) &&
      envelope['iterations'] === PBKDF2_ITERATIONS &&
      typeof envelope['iv'] === 'string' &&
      typeof envelope['ciphertext'] === 'string'
    );
  }

  async decryptBackup(value: unknown, password: string): Promise<unknown> {
    if (!this.isEncryptedBackup(value)) {
      throw new Error('Il file non è un backup cifrato Diario Rumore compatibile.');
    }
    const iv = this.fromBase64(value.iv);
    const ciphertext = this.fromBase64(value.ciphertext);
    if (iv.byteLength !== 12 || ciphertext.byteLength < 16) {
      throw new Error('Il backup cifrato è incompleto o non valido.');
    }

    const key = await this.deriveKey(password, this.fromHex(value.salt));
    let plaintext: ArrayBuffer;
    try {
      plaintext = await globalThis.crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: this.toArrayBuffer(iv) },
        key,
        this.toArrayBuffer(ciphertext),
      );
    } catch (error) {
      if (error instanceof Error && error.name === 'OperationError') {
        throw new Error('Password del backup errata o file danneggiato. Nessun dato è stato modificato.');
      }
      throw error;
    }

    try {
      return JSON.parse(new TextDecoder().decode(plaintext)) as unknown;
    } catch (error) {
      throw new Error(`Il contenuto del backup non è JSON valido: ${String(error)}`);
    }
  }

  async encryptBytes(value: Uint8Array): Promise<EncryptedPayload> {
    this.assertCryptoAvailable();
    const key = this.requireKey();
    const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
    const ciphertext = await globalThis.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: this.toArrayBuffer(iv) },
      key,
      this.toArrayBuffer(value),
    );
    return { iv: this.toArrayBuffer(iv), ciphertext };
  }

  async decryptBytes(payload: EncryptedPayload): Promise<ArrayBuffer> {
    return globalThis.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: payload.iv },
      this.requireKey(),
      payload.ciphertext,
    );
  }

  private async createConfiguration(
    password: string,
    dataKeyBytes: Uint8Array,
    recoveryKey: string,
  ): Promise<RecoverableVaultConfiguration> {
    const passwordSalt = globalThis.crypto.getRandomValues(new Uint8Array(16));
    const recoverySalt = globalThis.crypto.getRandomValues(new Uint8Array(16));
    const [passwordKey, recoveryWrappingKey] = await Promise.all([
      this.deriveKey(password, passwordSalt),
      this.deriveKey(this.normalizeRecoveryKey(recoveryKey), recoverySalt),
    ]);
    const [passwordWrapper, recoveryWrapper] = await Promise.all([
      this.encryptWithKey(passwordKey, dataKeyBytes),
      this.encryptWithKey(recoveryWrappingKey, dataKeyBytes),
    ]);
    return {
      version: VAULT_VERSION,
      salt: this.toHex(passwordSalt),
      iterations: PBKDF2_ITERATIONS,
      passwordIv: this.toHex(new Uint8Array(passwordWrapper.iv)),
      passwordWrappedKey: this.toHex(new Uint8Array(passwordWrapper.ciphertext)),
      recoverySalt: this.toHex(recoverySalt),
      recoveryIv: this.toHex(new Uint8Array(recoveryWrapper.iv)),
      recoveryWrappedKey: this.toHex(new Uint8Array(recoveryWrapper.ciphertext)),
    };
  }

  private async unwrapDataKey(
    secret: string,
    salt: Uint8Array,
    iv: Uint8Array,
    ciphertext: Uint8Array,
    failureMessage: string,
  ): Promise<Uint8Array> {
    const wrappingKey = await this.deriveKey(secret, salt);
    let rawKey: ArrayBuffer;
    try {
      rawKey = await globalThis.crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: this.toArrayBuffer(iv) },
        wrappingKey,
        this.toArrayBuffer(ciphertext),
      );
    } catch (error) {
      if (error instanceof Error && error.name === 'OperationError') {
        throw new Error(failureMessage);
      }
      throw error;
    }
    if (rawKey.byteLength !== DATA_KEY_BYTES) {
      throw new Error('La chiave cifrata del diario non è valida.');
    }
    return new Uint8Array(rawKey);
  }

  private async deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
    this.assertCryptoAvailable();
    const material = await globalThis.crypto.subtle.importKey(
      'raw',
      this.toArrayBuffer(new TextEncoder().encode(password)),
      'PBKDF2',
      false,
      ['deriveKey'],
    );
    return globalThis.crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: this.toArrayBuffer(salt),
        iterations: PBKDF2_ITERATIONS,
        hash: 'SHA-256',
      },
      material,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt'],
    );
  }

  private async deriveKeyBytes(password: string, salt: Uint8Array): Promise<Uint8Array> {
    const material = await globalThis.crypto.subtle.importKey(
      'raw',
      this.toArrayBuffer(new TextEncoder().encode(password)),
      'PBKDF2',
      false,
      ['deriveBits'],
    );
    const bytes = await globalThis.crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: this.toArrayBuffer(salt),
        iterations: PBKDF2_ITERATIONS,
        hash: 'SHA-256',
      },
      material,
      DATA_KEY_BYTES * 8,
    );
    return new Uint8Array(bytes);
  }

  private async encryptWithKey(key: CryptoKey, value: Uint8Array): Promise<EncryptedPayload> {
    this.assertCryptoAvailable();
    const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
    const ciphertext = await globalThis.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: this.toArrayBuffer(iv) },
      key,
      this.toArrayBuffer(value),
    );
    return { iv: this.toArrayBuffer(iv), ciphertext };
  }

  private importDataKey(bytes: Uint8Array): Promise<CryptoKey> {
    return globalThis.crypto.subtle.importKey(
      'raw',
      this.toArrayBuffer(bytes),
      { name: 'AES-GCM' },
      false,
      ['encrypt', 'decrypt'],
    );
  }

  private async setDataKey(bytes: Uint8Array): Promise<void> {
    this.dataKeyBytes?.fill(0);
    this.dataKeyBytes = bytes.slice();
    this.key = await this.importDataKey(bytes);
  }

  private requireKey(): CryptoKey {
    if (!this.key) {
      throw new Error('Sblocca il diario prima di leggere o modificare i dati.');
    }
    return this.key;
  }

  private generateRecoveryKey(): string {
    const bytes = globalThis.crypto.getRandomValues(new Uint8Array(DATA_KEY_BYTES));
    const hex = this.toHex(bytes).toUpperCase();
    return `DR-${hex.match(/.{1,8}/g)?.join('-') ?? hex}`;
  }

  private normalizeRecoveryKey(value: string): string {
    const normalized = value.trim().replace(/^DR-/i, '').replace(/[^a-f0-9]/gi, '').toLowerCase();
    if (!/^[a-f0-9]{64}$/.test(normalized)) {
      throw new Error('La chiave di recupero non ha il formato previsto.');
    }
    return normalized;
  }

  private validatePassword(password: string): void {
    if (password.length < PASSWORD_MIN_LENGTH) {
      throw new Error(`La password deve contenere almeno ${PASSWORD_MIN_LENGTH} caratteri.`);
    }
  }

  private assertCryptoAvailable(): void {
    if (!globalThis.crypto?.subtle || !globalThis.crypto.getRandomValues) {
      throw new Error('Questo browser non supporta la cifratura richiesta per proteggere il diario.');
    }
  }

  private readConfiguration(): VaultConfiguration | null {
    const serialized = localStorage.getItem(STORAGE_KEY);
    if (!serialized) {
      return null;
    }

    let value: unknown;
    try {
      value = JSON.parse(serialized);
    } catch (error) {
      throw new Error(`La configurazione del diario non è leggibile: ${String(error)}`);
    }
    if (value === null || typeof value !== 'object' || !('version' in value)) {
      throw new Error('La configurazione del diario è incompleta o non è compatibile.');
    }

    const candidate = value as Record<string, unknown>;
    if (
      candidate['version'] === LEGACY_VAULT_VERSION &&
      candidate['iterations'] === PBKDF2_ITERATIONS &&
      typeof candidate['salt'] === 'string' &&
      /^[a-f0-9]{32}$/i.test(candidate['salt']) &&
      typeof candidate['iv'] === 'string' &&
      /^[a-f0-9]{24}$/i.test(candidate['iv']) &&
      typeof candidate['verifier'] === 'string' &&
      /^(?:[a-f0-9]{2}){16,128}$/i.test(candidate['verifier'])
    ) {
      return candidate as unknown as LegacyVaultConfiguration;
    }
    if (
      candidate['version'] === VAULT_VERSION &&
      candidate['iterations'] === PBKDF2_ITERATIONS &&
      typeof candidate['salt'] === 'string' &&
      /^[a-f0-9]{32}$/i.test(candidate['salt']) &&
      typeof candidate['passwordIv'] === 'string' &&
      /^[a-f0-9]{24}$/i.test(candidate['passwordIv']) &&
      typeof candidate['passwordWrappedKey'] === 'string' &&
      /^[a-f0-9]{96}$/i.test(candidate['passwordWrappedKey']) &&
      typeof candidate['recoverySalt'] === 'string' &&
      /^[a-f0-9]{32}$/i.test(candidate['recoverySalt']) &&
      typeof candidate['recoveryIv'] === 'string' &&
      /^[a-f0-9]{24}$/i.test(candidate['recoveryIv']) &&
      typeof candidate['recoveryWrappedKey'] === 'string' &&
      /^[a-f0-9]{96}$/i.test(candidate['recoveryWrappedKey'])
    ) {
      return candidate as unknown as RecoverableVaultConfiguration;
    }
    throw new Error('La configurazione del diario è incompleta o non è compatibile.');
  }

  private toHex(bytes: Uint8Array): string {
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  }

  private fromHex(value: string): Uint8Array {
    if (value.length % 2 !== 0 || !/^[0-9a-f]*$/i.test(value)) {
      throw new Error('La configurazione cifrata del diario contiene dati non validi.');
    }
    const bytes = new Uint8Array(value.length / 2);
    for (let index = 0; index < value.length; index += 2) {
      bytes[index / 2] = Number.parseInt(value.slice(index, index + 2), 16);
    }
    return bytes;
  }

  private toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
    const copy = new ArrayBuffer(bytes.byteLength);
    new Uint8Array(copy).set(bytes);
    return copy;
  }

  private toBase64(bytes: Uint8Array): string {
    let binary = '';
    const chunkSize = 0x8000;
    for (let offset = 0; offset < bytes.length; offset += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
    }
    return btoa(binary);
  }

  private fromBase64(value: string): Uint8Array {
    if (
      value.length % 4 !== 0 ||
      !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)
    ) {
      throw new Error('Il backup contiene dati cifrati non validi.');
    }
    const binary = atob(value);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    return bytes;
  }
}
