-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Service role can manage kyc_verifications" ON public.kyc_verifications;

-- Create restrictive RLS policies - deny all direct client access
-- KYC data should only be accessed through edge functions using service role
CREATE POLICY "Deny direct select access to kyc_verifications"
  ON public.kyc_verifications
  FOR SELECT
  USING (false);

CREATE POLICY "Deny direct insert access to kyc_verifications"
  ON public.kyc_verifications
  FOR INSERT
  WITH CHECK (false);

CREATE POLICY "Deny direct update access to kyc_verifications"
  ON public.kyc_verifications
  FOR UPDATE
  USING (false);

CREATE POLICY "Deny direct delete access to kyc_verifications"
  ON public.kyc_verifications
  FOR DELETE
  USING (false);