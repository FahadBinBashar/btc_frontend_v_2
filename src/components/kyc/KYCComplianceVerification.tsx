import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { Shield, Loader2, CheckCircle, XCircle, RefreshCw, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useMetaMap } from "@/hooks/useMetaMap";

interface KYCComplianceVerificationProps {
  requestId: string | number;
  phoneNumber: string;
  registrationData: any;
  onComplete: (data: any) => void;
  onBack: () => void;
}

type VerificationStage = "id-selection" | "verifying" | "polling" | "success" | "failed";

const normalizeKycStatus = (value: unknown): string => {
  if (typeof value !== "string") return "";
  return value.trim().toLowerCase();
};

const extractKycStatus = (statusPayload: any): string => {
  const candidates = [
    statusPayload?.request_status,
    statusPayload?.requestStatus,
    statusPayload?.verification?.status,
    statusPayload?.kyc_status,
    statusPayload?.kycStatus,
    statusPayload?.verification_status,
    statusPayload?.verificationStatus,
    statusPayload?.identity_status,
    statusPayload?.identityStatus,
    statusPayload?.kyc_record?.status,
    statusPayload?.kycRecord?.status,
    statusPayload?.record?.status,
    statusPayload?.data?.kyc_status,
    statusPayload?.data?.kycStatus,
    statusPayload?.data?.verification_status,
    statusPayload?.data?.verificationStatus,
    statusPayload?.data?.identity_status,
    statusPayload?.data?.identityStatus,
    statusPayload?.data?.kyc_record?.status,
    statusPayload?.data?.kycRecord?.status,
    statusPayload?.data?.record?.status,
    statusPayload?.data?.data?.kyc_status,
    statusPayload?.data?.data?.kycStatus,
    statusPayload?.data?.data?.verification_status,
    statusPayload?.data?.data?.verificationStatus,
    statusPayload?.data?.data?.identity_status,
    statusPayload?.data?.data?.identityStatus,
    statusPayload?.data?.data?.kyc_record?.status,
    statusPayload?.data?.data?.kycRecord?.status,
    statusPayload?.data?.data?.record?.status,
    statusPayload?.status,
    statusPayload?.data?.status,
  ];

  for (const candidate of candidates) {
    const normalized = normalizeKycStatus(candidate);
    if (normalized) return normalized;
  }

  return "";
};

