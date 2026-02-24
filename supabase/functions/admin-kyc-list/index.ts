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
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid token' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    // Check if user is admin
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (roleError || !roleData) {
      console.error('Role check failed:', roleError);
      return new Response(
        JSON.stringify({ success: false, error: 'Access denied. Admin role required.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      );
    }

    // Parse query parameters
    const url = new URL(req.url);
    const action = url.searchParams.get('action');
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const status = url.searchParams.get('status');
    const documentType = url.searchParams.get('documentType');
    const serviceType = url.searchParams.get('serviceType');
    const search = url.searchParams.get('search');
    const sortBy = url.searchParams.get('sortBy') || 'created_at';
    const sortOrder = url.searchParams.get('sortOrder') || 'desc';
    const includeDeleted = url.searchParams.get('includeDeleted') === 'true';

    // Handle soft delete action
    if (action === 'soft-delete') {
      // Only super admin can delete
      const SUPER_ADMIN_EMAIL = 'shawn@guidepoint.co.bw';
      if (user.email !== SUPER_ADMIN_EMAIL) {
        return new Response(
          JSON.stringify({ success: false, error: 'Only super admin can delete records' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
        );
      }

      const body = await req.json();
      const { recordId } = body;

      if (!recordId) {
        return new Response(
          JSON.stringify({ success: false, error: 'Record ID is required' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      const { error: deleteError } = await supabase
        .from('kyc_verifications')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', recordId);

      if (deleteError) {
        console.error('Error soft deleting record:', deleteError);
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to delete record' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
      }

      console.log(`Super admin ${user.email} soft-deleted KYC record: ${recordId}`);
      return new Response(
        JSON.stringify({ success: true, message: 'Record deleted successfully' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Handle bulk delete action
    if (action === 'bulk-delete') {
      // Only super admin can delete
      const SUPER_ADMIN_EMAIL = 'shawn@guidepoint.co.bw';
      if (user.email !== SUPER_ADMIN_EMAIL) {
        return new Response(
          JSON.stringify({ success: false, error: 'Only super admin can delete records' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
        );
      }

      const body = await req.json();
      const { recordIds } = body;

      if (!recordIds || !Array.isArray(recordIds) || recordIds.length === 0) {
        return new Response(
          JSON.stringify({ success: false, error: 'Record IDs array is required' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      const { error: deleteError, count } = await supabase
        .from('kyc_verifications')
        .update({ deleted_at: new Date().toISOString() })
        .in('id', recordIds);

      if (deleteError) {
        console.error('Error bulk deleting records:', deleteError);
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to delete records' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
      }

      console.log(`Super admin ${user.email} bulk soft-deleted ${recordIds.length} KYC records`);
      return new Response(
        JSON.stringify({ success: true, message: 'Records deleted successfully', deletedCount: recordIds.length }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Handle export action - return all records for CSV
    if (action === 'export') {
      console.log(`Admin ${user.email} exporting KYC records`);

      let exportQuery = supabase
        .from('kyc_verifications')
        .select('*')
        .is('deleted_at', null);

      // Apply same filters as list
      if (status && status !== 'all') {
        exportQuery = exportQuery.eq('status', status);
      }
      if (documentType && documentType !== 'all') {
        exportQuery = exportQuery.eq('document_type', documentType);
      }
      if (serviceType && serviceType !== 'all') {
        exportQuery = exportQuery.eq('service_type', serviceType);
      }
      if (search) {
        exportQuery = exportQuery.or(`verification_id.ilike.%${search}%,identity_id.ilike.%${search}%,session_id.ilike.%${search}%,msisdn.ilike.%${search}%,full_name.ilike.%${search}%`);
      }

      exportQuery = exportQuery.order('created_at', { ascending: false });

      const { data: exportRecords, error: exportError } = await exportQuery;

      if (exportError) {
        console.error('Export error:', exportError);
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to export records' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
      }

      return new Response(
        JSON.stringify({ success: true, records: exportRecords }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    const offset = (page - 1) * limit;

    console.log(`Admin ${user.email} fetching KYC records - page: ${page}, status: ${status}, search: ${search}`);

    // Build query - exclude soft deleted records by default
    let query = supabase
      .from('kyc_verifications')
      .select('*', { count: 'exact' });

    // Only show non-deleted records unless explicitly requested
    if (!includeDeleted) {
      query = query.is('deleted_at', null);
    }

    // Apply filters
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }
    
    if (documentType && documentType !== 'all') {
      query = query.eq('document_type', documentType);
    }

    if (serviceType && serviceType !== 'all') {
      query = query.eq('service_type', serviceType);
    }

    if (search) {
      query = query.or(`verification_id.ilike.%${search}%,identity_id.ilike.%${search}%,session_id.ilike.%${search}%,msisdn.ilike.%${search}%,full_name.ilike.%${search}%`);
    }

    // Apply sorting and pagination
    query = query
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .range(offset, offset + limit - 1);

    const { data: records, error: queryError, count } = await query;

    if (queryError) {
      console.error('Query error:', queryError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to fetch records' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    const totalPages = Math.ceil((count || 0) / limit);

    return new Response(
      JSON.stringify({
        success: true,
        records,
        pagination: {
          page,
          limit,
          total: count,
          totalPages
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error: unknown) {
    console.error('Error in admin-kyc-list:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
