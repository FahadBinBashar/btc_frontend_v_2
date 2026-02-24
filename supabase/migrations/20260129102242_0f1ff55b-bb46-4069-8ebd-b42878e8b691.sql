-- Add new values to the service_type enum
ALTER TYPE public.service_type ADD VALUE IF NOT EXISTS 'kyc_compliance';
ALTER TYPE public.service_type ADD VALUE IF NOT EXISTS 'new_physical_sim';
ALTER TYPE public.service_type ADD VALUE IF NOT EXISTS 'smega_registration';