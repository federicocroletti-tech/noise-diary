import { inject, Injectable, InjectionToken } from '@angular/core';

export const NEON_AUTH_CLIENT = new InjectionToken<
  Promise<typeof import('./neon-client')['neonAuth']>
>('NEON_AUTH_CLIENT', {
  providedIn: 'root',
  factory: () => import('./neon-client').then(({ neonAuth }) => neonAuth),
});

export interface AccountUser {
  id: string;
  email: string;
  name: string;
  emailVerified: boolean;
}

interface EmailOtpClientExtensions {
  emailOtp: {
    sendVerificationOtp(input: {
      email: string;
      type: 'email-verification';
    }): Promise<{ error?: { message?: string } | null }>;
    verifyEmail(input: {
      email: string;
      otp: string;
    }): Promise<{ error?: { message?: string } | null }>;
    resetPassword(input: {
      email: string;
      otp: string;
      password: string;
    }): Promise<{ error?: { message?: string } | null }>;
  };
  forgetPassword: {
    emailOtp(input: { email: string }): Promise<{ error?: { message?: string } | null }>;
  };
}

function isAccountUser(value: unknown): value is AccountUser {
  return (
    value !== null &&
    typeof value === 'object' &&
    'id' in value &&
    typeof value.id === 'string' &&
    'email' in value &&
    typeof value.email === 'string' &&
    'name' in value &&
    typeof value.name === 'string' &&
    'emailVerified' in value &&
    typeof value.emailVerified === 'boolean'
  );
}

@Injectable({ providedIn: 'root' })
export class NeonAuthService {
  private readonly client = inject(NEON_AUTH_CLIENT);

  async getCurrentUser(): Promise<AccountUser | null> {
    const auth = await this.authClient();
    const { data, error } = await auth.getSession();
    if (error) {
      throw new Error(error.message);
    }
    if (!data || !isAccountUser(data.user)) {
      return null;
    }
    return data.user;
  }

  async signUp(email: string, password: string): Promise<void> {
    email = this.normalizeEmail(email);
    this.validateNewPassword(password);
    const name = email.slice(0, email.lastIndexOf('@'));
    const auth = await this.authClient();
    const { error } = await auth.signUp.email({ email, password, name });
    if (error) {
      throw new Error(error.message);
    }
  }

  async signIn(email: string, password: string): Promise<AccountUser> {
    email = this.normalizeEmail(email);
    if (password.length === 0) {
      throw new Error('Inserisci la password.');
    }
    const auth = await this.authClient();
    const { data, error } = await auth.signIn.email({ email, password });
    if (error) {
      throw new Error(error.message);
    }
    if (!data || !isAccountUser(data.user)) {
      throw new Error('Accesso non riuscito: il servizio non ha restituito un account.');
    }
    return data.user;
  }

  async signOut(): Promise<void> {
    const auth = await this.authClient();
    const { error } = await auth.signOut();
    if (error) {
      throw new Error(error.message);
    }
  }

  async verifyEmail(email: string, otp: string): Promise<void> {
    email = this.normalizeEmail(email);
    const auth = await this.otpAuthClient();
    const { error } = await auth.emailOtp.verifyEmail({ email, otp });
    if (error) {
      throw new Error(error.message);
    }
  }

  async sendVerificationOtp(email: string): Promise<void> {
    email = this.normalizeEmail(email);
    const auth = await this.otpAuthClient();
    const { error } = await auth.emailOtp.sendVerificationOtp({
      email,
      type: 'email-verification',
    });
    if (error) {
      throw new Error(error.message);
    }
  }

  async requestPasswordReset(email: string): Promise<void> {
    email = this.normalizeEmail(email);
    const auth = await this.otpAuthClient();
    const { error } = await auth.forgetPassword.emailOtp({ email });
    if (error) {
      throw new Error(error.message);
    }
  }

  async resetPassword(email: string, otp: string, password: string): Promise<void> {
    email = this.normalizeEmail(email);
    this.validateNewPassword(password);
    const auth = await this.otpAuthClient();
    const { error } = await auth.emailOtp.resetPassword({ email, otp, password });
    if (error) {
      throw new Error(error.message);
    }
  }

  async getAccessToken(): Promise<string> {
    const neonAuth = await this.client;
    const token = await neonAuth.getJWTToken();
    if (!token) {
      throw new Error('Sessione scaduta. Accedi di nuovo per continuare.');
    }
    return token;
  }

  private normalizeEmail(email: string): string {
    const normalizedEmail = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      throw new Error('Inserisci un indirizzo email valido.');
    }
    return normalizedEmail;
  }

  private validateNewPassword(password: string): void {
    if (password.length < 12) {
      throw new Error('La password deve contenere almeno 12 caratteri.');
    }
  }

  private async authClient() {
    const neonAuth = await this.client;
    return neonAuth.adapter;
  }

  private async otpAuthClient() {
    const auth = await this.authClient();
    return auth as typeof auth & EmailOtpClientExtensions;
  }
}