const KYCComplianceVerification = ({
  requestId,
  phoneNumber,
  registrationData,
  onComplete,
  onBack,
}: KYCComplianceVerificationProps) => {
  const [stage, setStage] = useState<VerificationStage>("id-selection");
  const [selectedIdType, setSelectedIdType] = useState<"omang" | "passport" | null>(null);
  const [pollingStartTime, setPollingStartTime] = useState<number | null>(null);
  const [countdown, setCountdown] = useState<number>(600); // 10 minutes
  const [isManuallyRefreshing, setIsManuallyRefreshing] = useState(false);
  const pollingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const requestIdRef = useRef<string | number>(requestId);
  const { startVerification, isLoading, isSDKLoaded, clearError } = useMetaMap();

  useEffect(() => {
    requestIdRef.current = requestId;
  }, [requestId]);

  // Fetch record via edge function (for manual refresh)
  const fetchKycStatus = useCallback(async () => {
    console.log("fetchKycStatus called with request:", requestIdRef.current);
    try {
      const data = await api.kycComplianceStatus(requestIdRef.current);
      return data;
    } catch (err) {
      console.error("Error fetching KYC record:", err);
      return null;
    }
  }, []);

  // Process status update from any source (realtime or polling)
  const processStatusUpdate = useCallback(async (statusPayload: any) => {
    console.log("Processing status update:", statusPayload);
    if (!statusPayload) return false;

    const status = extractKycStatus(statusPayload);
    if (
      status === "verified" ||
      status === "approved" ||
      status === "kyc_verified" ||
      status === "completed" ||
      status === "success"
    ) {
      try {
        await api.kycComplianceComplete(requestIdRef.current, {
          verified: true,
          kyc_verification_id: statusPayload?.kyc_verification_id,
        });
      } catch (err) {
        console.warn("Failed to mark KYC as complete:", err);
      }
      setStage("success");
      toast.success("Identity verified successfully!");
      
      // Auto-proceed after short delay
      setTimeout(() => {
        onComplete({
          success: true,
          data: statusPayload,
        });
      }, 2000);
      return true;
    } else if (
      status === "rejected" ||
      status === "failed" ||
      status === "kyc_rejected" ||
      status === "declined" ||
      status === "expired"
    ) {
      setStage("failed");
      toast.error(statusPayload?.failure_reason || "Verification failed. Please try again.");
      return true;
    }
    
    return false;
  }, [onComplete]);

  // Countdown timer for polling
  useEffect(() => {
    if (stage === "polling" && pollingStartTime) {
      const interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - pollingStartTime) / 1000);
        const remaining = Math.max(0, 600 - elapsed);
        setCountdown(remaining);
        
        if (remaining <= 0) {
          clearInterval(interval);
          setStage("failed");
          toast.error("Verification timed out. Please try again.");
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [stage, pollingStartTime]);

  // Fallback polling
  useEffect(() => {
    if (stage !== "polling") return;
    const poll = async () => {
      const status = await fetchKycStatus();
      if (status) {
        processStatusUpdate(status);
      }
    };

    // Poll every 3 seconds as fallback
    const interval = setInterval(poll, 3000);

    return () => clearInterval(interval);
  }, [stage, fetchKycStatus, processStatusUpdate]);

  // Manual refresh handler
  const handleManualRefresh = async () => {
    console.log("handleManualRefresh called", { 
      requestId: requestIdRef.current,
    });
    
    if (!requestIdRef.current) {
      console.warn("Missing requestId for manual refresh");
      toast.error("Cannot check status - missing session data");
      return;
    }
    
    setIsManuallyRefreshing(true);
    const result = await fetchKycStatus();
    setIsManuallyRefreshing(false);
    
    if (result) {
      console.log("Manual refresh got result:", result);
      if (!processStatusUpdate(result)) {
        toast.info("Verification still processing. Please wait...");
      }
    } else {
      toast.error("Failed to check status. Please try again.");
    }
  };

  const handleSelectIdType = async (type: "omang" | "passport") => {
    setSelectedIdType(type);
    setStage("verifying");

    try {
      if (!requestIdRef.current) {
        throw new Error("Missing request id");
      }
      await api.kycComplianceStartKyc(requestIdRef.current, {
        document_type: type,
      });
      clearError();
      const result = await startVerification(type, {
        msisdn: phoneNumber,
        ...registrationData,
        serviceSelectedAt: new Date().toISOString(),
      });
      if (result.status === "cancelled") {
        setStage("id-selection");
        toast.info("Verification was cancelled");
        return;
      }
      setPollingStartTime(Date.now());
      setStage("polling");
    } catch (error) {
      console.error("KYC Error:", error);
      toast.error("Failed to start verification. Please try again.");
      setStage("id-selection");
    }
  };

  const handleRetry = () => {
    setStage("id-selection");
    setSelectedIdType(null);
    setPollingStartTime(null);
    setCountdown(600);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="max-w-xl mx-auto"
    >
      <div className="bg-card border border-border rounded-xl p-6">
        {/* ID Selection Stage */}
        {stage === "id-selection" && (
          <>
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-full gradient-primary flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-primary-foreground" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">
                Identity Verification
              </h2>
              <p className="text-muted-foreground">
                Select your ID type to begin verification
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <Button
                variant="outline"
                className="h-24 flex flex-col gap-2"
                onClick={() => handleSelectIdType("omang")}
                disabled={stage === "verifying" || isLoading || !isSDKLoaded}
              >
                <span className="text-2xl">🪪</span>
                <span className="font-medium">Omang</span>
                <span className="text-xs text-muted-foreground">Citizen ID</span>
              </Button>
              <Button
                variant="outline"
                className="h-24 flex flex-col gap-2"
                onClick={() => handleSelectIdType("passport")}
                disabled={stage === "verifying" || isLoading || !isSDKLoaded}
              >
                <span className="text-2xl">🛂</span>
                <span className="font-medium">Passport</span>
                <span className="text-xs text-muted-foreground">Non-Citizen</span>
              </Button>
            </div>

            <Button variant="outline" onClick={onBack} className="w-full">
              Back
            </Button>
          </>
        )}

        {/* Verifying Stage */}
        {stage === "verifying" && (
          <div className="text-center py-8">
            <Loader2 className="w-16 h-16 text-primary animate-spin mx-auto mb-4" />
            <h2 className="text-xl font-bold text-foreground mb-2">
              Starting Verification...
            </h2>
            <p className="text-muted-foreground">
              Please follow the instructions in the verification popup
            </p>
          </div>
        )}

        {/* Polling Stage */}
        {stage === "polling" && (
          <div className="text-center py-8">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Clock className="w-8 h-8 text-primary animate-pulse" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">
              Verifying Your Identity
            </h2>
            <p className="text-muted-foreground mb-4">
              Please wait while we verify your documents...
            </p>
            <p className="text-sm text-muted-foreground mb-6">
              Time remaining: <span className="font-mono font-bold text-foreground">{formatTime(countdown)}</span>
            </p>
            
            <Button
              variant="outline"
              onClick={handleManualRefresh}
              disabled={isManuallyRefreshing}
              className="mb-4"
            >
              {isManuallyRefreshing ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              Check Status
            </Button>
          </div>
        )}

        {/* Success Stage */}
        {stage === "success" && (
          <div className="text-center py-8">
            <div className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-success" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">
              Verification Successful!
            </h2>
            <p className="text-muted-foreground">
              Your identity has been verified. Redirecting...
            </p>
          </div>
        )}

        {/* Failed Stage */}
        {stage === "failed" && (
          <div className="text-center py-8">
            <div className="w-16 h-16 rounded-full bg-destructive/20 flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-8 h-8 text-destructive" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">
              Verification Failed
            </h2>
            <p className="text-muted-foreground mb-6">
              We couldn't verify your identity. Please try again.
            </p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={onBack} className="flex-1">
                Cancel
              </Button>
              <Button variant="hero" onClick={handleRetry} className="flex-1">
                Try Again
              </Button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default KYCComplianceVerification;
