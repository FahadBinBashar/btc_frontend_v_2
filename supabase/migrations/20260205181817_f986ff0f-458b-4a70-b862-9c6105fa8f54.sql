-- Drop the overly permissive INSERT policy
DROP POLICY IF EXISTS "Anyone can create payment transactions" ON payment_transactions;

-- Create a restrictive policy that only allows service role to insert
-- This ensures payment records can only be created through edge functions
CREATE POLICY "Service role can create payment transactions"
ON payment_transactions
FOR INSERT
TO service_role
WITH CHECK (true);

-- Also add a policy for authenticated admin users to insert if needed for manual operations
CREATE POLICY "Admins can create payment transactions"
ON payment_transactions
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));