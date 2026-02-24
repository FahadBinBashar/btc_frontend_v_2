-- Add deleted_at column for soft delete (records remain in DB)
ALTER TABLE public.kyc_verifications 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Create index for faster filtering of non-deleted records
CREATE INDEX IF NOT EXISTS idx_kyc_verifications_deleted_at ON public.kyc_verifications(deleted_at);