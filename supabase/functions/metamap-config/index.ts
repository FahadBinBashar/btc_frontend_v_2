import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { documentType } = await req.json();
    
    console.log(`MetaMap config requested for document type: ${documentType}`);

    const clientId = Deno.env.get('METAMAP_CLIENT_ID');
    const citizenFlowId = Deno.env.get('METAMAP_CITIZEN_FLOW_ID');
    const nonCitizenFlowId = Deno.env.get('METAMAP_NON_CITIZEN_FLOW_ID');

    if (!clientId) {
      console.error('MetaMap Client ID not configured');
      return new Response(
        JSON.stringify({
          success: false,
          error: 'MetaMap not configured'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500
        }
      );
    }

    // Select flow ID based on document type
    let flowId: string | undefined;
    if (documentType === 'omang') {
      flowId = citizenFlowId;
    } else if (documentType === 'passport') {
      flowId = nonCitizenFlowId;
    }

    if (!flowId) {
      console.error(`Invalid document type or flow not configured: ${documentType}`);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid document type'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      );
    }

    console.log(`Returning config - Client ID: ${clientId.substring(0, 8)}..., Flow ID: ${flowId.substring(0, 8)}...`);

    return new Response(
      JSON.stringify({
        success: true,
        clientId,
        flowId
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error: unknown) {
    console.error('Error getting MetaMap config:', error);
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
