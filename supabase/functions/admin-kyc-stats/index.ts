import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    // Verify the user's token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid token' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    // Check if user is admin
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (!roleData) {
      return new Response(
        JSON.stringify({ success: false, error: 'Access denied' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      );
    }

    // Get counts by status
    const { data: allRecords } = await supabase
      .from('kyc_verifications')
      .select('status, document_type, service_type, created_at')
      .is('deleted_at', null);

    const stats = {
      total: allRecords?.length || 0,
      pending: allRecords?.filter(r => r.status === 'pending').length || 0,
      verified: allRecords?.filter(r => r.status === 'verified').length || 0,
      rejected: allRecords?.filter(r => r.status === 'rejected').length || 0,
      expired: allRecords?.filter(r => r.status === 'expired').length || 0,
      omang: allRecords?.filter(r => r.document_type === 'omang').length || 0,
      passport: allRecords?.filter(r => r.document_type === 'passport').length || 0,
      esimPurchase: allRecords?.filter(r => r.service_type === 'esim_purchase').length || 0,
      kycCompliance: allRecords?.filter(r => r.service_type === 'kyc_compliance').length || 0,
      newPhysicalSim: allRecords?.filter(r => r.service_type === 'new_physical_sim').length || 0,
      simSwap: allRecords?.filter(r => r.service_type === 'sim_swap').length || 0,
      smegaRegistration: allRecords?.filter(r => r.service_type === 'smega_registration').length || 0,
      todayCount: allRecords?.filter(r => {
        const today = new Date();
        const recordDate = new Date(r.created_at);
        return recordDate.toDateString() === today.toDateString();
      }).length || 0
    };

    return new Response(
      JSON.stringify({ success: true, stats }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error: unknown) {
    console.error('Error in admin-kyc-stats:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
