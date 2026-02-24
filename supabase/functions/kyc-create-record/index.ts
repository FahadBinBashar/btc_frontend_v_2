import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Simple in-memory rate limiting (resets on function cold start)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 5; // 5 requests per minute per IP

function checkRateLimit(ipAddress: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ipAddress);
  
  if (!record || now > record.resetTime) {
    rateLimitMap.set(ipAddress, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  
  if (record.count >= MAX_REQUESTS_PER_WINDOW) {
    return false;
  }
  
  record.count++;
  return true;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get client IP for rate limiting
    const forwardedFor = req.headers.get('x-forwarded-for');
    const realIp = req.headers.get('x-real-ip');
    const ipAddress = forwardedFor?.split(',')[0]?.trim() || realIp || 'unknown';

    // Check rate limit
    if (!checkRateLimit(ipAddress)) {
      console.warn(`Rate limit exceeded for IP: ${ipAddress}`);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Too many requests. Please try again later.'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 429
        }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse and validate request body
    let body;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid JSON body'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      );
    }

    const { 
      documentType, 
      verificationId, 
      identityId, 
      flowId,
      sessionId,
      msisdn,
      serviceType,
      metadata 
    } = body;

    console.log(`Creating KYC record for ${documentType} verification from IP: ${ipAddress}`);

    // Validate document type (required field)
    if (!documentType || !['omang', 'passport'].includes(documentType)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid document type. Must be "omang" or "passport".'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      );
    }

    // Validate sessionId (required for security - links record to client session)
    if (!sessionId || typeof sessionId !== 'string' || sessionId.length < 10 || sessionId.length > 100) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Valid sessionId is required'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      );
    }

    // Validate optional string fields
    const validateOptionalString = (value: unknown, maxLength: number): string | null => {
      if (value === null || value === undefined) return null;
      if (typeof value !== 'string') return null;
      return value.slice(0, maxLength);
    };

    // Get client info from headers
    const userAgent = req.headers.get('user-agent') || '';

    // Validate service type
    const validServiceTypes = ['esim_purchase', 'sim_swap', 'new_physical_sim', 'kyc_compliance', 'smega_registration'];
    const resolvedServiceType = serviceType && validServiceTypes.includes(serviceType) 
      ? serviceType 
      : 'esim_purchase';

    // Validate and sanitize metadata
    let sanitizedMetadata: Record<string, string> = {};
    if (metadata && typeof metadata === 'object' && !Array.isArray(metadata)) {
      // Only allow specific safe metadata keys
      const allowedKeys = ['source', 'referrer', 'device_type'];
      for (const key of allowedKeys) {
        if (key in metadata && typeof metadata[key] === 'string') {
          sanitizedMetadata[key] = String(metadata[key]).slice(0, 200);
        }
      }
    }

    // Create KYC verification record
    const { data: record, error: insertError } = await supabase
      .from('kyc_verifications')
      .insert({
        document_type: documentType,
        verification_id: validateOptionalString(verificationId, 100),
        identity_id: validateOptionalString(identityId, 100),
        flow_id: validateOptionalString(flowId, 100),
        status: 'pending',
        session_id: sessionId,
        msisdn: validateOptionalString(msisdn, 20),
        service_type: resolvedServiceType,
        ip_address: ipAddress,
        user_agent: userAgent.slice(0, 500),
        metadata: sanitizedMetadata
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('Error creating KYC record:', insertError);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to create verification record'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500
        }
      );
    }

    console.log(`Created KYC record: ${record.id}`);

    return new Response(
      JSON.stringify({
        success: true,
        recordId: record.id,
        message: 'Verification record created'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error: unknown) {
    console.error('Error in kyc-create-record:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'An error occurred while processing your request'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
