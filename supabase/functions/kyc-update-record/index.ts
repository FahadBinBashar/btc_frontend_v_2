import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { 
      recordId,
      verificationId,
      identityId,
      status,
      extractedData,
      metadata,
      failureReason
    } = await req.json();

    console.log(`Updating KYC record: ${recordId}`);

    if (!recordId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Record ID is required'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      );
    }

    // Build update object
    const updateData: Record<string, unknown> = {};
    
    if (verificationId) updateData.verification_id = verificationId;
    if (identityId) updateData.identity_id = identityId;
    if (status) updateData.status = status;
    if (extractedData) updateData.extracted_data = extractedData;
    if (metadata) updateData.metadata = metadata;
    if (failureReason) updateData.failure_reason = failureReason;
    
    // Set verified_at timestamp if status is verified
    if (status === 'verified') {
      updateData.verified_at = new Date().toISOString();
    }

    // Update the record
    const { data: record, error: updateError } = await supabase
      .from('kyc_verifications')
      .update(updateData)
      .eq('id', recordId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating KYC record:', updateError);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to update verification record'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500
        }
      );
    }

    console.log(`Updated KYC record: ${record.id}, status: ${record.status}`);

    return new Response(
      JSON.stringify({
        success: true,
        record: {
          id: record.id,
          status: record.status,
          documentType: record.document_type,
          verifiedAt: record.verified_at
        },
        message: 'Verification record updated'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error: unknown) {
    console.error('Error in kyc-update-record:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
