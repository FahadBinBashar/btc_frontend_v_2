-- Create storage bucket for KYC documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('kyc-documents', 'kyc-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Allow service role to upload/manage files (used by edge functions)
-- Public policies are not needed since admins will access via edge function

-- Policy for service role to insert files
CREATE POLICY "Service role can upload kyc documents"
ON storage.objects FOR INSERT
TO service_role
WITH CHECK (bucket_id = 'kyc-documents');

-- Policy for service role to select files
CREATE POLICY "Service role can read kyc documents"
ON storage.objects FOR SELECT
TO service_role
USING (bucket_id = 'kyc-documents');

-- Policy for service role to delete files
CREATE POLICY "Service role can delete kyc documents"
ON storage.objects FOR DELETE
TO service_role
USING (bucket_id = 'kyc-documents');

-- Add column to store document image paths
ALTER TABLE public.kyc_verifications
ADD COLUMN IF NOT EXISTS document_photos JSONB DEFAULT '[]'::jsonb;