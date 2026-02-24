import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { createHmac } from "https://deno.land/std@0.168.0/node/crypto.ts";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-signature, x-webhook-signature',
};

// Function to verify webhook signature
function verifyWebhookSignature(payload: string, signature: string | null, secret: string): boolean {
  if (!signature) {
    console.log('No signature provided, skipping verification');
    return true;
  }
  
  try {
    const hmac = createHmac('sha256', secret);
    hmac.update(payload);
    const expectedSignature = hmac.digest('hex');
    
    console.log('Signature verification:', { 
      received: signature?.substring(0, 20) + '...', 
      expected: expectedSignature.substring(0, 20) + '...' 
    });
    
    return signature === expectedSignature || signature === `sha256=${expectedSignature}`;
  } catch (error) {
    console.error('Error verifying signature:', error);
    return false;
  }
}

// Function to get MetaMap access token
async function getMetaMapAccessToken(): Promise<string | null> {
  const clientId = Deno.env.get('METAMAP_CLIENT_ID');
  const clientSecret = Deno.env.get('METAMAP_CLIENT_SECRET');
  
  if (!clientId || !clientSecret) {
    console.error('MetaMap credentials not configured');
    return null;
  }
  
  try {
    const credentials = base64Encode(`${clientId}:${clientSecret}`);
    const response = await fetch('https://api.getmati.com/oauth', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });
    
    if (!response.ok) {
      console.error('Failed to get MetaMap token:', await response.text());
      return null;
    }
    
    const data = await response.json();
    return data.access_token;
  } catch (error) {
    console.error('Error getting MetaMap token:', error);
    return null;
  }
}

// Function to fetch verification details from MetaMap API
async function fetchVerificationDetails(resourceUrl: string): Promise<any> {
  const accessToken = await getMetaMapAccessToken();
  
  if (!accessToken) {
    console.log('Could not get access token, skipping API fetch');
    return null;
  }
  
  try {
    console.log('Fetching verification details from:', resourceUrl);
    const response = await fetch(resourceUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      console.error('Failed to fetch verification:', await response.text());
      return null;
    }
    
    const data = await response.json();
    console.log('Fetched verification details:', JSON.stringify(data, null, 2));
    return data;
  } catch (error) {
    console.error('Error fetching verification:', error);
    return null;
  }
}

// Download image from URL and upload to Supabase Storage
async function downloadAndStoreImage(
  imageUrl: string, 
  recordId: string, 
  imageType: string, 
  supabase: any
): Promise<{ path: string; type: string } | null> {
  try {
    console.log(`Downloading image: ${imageType} from ${imageUrl.substring(0, 50)}...`);
    
    // MetaMap media URLs are typically already signed and should be fetched directly.
    // Adding an API Bearer token can cause 401/403 depending on the CDN.
    const response = await fetch(imageUrl);
    
    if (!response.ok) {
      console.error(`Failed to download image ${imageType}:`, response.status);
      return null;
    }
    
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const extension =
      contentType.includes('png') ? 'png' :
      contentType.includes('webp') ? 'webp' :
      'jpg';
    const arrayBuffer = await response.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    // Create storage path: recordId/imageType.extension
    const storagePath = `${recordId}/${imageType}.${extension}`;
    
    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('kyc-documents')
      .upload(storagePath, uint8Array, {
        contentType,
        upsert: true,
      });
    
    if (uploadError) {
      console.error(`Failed to upload image ${imageType}:`, uploadError);
      return null;
    }
    
    console.log(`Successfully stored image: ${storagePath}`);
    return { path: storagePath, type: imageType };
  } catch (error) {
    console.error(`Error downloading/storing image ${imageType}:`, error);
    return null;
  }
}

