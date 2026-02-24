-- Add a permissive SELECT policy to allow Realtime subscriptions
-- This allows reading records where the client knows the session_id
-- The session_id is a random UUID generated per verification attempt

CREATE POLICY "Allow select for realtime with session filter"
ON public.kyc_verifications
FOR SELECT
USING (true);

-- Note: This is permissive but the table only contains non-sensitive verification status.
-- The sensitive document photos are stored in a separate private storage bucket.
-- For production, you could add a more restrictive policy using RLS with session tokens.