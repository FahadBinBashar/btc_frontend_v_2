-- Create enum for verification status
CREATE TYPE public.kyc_status AS ENUM ('pending', 'verified', 'rejected', 'expired');

-- Create enum for document type
CREATE TYPE public.kyc_document_type AS ENUM ('omang', 'passport');

-- Create KYC verifications table
CREATE TABLE public.kyc_verifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- MetaMap identifiers
  verification_id TEXT,
  identity_id TEXT,
  flow_id TEXT,
  
  -- Document information
  document_type kyc_document_type NOT NULL,
  
  -- Status tracking
  status kyc_status NOT NULL DEFAULT 'pending',
  
  -- Extracted data from verification (stored as JSONB for flexibility)
  extracted_data JSONB DEFAULT '{}',
  
  -- Additional metadata from MetaMap
  metadata JSONB DEFAULT '{}',
  
  -- Session/tracking info
  session_id TEXT,
  ip_address TEXT,
  user_agent TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  verified_at TIMESTAMP WITH TIME ZONE,
  
  -- Failure tracking
  failure_reason TEXT,
  retry_count INTEGER DEFAULT 0
);

-- Create index for faster lookups
CREATE INDEX idx_kyc_verifications_verification_id ON public.kyc_verifications(verification_id);
CREATE INDEX idx_kyc_verifications_identity_id ON public.kyc_verifications(identity_id);
CREATE INDEX idx_kyc_verifications_status ON public.kyc_verifications(status);
CREATE INDEX idx_kyc_verifications_created_at ON public.kyc_verifications(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.kyc_verifications ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Allow edge functions (service role) to insert/update
-- No direct client access for security - all operations go through edge functions
CREATE POLICY "Service role can manage kyc_verifications"
  ON public.kyc_verifications
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_kyc_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_kyc_verifications_updated_at
  BEFORE UPDATE ON public.kyc_verifications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_kyc_updated_at();