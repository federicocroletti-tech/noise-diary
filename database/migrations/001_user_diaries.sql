CREATE TABLE IF NOT EXISTS public.diary_events (
  id text NOT NULL,
  user_id text NOT NULL DEFAULT auth.user_id(),
  payload jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT diary_events_pkey PRIMARY KEY (user_id, id)
);

CREATE TABLE IF NOT EXISTS public.diary_audio_clips (
  id text NOT NULL,
  user_id text NOT NULL DEFAULT auth.user_id(),
  event_id text NOT NULL,
  payload jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT diary_audio_clips_pkey PRIMARY KEY (user_id, id)
);

CREATE INDEX IF NOT EXISTS diary_audio_clips_user_event_idx
  ON public.diary_audio_clips (user_id, event_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'diary_audio_clips_event_owner_fkey'
      AND conrelid = 'public.diary_audio_clips'::regclass
  ) THEN
    ALTER TABLE public.diary_audio_clips
      ADD CONSTRAINT diary_audio_clips_event_owner_fkey
      FOREIGN KEY (user_id, event_id)
      REFERENCES public.diary_events (user_id, id)
      ON DELETE CASCADE;
  END IF;
END;
$$;

ALTER TABLE public.diary_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diary_audio_clips ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS diary_events_owner_policy ON public.diary_events;
CREATE POLICY diary_events_owner_policy
  ON public.diary_events
  TO authenticated
  USING (user_id = auth.user_id())
  WITH CHECK (user_id = auth.user_id());

DROP POLICY IF EXISTS diary_audio_clips_owner_policy ON public.diary_audio_clips;
CREATE POLICY diary_audio_clips_owner_policy
  ON public.diary_audio_clips
  TO authenticated
  USING (user_id = auth.user_id())
  WITH CHECK (user_id = auth.user_id());

GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.diary_events, public.diary_audio_clips
  TO authenticated;
