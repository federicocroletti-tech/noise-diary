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

interface VaultConfiguration {
  version: 1;
  salt: string;
  iv: string;
  verifier: string;
  iterations: number;
}

const STORAGE_KEY = 'noise-diary.vault';
const VAULT_VERIFIER = 'noise-diary-local-vault-v1';
const VAULT_VERSION = 1;
const PBKDF2_ITERATIONS = 310_000;
const PASSWORD_MIN_LENGTH = 12;

@Injectable({ providedIn: 'root' })
export class LocalVaultService {
  private key?: CryptoKey;

  isConfigured(): boolean {
    return this.readConfiguration() !== null;
  }

  async create(password: string): Promise<void> {
    if (password.length < PASSWORD_MIN_LENGTH) {
      throw new Error(`La password deve contenere almeno ${PASSWORD_MIN_LENGTH} caratteri.`);
    }
    if (this.readConfiguration()) {
      throw new Error('Il diario è già protetto. Sbloccalo con la password esistente.');
    }

    this.assertCryptoAvailable();
    const salt = globalThis.crypto.getRandomValues(new Uint8Array(16));
    const key = await this.deriveKey(password, salt);
    const encryptedVerifier = await this.encryptWithKey(
      key,
      new TextEncoder().encode(VAULT_VERIFIER),
    );
    const configuration: VaultConfiguration = {
      version: VAULT_VERSION,
      salt: this.toHex(salt),
      iv: this.toHex(new Uint8Array(encryptedVerifier.iv)),
      verifier: this.toHex(new Uint8Array(encryptedVerifier.ciphertext)),
      iterations: PBKDF2_ITERATIONS,
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(configuration));
    this.key = key;
  }

  async unlock(password: string): Promise<void> {
    const configuration = this.readConfiguration();
    if (!configuration) {
      throw new Error('Il diario non è ancora configurato con una password.');
    }

    const key = await this.deriveKey(password, this.fromHex(configuration.salt));
    let verifier: ArrayBuffer;
    try {
      verifier = await globalThis.crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: this.toArrayBuffer(this.fromHex(configuration.iv)),
        },
        key,
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
    this.key = key;
  }

  lock(): void {
    this.key = undefined;
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

  private requireKey(): CryptoKey {
    if (!this.key) {
      throw new Error('Sblocca il diario prima di leggere o modificare i dati.');
    }
    return this.key;
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
    if (
      !value ||
      typeof value !== 'object' ||
      !('version' in value) ||
      value.version !== VAULT_VERSION ||
      !('iterations' in value) ||
      value.iterations !== PBKDF2_ITERATIONS ||
      !('salt' in value) ||
      typeof value.salt !== 'string' ||
      !('iv' in value) ||
      typeof value.iv !== 'string' ||
      !('verifier' in value) ||
      typeof value.verifier !== 'string'
    ) {
      throw new Error('La configurazione del diario è incompleta o non è compatibile.');
    }
    this.fromHex(value.salt);
    this.fromHex(value.iv);
    this.fromHex(value.verifier);
    return value as VaultConfiguration;
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
}
