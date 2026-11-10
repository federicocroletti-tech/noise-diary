import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { NEON_AUTH_CLIENT, NeonAuthService } from './neon-auth.service';

const authMocks = {
  signInEmail: vi.fn(),
  signUpEmail: vi.fn(),
  resetPassword: vi.fn(),
  verifyEmail: vi.fn(),
  sendVerificationOtp: vi.fn(),
  requestPasswordReset: vi.fn(),
};

const client = {
    adapter: {
      signIn: { email: authMocks.signInEmail },
      signUp: { email: authMocks.signUpEmail },
      emailOtp: {
        resetPassword: authMocks.resetPassword,
        verifyEmail: authMocks.verifyEmail,
        sendVerificationOtp: authMocks.sendVerificationOtp,
      },
      forgetPassword: { emailOtp: authMocks.requestPasswordReset },
    },
};

describe('NeonAuthService', () => {
  const account = {
    id: 'user-123',
    email: 'federico@example.com',
    name: 'federico',
    emailVerified: true,
  };
  let service: NeonAuthService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [{ provide: NEON_AUTH_CLIENT, useValue: Promise.resolve(client) }],
    });
    service = TestBed.inject(NeonAuthService);
    vi.clearAllMocks();
    authMocks.signInEmail.mockResolvedValue({ data: { user: account }, error: null });
    authMocks.signUpEmail.mockResolvedValue({ error: null });
    authMocks.resetPassword.mockResolvedValue({ error: null });
    authMocks.verifyEmail.mockResolvedValue({ error: null });
    authMocks.sendVerificationOtp.mockResolvedValue({ error: null });
    authMocks.requestPasswordReset.mockResolvedValue({ error: null });
  });

  it('trims the email before signing in without altering the password', async () => {
    await service.signIn(`  ${account.email}  `, ' password with spaces ');
    expect(authMocks.signInEmail).toHaveBeenCalledWith({
      email: account.email,
      password: ' password with spaces ',
    });
  });

  it('trims the email before creating an account and deriving its name', async () => {
    await service.signUp(`  ${account.email}  `, 'LongPassword123');
    expect(authMocks.signUpEmail).toHaveBeenCalledWith({
      email: account.email,
      password: 'LongPassword123',
      name: account.name,
    });
  });

  it('uses the same trimmed email throughout verification and recovery', async () => {
    const email = `  ${account.email}  `;
    await service.verifyEmail(email, '123456');
    await service.sendVerificationOtp(email);
    await service.requestPasswordReset(email);
    await service.resetPassword(email, '123456', 'LongPassword123');

    expect(authMocks.verifyEmail).toHaveBeenCalledWith({ email: account.email, otp: '123456' });
    expect(authMocks.sendVerificationOtp).toHaveBeenCalledWith({
      email: account.email,
      type: 'email-verification',
    });
    expect(authMocks.requestPasswordReset).toHaveBeenCalledWith({ email: account.email });
    expect(authMocks.resetPassword).toHaveBeenCalledWith({
      email: account.email,
      otp: '123456',
      password: 'LongPassword123',
    });
  });

  it('rejects invalid emails in every email-based operation before calling the provider', async () => {
    const operations = [
      () => service.signIn('invalid', 'LongPassword123'),
      () => service.signUp('invalid', 'LongPassword123'),
      () => service.verifyEmail('invalid', '123456'),
      () => service.sendVerificationOtp('invalid'),
      () => service.requestPasswordReset('invalid'),
      () => service.resetPassword('invalid', '123456', 'LongPassword123'),
    ];
    for (const operation of operations) {
      await expect(operation()).rejects.toThrow('Inserisci un indirizzo email valido.');
    }
    for (const providerMethod of Object.values(authMocks)) {
      expect(providerMethod).not.toHaveBeenCalled();
    }
  });

  it('allows sign-in with an existing password shorter than the new-password minimum', async () => {
    await expect(service.signIn(account.email, 'Short123')).resolves.toEqual(account);
    expect(authMocks.signInEmail).toHaveBeenCalledWith({
      email: account.email,
      password: 'Short123',
    });
  });

  it('enforces the 12-character minimum when creating an account', async () => {
    await expect(service.signUp(account.email, 'Short123')).rejects.toThrow(
      'La password deve contenere almeno 12 caratteri.',
    );
    expect(authMocks.signUpEmail).not.toHaveBeenCalled();
  });

  it('enforces the 12-character minimum when resetting a password', async () => {
    await expect(service.resetPassword(account.email, '123456', 'Short123')).rejects.toThrow(
      'La password deve contenere almeno 12 caratteri.',
    );
    expect(authMocks.resetPassword).not.toHaveBeenCalled();
  });
});