// Extract and store all document photos from verification data
async function extractAndStoreDocumentPhotos(
  verificationData: any,
  recordId: string,
  supabase: any
): Promise<Array<{ path: string; type: string; label: string }>> {
  const photos: Array<{ path: string; type: string; label: string }> = [];
  const steps = verificationData?.steps || [];
  
  // Track unique URLs to avoid duplicates
  const processedUrls = new Set<string>();
  
  for (const step of steps) {
    if (step.data) {
      // Document front photo
      const frontUrl = step.data.documentPhotoCropped || step.data.documentPhoto;
      if (frontUrl && !processedUrls.has(frontUrl)) {
        processedUrls.add(frontUrl);
        const result = await downloadAndStoreImage(frontUrl, recordId, 'document_front', supabase);
        if (result) {
          photos.push({ ...result, label: 'Document Front' });
        }
      }
      
      // Document back photo
      const backUrl = step.data.documentBackPhotoCropped || step.data.documentBackPhoto;
      if (backUrl && !processedUrls.has(backUrl)) {
        processedUrls.add(backUrl);
        const result = await downloadAndStoreImage(backUrl, recordId, 'document_back', supabase);
        if (result) {
          photos.push({ ...result, label: 'Document Back' });
        }
      }
      
      // Selfie photo (liveness step commonly uses selfieUrl)
      const selfieUrl = step.data.selfieUrl || step.data.selfiePhotoUrl || step.data.selfie || step.data.selfiePhoto;
      if (selfieUrl && !processedUrls.has(selfieUrl)) {
        processedUrls.add(selfieUrl);
        const result = await downloadAndStoreImage(selfieUrl, recordId, 'selfie', supabase);
        if (result) {
          photos.push({ ...result, label: 'Selfie Photo' });
        }
      }
      
      // Full frame photo
      if (step.data.fullFramePhoto && !processedUrls.has(step.data.fullFramePhoto)) {
        processedUrls.add(step.data.fullFramePhoto);
        const result = await downloadAndStoreImage(step.data.fullFramePhoto, recordId, 'full_frame', supabase);
        if (result) {
          photos.push({ ...result, label: 'Full Frame Photo' });
        }
      }
    }
  }
  
  // Also check documents array
  if (verificationData?.documents && Array.isArray(verificationData.documents)) {
    for (const doc of verificationData.documents) {
      if (doc.photos && Array.isArray(doc.photos)) {
        for (let i = 0; i < doc.photos.length; i++) {
          // MetaMap commonly returns doc.photos as an array of signed URL strings.
          const url = typeof doc.photos[i] === 'string' ? doc.photos[i] : doc.photos[i]?.value;
          if (!url || processedUrls.has(url)) continue;

          processedUrls.add(url);
          const imageType = `document_photo_${i + 1}`;
          const result = await downloadAndStoreImage(url, recordId, imageType, supabase);
          if (result) {
            const label = i === 0 ? 'Document Front' : i === 1 ? 'Document Back' : `Document Photo ${i + 1}`;
            photos.push({ ...result, label });
          }
        }
      }
    }
  }
  
  console.log(`Stored ${photos.length} document photos for record ${recordId}`);
  return photos;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const webhookSecret = Deno.env.get('METAMAP_WEBHOOK_SECRET');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const rawBody = await req.text();
    
    if (webhookSecret) {
      const signature = req.headers.get('x-signature') || 
                       req.headers.get('x-webhook-signature') ||
                       req.headers.get('x-metamap-signature');
      
      if (!verifyWebhookSignature(rawBody, signature, webhookSecret)) {
        console.error('Invalid webhook signature');
        return new Response(
          JSON.stringify({ success: false, error: 'Invalid signature' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
        );
      }
      console.log('Webhook signature verified successfully');
    }

    const payload = JSON.parse(rawBody);
    
    console.log('MetaMap webhook received:', JSON.stringify(payload, null, 2));

    const {
      step,
      eventName,
      flowId,
      identityId,
      identityStatus,
      verificationId,
      metadata,
      details,
      status: webhookStatus,
      resource
    } = payload;

    console.log(`MetaMap Event: ${eventName}, Status: ${identityStatus || webhookStatus}, Flow: ${flowId}`);

    // Fetch full verification details for document photos
    let fullVerificationData: any = null;
    if (resource && (eventName === 'verification_completed' || identityStatus === 'verified' || webhookStatus === 'verified')) {
      fullVerificationData = await fetchVerificationDetails(resource);
    }

    // Determine document type
    const citizenFlowId = Deno.env.get('METAMAP_CITIZEN_FLOW_ID');
    const nonCitizenFlowId = Deno.env.get('METAMAP_NON_CITIZEN_FLOW_ID');
    
    let documentType: 'omang' | 'passport' = 'omang';
    if (metadata?.documentType === 'passport' || flowId === nonCitizenFlowId) {
      documentType = 'passport';
    } else if (metadata?.documentType === 'omang' || flowId === citizenFlowId) {
      documentType = 'omang';
    }

    // Extract user data
    const apiDocuments = fullVerificationData?.documents || [];
    const apiFields = apiDocuments.length > 0 ? apiDocuments[0]?.fields || {} : {};
    const documentData = details?.document?.data || {};
    const stepData = step?.data || {};
    const extractedData = fullVerificationData?.identity || details?.extractedData || documentData;

    const extractField = (fieldNames: string[]): string | null => {
      const getValue = (val: any): string | null => {
        if (val === null || val === undefined) return null;
        if (typeof val === 'object' && val.value !== undefined) return val.value;
        if (typeof val === 'string') return val;
        return String(val);
      };

      for (const field of fieldNames) {
        if (apiFields[field]) {
          const val = getValue(apiFields[field]);
          if (val) return val;
        }
        for (const doc of apiDocuments) {
          if (doc.fields?.[field]) {
            const val = getValue(doc.fields[field]);
            if (val) return val;
          }
        }
        if (stepData[field]) {
          const val = getValue(stepData[field]);
          if (val) return val;
        }
        if (extractedData[field]) {
          const val = getValue(extractedData[field]);
          if (val) return val;
        }
        if (documentData[field]) {
          const val = getValue(documentData[field]);
          if (val) return val;
        }
        if (details?.[field]) {
          const val = getValue(details[field]);
          if (val) return val;
        }
        if (payload.steps) {
          for (const s of payload.steps) {
            if (s.data?.[field]) {
              const val = getValue(s.data[field]);
              if (val) return val;
            }
          }
        }
        if (fullVerificationData?.steps) {
          for (const s of fullVerificationData.steps) {
            if (s.data?.[field]) {
              const val = getValue(s.data[field]);
              if (val) return val;
            }
          }
        }
      }
      return null;
    };

    const normalizeMsisdn = (input: unknown): string | null => {
      if (input === null || input === undefined) return null;
      const raw = String(input).trim();
      if (!raw) return null;
      const cleaned = raw.replace(/\s+/g, "");
      if (/^\d+$/.test(cleaned) && cleaned.length >= 7) return `+${cleaned}`;
      return cleaned;
    };

    const msisdnFromMetadata =
      normalizeMsisdn(metadata?.msisdn) ||
      normalizeMsisdn(metadata?.selectedNumber) ||
      normalizeMsisdn(metadata?.phoneNumber) ||
      null;

    const kycFields = {
      msisdn: msisdnFromMetadata || extractField(['msisdn', 'phoneNumber', 'phone', 'mobileNumber', 'cellPhone']),
      country: extractField(['country', 'nationality', 'countryOfOrigin', 'issuingCountry']),
      country_abbreviation: extractField(['countryCode', 'countryAbbreviation', 'nationalityCode', 'issuingCountryCode']),
      full_name: extractField(['fullName', 'full_name', 'name', 'completeName']) || 
                 (extractField(['firstName', 'first_name', 'givenName']) && extractField(['lastName', 'surname', 'familyName']) 
                   ? `${extractField(['firstName', 'first_name', 'givenName'])} ${extractField(['lastName', 'surname', 'familyName'])}` 
                   : null),
      first_name: extractField(['firstName', 'first_name', 'givenName', 'forenames', 'givenNames']),
      surname: extractField(['lastName', 'surname', 'familyName', 'last_name', 'surName']),
      date_of_birth: extractField(['dateOfBirth', 'dob', 'birthDate', 'date_of_birth', 'birthDay']),
      sex: extractField(['sex', 'gender', 'Gender']),
      document_number: extractField(['documentNumber', 'idNumber', 'passportNumber', 'omangNumber', 'nationalId', 'document_number']),
      physical_address: extractField(['physicalAddress', 'address', 'residentialAddress', 'street', 'streetAddress']) ||
                        // Construct from metadata if available
                        (metadata?.plotNumber && metadata?.city ? 
                          `Plot ${metadata.plotNumber}, ${metadata.ward || ''}, ${metadata.village || ''}, ${metadata.city}`.replace(/,\s*,/g, ',').trim() : null),
      postal_address: extractField(['postalAddress', 'postal_address', 'mailingAddress', 'postAddress']) || metadata?.postalAddress || null,
      date_of_issue: extractField(['dateOfIssue', 'issueDate', 'date_of_issue', 'issuedDate']),
      expiry_date: extractField(['expiryDate', 'expiry_date', 'expirationDate', 'validUntil', 'dateOfExpiry']),
      // New fields from registration form
      email: metadata?.email || extractField(['email', 'emailAddress', 'userEmail']) || null,
      next_of_kin_name: metadata?.nextOfKinName || extractField(['nextOfKinName', 'kinName', 'emergencyContactName']) || null,
      next_of_kin_relation: metadata?.nextOfKinRelation || extractField(['nextOfKinRelation', 'kinRelation', 'relationship']) || null,
      next_of_kin_phone: metadata?.nextOfKinPhone || extractField(['nextOfKinPhone', 'kinPhone', 'emergencyContactPhone']) || null,
      plot_number: metadata?.plotNumber || extractField(['plotNumber', 'plot']) || null,
      ward: metadata?.ward || extractField(['ward']) || null,
      village: metadata?.village || extractField(['village', 'town']) || null,
      city: metadata?.city || extractField(['city']) || null,
      add_phone_number_1: extractField(['addPhoneNumber1', 'altPhone1', 'alternativePhone1']),
      add_phone_number_2: extractField(['addPhoneNumber2', 'altPhone2', 'alternativePhone2']),
      add_phone_number_3: extractField(['addPhoneNumber3', 'altPhone3', 'alternativePhone3']),
      add_phone_number_4: extractField(['addPhoneNumber4', 'altPhone4', 'alternativePhone4']),
      add_phone_number_5: extractField(['addPhoneNumber5', 'altPhone5', 'alternativePhone5']),
      add_phone_number_6: extractField(['addPhoneNumber6', 'altPhone6', 'alternativePhone6']),
      add_phone_number_7: extractField(['addPhoneNumber7', 'altPhone7', 'alternativePhone7']),
      add_phone_number_8: extractField(['addPhoneNumber8', 'altPhone8', 'alternativePhone8']),
      add_phone_number_9: extractField(['addPhoneNumber9', 'altPhone9', 'alternativePhone9']),
      add_phone_number_10: extractField(['addPhoneNumber10', 'altPhone10', 'alternativePhone10']),
    };

    if (!kycFields.msisdn) delete (kycFields as any).msisdn;

    console.log('Extracted KYC fields:', JSON.stringify(kycFields, null, 2));

    // Find existing record - include service_type to preserve it during updates
    let existingRecord: { id: string; service_type: string | null } | null = null;
    
    if (metadata?.recordId) {
      const { data: recordById } = await supabase
        .from('kyc_verifications')
        .select('id, service_type')
        .eq('id', metadata.recordId)
        .maybeSingle();
      if (recordById) {
        existingRecord = recordById;
        console.log(`Found existing record by metadata.recordId: ${existingRecord.id}, service_type: ${existingRecord.service_type}`);
      }
    }
    
    if (!existingRecord && identityId) {
      const { data: recordByIdentity } = await supabase
        .from('kyc_verifications')
        .select('id, service_type')
        .eq('identity_id', identityId)
        .maybeSingle();
      if (recordByIdentity) {
        existingRecord = recordByIdentity;
        console.log(`Found existing record by identity_id: ${existingRecord.id}, service_type: ${existingRecord.service_type}`);
      }
    }

    const actualStatus = webhookStatus || identityStatus || fullVerificationData?.identity?.status;

    const mapMetaMapStatus = (status: string | undefined): "pending" | "verified" | "rejected" | "expired" => {
      if (!status) return 'pending';
      const normalizedStatus = status.toLowerCase();
      if (normalizedStatus === 'verified') return 'verified';
      if (normalizedStatus === 'rejected') return 'rejected';
      if (normalizedStatus === 'reviewneeded' || normalizedStatus === 'review_needed' || normalizedStatus === 'review') return 'rejected';
      if (normalizedStatus === 'expired') return 'expired';
      return 'pending';
    };

    if (eventName === 'verification_completed' || step?.status === 'completed' || actualStatus) {
      console.log(`Verification completed for identity: ${identityId}, status: ${actualStatus}`);
      
      const kycStatus = mapMetaMapStatus(actualStatus);
      console.log(`Setting KYC status to: ${kycStatus} (from MetaMap status: ${actualStatus})`);

      // IMPORTANT: Preserve existing service_type from the record if it exists
      // Priority: 1. Existing record's service_type, 2. metadata.serviceType, 3. flowType fallback
      const serviceType = existingRecord?.service_type || metadata?.serviceType || (metadata?.flowType === 'sim_swap' ? 'sim_swap' : 'esim_purchase');
      console.log(`Using service_type: ${serviceType} (existing: ${existingRecord?.service_type}, metadata: ${metadata?.serviceType})`);

      // Determine the record ID for storing photos
      const recordIdForPhotos = existingRecord?.id || metadata?.recordId;
      
      // Download and store document photos if we have verification data
      let documentPhotos: Array<{ path: string; type: string; label: string }> = [];
      if (fullVerificationData && recordIdForPhotos) {
        documentPhotos = await extractAndStoreDocumentPhotos(fullVerificationData, recordIdForPhotos, supabase);
      }

      const updateData = {
        status: kycStatus as "pending" | "verified" | "rejected" | "expired",
        identity_id: identityId,
        verification_id: verificationId,
        extracted_data: fullVerificationData || extractedData,
        metadata: metadata || {},
        verified_at: kycStatus === 'verified' ? new Date().toISOString() : null,
        failure_reason: kycStatus === 'rejected' ? (details?.reason || 'Verification rejected') : null,
        service_type: serviceType,
        document_photos: documentPhotos.length > 0 ? documentPhotos : undefined,
        ...kycFields
      };

      // Remove undefined fields
      Object.keys(updateData).forEach(key => {
        if (updateData[key as keyof typeof updateData] === undefined) {
          delete updateData[key as keyof typeof updateData];
        }
      });

      console.log('Update data:', JSON.stringify(updateData, null, 2));

      if (existingRecord) {
        const { error: updateError } = await supabase
          .from('kyc_verifications')
          .update(updateData)
          .eq('id', existingRecord.id);

        if (updateError) {
          console.error('Error updating KYC record:', updateError);
        } else {
          console.log(`Updated KYC record: ${existingRecord.id}`);
        }
      } else {
        const { data: newRecord, error: insertError } = await supabase
          .from('kyc_verifications')
          .insert({
            flow_id: flowId,
            document_type: documentType,
            ...updateData
          })
          .select()
          .single();

        if (insertError) {
          console.error('Error inserting KYC record:', insertError);
        } else {
          console.log(`Created KYC record: ${newRecord?.id}`);
          
          // If we didn't have a recordId before, download photos now
          if (!recordIdForPhotos && newRecord?.id && fullVerificationData) {
            documentPhotos = await extractAndStoreDocumentPhotos(fullVerificationData, newRecord.id, supabase);
            if (documentPhotos.length > 0) {
              await supabase
                .from('kyc_verifications')
                .update({ document_photos: documentPhotos })
                .eq('id', newRecord.id);
            }
          }
        }
      }
      
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Verification processed successfully',
          identityId,
          documentType,
          status: identityStatus,
          extractedFields: kycFields,
          documentPhotosStored: documentPhotos.length
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      );
    }

    // Handle verification updates
    if (eventName === 'verification_updated' || eventName === 'step_completed') {
      console.log(`Verification update: ${step?.id} - ${step?.status}`);

      if (existingRecord) {
        await supabase
          .from('kyc_verifications')
          .update({
            metadata: { ...metadata, lastStep: step?.id, lastStepStatus: step?.status }
          })
          .eq('id', existingRecord.id);
      }
      
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Verification update received',
          identityId,
          step: step?.id,
          status: step?.status
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      );
    }

    // Handle verification failures
    if (identityStatus === 'rejected' || step?.status === 'rejected') {
      console.log(`Verification rejected for identity: ${identityId}`);

      if (existingRecord) {
        await supabase
          .from('kyc_verifications')
          .update({
            status: 'rejected',
            failure_reason: details?.reason || 'Unknown reason'
          })
          .eq('id', existingRecord.id);
      } else {
        const serviceType = metadata?.serviceType || (metadata?.flowType === 'sim_swap' ? 'sim_swap' : 'esim_purchase');
        await supabase
          .from('kyc_verifications')
          .insert({
            verification_id: verificationId,
            identity_id: identityId,
            flow_id: flowId,
            document_type: documentType,
            status: 'rejected',
            failure_reason: details?.reason || 'Unknown reason',
            metadata: metadata || {},
            service_type: serviceType,
            ...kycFields
          });
      }
      
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Verification rejected',
          identityId,
          reason: details?.reason || 'Unknown reason'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      );
    }

    // Handle verification started
    if (eventName === 'verification_started' && !existingRecord) {
      const serviceType = metadata?.serviceType || (metadata?.flowType === 'sim_swap' ? 'sim_swap' : 'esim_purchase');
      const { error: insertError } = await supabase
        .from('kyc_verifications')
        .insert({
          verification_id: verificationId,
          identity_id: identityId,
          flow_id: flowId,
          document_type: documentType,
          status: 'pending',
          metadata: metadata || {},
          service_type: serviceType,
          ...kycFields
        });

      if (insertError) {
        console.error('Error creating initial KYC record:', insertError);
      } else {
        console.log(`Created initial KYC record for identity: ${identityId}`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Webhook received',
        eventName
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error: unknown) {
    console.error('Error processing MetaMap webhook:', error);
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
