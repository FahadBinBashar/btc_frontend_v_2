import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

    // Verify admin authorization
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
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
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (roleError || !roleData) {
      return new Response(
        JSON.stringify({ success: false, error: 'Access denied. Admin role required.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      );
    }

    const { recordId } = await req.json();

    if (!recordId) {
      return new Response(
        JSON.stringify({ success: false, error: 'recordId is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log(`Admin ${user.email} fetching documents for record: ${recordId}`);

    // Get the KYC record with document_photos
    const { data: record, error: recordError } = await supabase
      .from('kyc_verifications')
      .select('id, document_type, full_name, document_photos')
      .eq('id', recordId)
      .maybeSingle();

    if (recordError || !record) {
      return new Response(
        JSON.stringify({ success: false, error: 'Record not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    // Get document photos from storage
    const documentPhotos = record.document_photos as Array<{ path: string; type: string; label: string }> || [];
    
    if (documentPhotos.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'No document photos found for this record. Photos are captured during verification.' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    // Generate signed URLs for each document
    const documents: Array<{
      type: string;
      label: string;
      url: string;
    }> = [];

    for (const photo of documentPhotos) {
      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from('kyc-documents')
        .createSignedUrl(photo.path, 3600); // 1 hour expiry

      if (signedUrlError) {
        console.error(`Failed to create signed URL for ${photo.path}:`, signedUrlError);
        continue;
      }

      if (signedUrlData?.signedUrl) {
        documents.push({
          type: photo.type,
          label: photo.label,
          url: signedUrlData.signedUrl
        });
      }
    }

    console.log(`Found ${documents.length} document images for record ${recordId}`);

    return new Response(
      JSON.stringify({
        success: true,
        recordId: record.id,
        fullName: record.full_name,
        documentType: record.document_type,
        documents
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error: unknown) {
    console.error('Error in kyc-get-documents:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
