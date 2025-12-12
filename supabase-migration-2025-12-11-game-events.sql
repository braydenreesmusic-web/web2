-- Migration: create `game_events` table for tic-tac-toe and other game flows
-- Date: 2025-12-11

-- Create table
CREATE TABLE IF NOT EXISTS public.game_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  author text,
  content text NOT NULL,
  date timestamptz NOT NULL DEFAULT now()
);

-- Index for efficient ordering/filtering
CREATE INDEX IF NOT EXISTS idx_game_events_date ON public.game_events(date DESC);

-- Enable Row Level Security
ALTER TABLE public.game_events ENABLE ROW LEVEL SECURITY;

-- Policy: allow owners to insert their own events
CREATE POLICY "Insert own game events" ON public.game_events
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Policy: allow select for related partners or the owning user
-- Assumes a `relationships` table with columns (user_id, partner_user_id)
CREATE POLICY "Select own or partner game events" ON public.game_events
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.relationships r
      WHERE (
        r.user_id = auth.uid() AND r.partner_user_id = public.game_events.user_id
      ) OR (
        r.partner_user_id = auth.uid() AND r.user_id = public.game_events.user_id
      )
    )
  );

-- Policy: allow UPDATE only by the original author
CREATE POLICY "Modify own game event - update" ON public.game_events
  FOR UPDATE
  USING (user_id = auth.uid());

-- Policy: allow DELETE only by the original author
CREATE POLICY "Modify own game event - delete" ON public.game_events
  FOR DELETE
  USING (user_id = auth.uid());

-- Note: If your Supabase project doesn't have `gen_random_uuid()` enabled, run:
-- CREATE EXTENSION IF NOT EXISTS pgcrypto;
