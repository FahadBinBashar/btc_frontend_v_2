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

    // Verify admin role
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Authorization required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

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
        JSON.stringify({ success: false, error: 'Admin access required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      );
    }

    const url = new URL(req.url);
    const action = url.searchParams.get('action') || 'list';

    if (action === 'list') {
      const limit = parseInt(url.searchParams.get('limit') || '100');
      const offset = parseInt(url.searchParams.get('offset') || '0');
      const paymentMethod = url.searchParams.get('payment_method');
      const status = url.searchParams.get('status');
      const serviceType = url.searchParams.get('service_type');

      let query = supabase
        .from('payment_transactions')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (paymentMethod) {
        query = query.ilike('payment_method', `%${paymentMethod}%`);
      }
      if (status) {
        query = query.eq('status', status);
      }
      if (serviceType) {
        query = query.eq('service_type', serviceType);
      }

      const { data: transactions, error, count } = await query;

      if (error) {
        console.error('Error fetching transactions:', error);
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to fetch transactions' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
      }

      return new Response(
        JSON.stringify({ success: true, transactions, total: count }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'stats') {
      // Get payment statistics
      const { data: allTransactions, error } = await supabase
        .from('payment_transactions')
        .select('payment_method, amount, status, service_type, created_at');

      if (error) {
        console.error('Error fetching stats:', error);
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to fetch stats' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
      }

      const stats = {
        total_transactions: allTransactions.length,
        total_revenue: allTransactions
          .filter(t => t.status === 'completed')
          .reduce((sum, t) => sum + parseFloat(t.amount), 0),
        by_method: {} as Record<string, { count: number; revenue: number }>,
        by_service: {} as Record<string, { count: number; revenue: number }>,
        by_status: {} as Record<string, number>,
      };

      allTransactions.forEach(t => {
        // By method
        if (!stats.by_method[t.payment_method]) {
          stats.by_method[t.payment_method] = { count: 0, revenue: 0 };
        }
        stats.by_method[t.payment_method].count++;
        if (t.status === 'completed') {
          stats.by_method[t.payment_method].revenue += parseFloat(t.amount);
        }

        // By service
        const service = t.service_type || 'unknown';
        if (!stats.by_service[service]) {
          stats.by_service[service] = { count: 0, revenue: 0 };
        }
        stats.by_service[service].count++;
        if (t.status === 'completed') {
          stats.by_service[service].revenue += parseFloat(t.amount);
        }

        // By status
        if (!stats.by_status[t.status]) {
          stats.by_status[t.status] = 0;
        }
        stats.by_status[t.status]++;
      });

      return new Response(
        JSON.stringify({ success: true, stats }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: 'Invalid action' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
