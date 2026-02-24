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
      const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY');

      if (!supabaseUrl || !supabaseKey) {
        return new Response(
          JSON.stringify({ error: 'Missing Supabase credentials' }),
          { status: 500, headers: corsHeaders }
        );
      }

      const supabase = createClient(supabaseUrl, supabaseKey);

      const { msisdn } = await req.json();

      if (!msisdn) {
        return new Response(
          JSON.stringify({ error: 'Missing msisdn parameter' }),
          { status: 400, headers: corsHeaders }
        );
      }

      // Normalize the MSISDN: remove +267 prefix and whitespace, then check
      const normalized = msisdn.replace(/^\+267\s*/, '').trim();

      // Query the btc_subscribers table
      const { data, error } = await supabase
        .from('btc_subscribers')
        .select('id')
        .eq('msisdn', normalized)
        .maybeSingle();

      if (error) {
        console.error('Database error:', error);
        return new Response(
          JSON.stringify({ error: 'Database lookup failed' }),
          { status: 500, headers: corsHeaders }
        );
      }

      const exists = !!data;

      return new Response(
        JSON.stringify({ exists, msisdn: normalized }),
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
