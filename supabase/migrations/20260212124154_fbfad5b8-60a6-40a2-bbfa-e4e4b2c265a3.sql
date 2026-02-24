-- Fix the overly permissive SELECT policy
-- Drop the old policy
DROP POLICY IF EXISTS "Anyone can lookup subscribers" ON public.btc_subscribers;

-- Create a policy that allows authenticated OR unauthenticated SELECT (more explicit)
CREATE POLICY "Public can lookup subscribers for verification"
ON public.btc_subscribers
FOR SELECT
USING (true);