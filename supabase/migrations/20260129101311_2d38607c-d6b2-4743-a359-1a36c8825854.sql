-- Create enum for service types
CREATE TYPE public.service_type AS ENUM ('esim_purchase', 'sim_swap', 'new_registration');

-- Add service_type column to kyc_verifications table
ALTER TABLE public.kyc_verifications
ADD COLUMN service_type public.service_type DEFAULT 'esim_purchase';

-- Add index for filtering by service type
CREATE INDEX idx_kyc_verifications_service_type ON public.kyc_verifications(service_type);