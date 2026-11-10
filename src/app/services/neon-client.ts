import { createInternalNeonAuth } from '@neon/auth';
import { createClient } from '@neon/neon-js';
import { NEON_AUTH_URL, NEON_DATA_API_URL } from './neon-config';

interface DatabaseTable<Row, Insert, Update> {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
}

export interface Database {
  public: {
    Tables: {
      diary_events: DatabaseTable<
        { id: string; user_id: string; payload: unknown; updated_at: string },
        { id: string; user_id?: string; payload: unknown; updated_at?: string },
        { id?: string; user_id?: string; payload?: unknown; updated_at?: string }
      >;
      diary_audio_clips: DatabaseTable<
        {
          id: string;
          user_id: string;
          event_id: string;
          payload: unknown;
          updated_at: string;
        },
        {
          id: string;
          user_id?: string;
          event_id: string;
          payload: unknown;
          updated_at?: string;
        },
        {
          id?: string;
          user_id?: string;
          event_id?: string;
          payload?: unknown;
          updated_at?: string;
        }
      >;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

export const neonAuth = createInternalNeonAuth(NEON_AUTH_URL);

export const neonClient = createClient<Database>({
  dataApi: {
    url: NEON_DATA_API_URL,
    getToken: () => neonAuth.getJWTToken(),
  },
});
