-- Allow anonymous users to create payment transactions (for public purchase flows)
CREATE POLICY "Anyone can create payment transactions"
ON payment_transactions FOR INSERT TO anon
WITH CHECK (true);