-- Create btc_subscribers table for whitelist
CREATE TABLE public.btc_subscribers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  msisdn TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.btc_subscribers ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can insert
CREATE POLICY "Admins can insert subscribers"
ON public.btc_subscribers
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Policy: Admins can view all
CREATE POLICY "Admins can view subscribers"
ON public.btc_subscribers
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Policy: Anonymous users can lookup (for KYC flow)
CREATE POLICY "Anyone can lookup subscribers"
ON public.btc_subscribers
FOR SELECT
USING (true);

-- Policy: Admins can delete
CREATE POLICY "Admins can delete subscribers"
ON public.btc_subscribers
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'::app_role));