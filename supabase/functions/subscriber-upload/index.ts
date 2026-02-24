import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

if (import.meta.main) {
  const server = Deno.serve({ port: 3000 }, async (req: Request) => {
    // Handle CORS
    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL');
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

      if (!supabaseUrl || !supabaseServiceKey) {
        return new Response(
          JSON.stringify({ error: 'Missing Supabase credentials' }),
          { status: 500, headers: corsHeaders }
        );
      }

      // Use service role for admin operation
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      const { phoneNumbers } = await req.json();

      if (!Array.isArray(phoneNumbers) || phoneNumbers.length === 0) {
        return new Response(
          JSON.stringify({ error: 'Missing or empty phoneNumbers array' }),
          { status: 400, headers: corsHeaders }
        );
      }

      // Normalize all phone numbers
      const normalizedNumbers = phoneNumbers.map((num: string) => 
        num.replace(/^\+267\s*/, '').trim()
      );

      // Prepare insert data
      const insertData = normalizedNumbers.map((msisdn: string) => ({
        msisdn,
      }));

      // Upsert: insert if not exists, skip if duplicate
      const { data, error } = await supabase
        .from('btc_subscribers')
        .upsert(insertData, { onConflict: 'msisdn' })
        .select();

      if (error) {
        console.error('Database error:', error);
        return new Response(
          JSON.stringify({ error: 'Database insert failed', details: error.message }),
          { status: 500, headers: corsHeaders }
        );
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          inserted: data?.length || 0,
          total: phoneNumbers.length 
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    } catch (error) {
      console.error('Error:', error);
      return new Response(
        JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
        { status: 500, headers: corsHeaders }
      );
    }
  });
}
