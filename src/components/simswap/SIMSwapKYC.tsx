import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { UserCheck, Shield, ArrowRight, Loader2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useMetaMap } from "@/hooks/useMetaMap";

interface SIMSwapKYCProps {
  requestId: string | number;
  phoneNumber: string;
  flowMetadata?: {
    numberEnteredAt?: string;
    otpVerifiedAt?: string;
    otpSkipped?: boolean;
  };
  onComplete: (data: any) => void;
  onBack: () => void;
}

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

const SIMSwapKYC = ({ requestId, phoneNumber, flowMetadata, onComplete, onBack }: SIMSwapKYCProps) => {
  const [idType, setIdType] = useState<"citizen" | "non-citizen">("citizen");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [isManuallyRefreshing, setIsManuallyRefreshing] = useState(false);
  const [pollingTimeLeft, setPollingTimeLeft] = useState(600); // 10 minutes
  const { startVerification, isLoading, isSDKLoaded, clearError } = useMetaMap();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const requestIdRef = useRef<string | number>(requestId);

  useEffect(() => {
    requestIdRef.current = requestId;
  }, [requestId]);

  // Fetch record via edge function (for manual refresh)
  const fetchKycStatus = useCallback(async () => {
    console.log("fetchKycStatus called with:", { requestId: requestIdRef.current });
    try {
      const data = await api.simswapKycStatus(requestIdRef.current);
      return data;
    } catch (err) {
      console.error("Fetch error:", err);
      return null;
    }
  }, []);

  // Process status update from realtime or manual fetch
  const processStatusUpdate = useCallback((statusPayload: any) => {
    if (!statusPayload) return false;
    const status = extractKycStatus(statusPayload);

    if (
      status === "verified" ||
      status === "approved" ||
      status === "kyc_verified" ||
      status === "completed" ||
      status === "success"
    ) {
      setIsPolling(false);
      toast.success("Identity verified successfully!");
      onComplete({ success: true, data: statusPayload });
      return true;
    }

    if (
      status === "rejected" ||
      status === "expired" ||
      status === "failed" ||
      status === "kyc_rejected" ||
      status === "declined"
    ) {
      setIsPolling(false);
      toast.error(statusPayload?.failure_reason || "Verification failed. Please try again.");
      setIsVerifying(false);
      return true;
    }

    return false;
  }, [onComplete]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

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
      toast.error("Unable to check status. Please try again.");
    }
  };

  const startPollingTimer = () => {
    // Set up timeout (10 minutes max)
    const maxSeconds = 10 * 60;
    const startedAt = Date.now();

    const countdownInterval = setInterval(() => {
      const elapsedSeconds = Math.floor((Date.now() - startedAt) / 1000);
      const remaining = Math.max(0, maxSeconds - elapsedSeconds);
      setPollingTimeLeft(remaining);

      if (remaining <= 0) {
        clearInterval(countdownInterval);
        setIsPolling(false);
        toast.error("Verification timed out. Please try again or contact support.");
        setIsVerifying(false);
      }
    }, 1000);

    timeoutRef.current = countdownInterval as unknown as NodeJS.Timeout;
  };

  const handleStartKYC = async () => {
    setIsVerifying(true);
    
    try {
      if (!requestIdRef.current) {
        throw new Error("Missing request id");
      }

      await api.simswapStartKyc(requestIdRef.current, idType === "citizen" ? "omang" : "passport");
      clearError();
      const result = await startVerification(idType === "citizen" ? "omang" : "passport", {
        msisdn: `+267${phoneNumber}`,
        flowType: "sim_swap",
        idTypeSelected: idType,
        kycStartedAt: new Date().toISOString(),
        numberEnteredAt: flowMetadata?.numberEnteredAt || "",
        otpVerifiedAt: flowMetadata?.otpVerifiedAt || "",
        otpSkipped: flowMetadata?.otpSkipped ? "true" : "false",
      });
      if (result.status === "cancelled") {
        setIsVerifying(false);
        toast.info("Verification was cancelled");
        return;
      }
      setIsPolling(true);
      startPollingTimer();
    } catch (error) {
      console.error("KYC Error:", error);
      toast.error("Failed to start verification. Please try again.");
      setIsVerifying(false);
    }
  };

  useEffect(() => {
    if (!isPolling) return;
    const interval = setInterval(async () => {
      const result = await fetchKycStatus();
      if (result) {
        processStatusUpdate(result);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [isPolling, fetchKycStatus, processStatusUpdate]);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="max-w-xl mx-auto"
    >
      <div className="bg-card border border-border rounded-xl p-6">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full gradient-primary flex items-center justify-center mx-auto mb-4">
            <UserCheck className="w-8 h-8 text-primary-foreground" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">
            Identity Verification
          </h2>
          <p className="text-muted-foreground">
            Since you cannot receive OTP, please verify your identity
          </p>
        </div>

        {/* Polling Status - Now with Realtime! */}
        {isPolling && (
          <div className="bg-primary/10 border border-primary/30 rounded-lg p-4 mb-6">
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <Loader2 className="w-5 h-5 text-primary animate-spin" />
                <div>
                  <p className="font-medium text-foreground text-sm">Processing Verification</p>
                  <p className="text-sm text-muted-foreground">
                    Waiting for results... ({Math.floor(pollingTimeLeft / 60)}:{String(pollingTimeLeft % 60).padStart(2, '0')} remaining)
                  </p>
                </div>
              </div>
              <Button 
                variant="secondary" 
                size="sm"
                onClick={handleManualRefresh}
                disabled={isManuallyRefreshing}
                className="gap-2 w-fit"
              >
                {isManuallyRefreshing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Checking...
                  </>
                ) : (
                  <>
                    <Clock className="w-4 h-4" />
                    Check Status
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Verification Info */}
        <div className="bg-muted/50 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-primary mt-0.5" />
            <div>
              <p className="font-medium text-foreground text-sm">Secure Verification</p>
              <p className="text-sm text-muted-foreground mt-1">
                Your identity will be verified using our secure MetaMap verification process. 
                You'll need to scan your ID and take a selfie.
              </p>
            </div>
          </div>
        </div>

        {/* ID Type Selection */}
        <div className="space-y-4 mb-6">
          <Label className="text-sm font-medium text-foreground block">
            Select your ID type
          </Label>
          <RadioGroup
            value={idType}
            onValueChange={(value) => setIdType(value as "citizen" | "non-citizen")}
            className="space-y-3"
            disabled={isVerifying}
          >
            <div className={`flex items-center space-x-3 p-4 rounded-lg border border-border hover:border-primary/30 transition-colors cursor-pointer ${isVerifying ? 'opacity-50' : ''}`}>
              <RadioGroupItem value="citizen" id="citizen" />
              <Label htmlFor="citizen" className="flex-1 cursor-pointer">
                <span className="font-medium text-foreground">Citizen (Omang)</span>
                <p className="text-sm text-muted-foreground mt-0.5">
                  For Botswana citizens with an Omang ID
                </p>
              </Label>
            </div>
            <div className={`flex items-center space-x-3 p-4 rounded-lg border border-border hover:border-primary/30 transition-colors cursor-pointer ${isVerifying ? 'opacity-50' : ''}`}>
              <RadioGroupItem value="non-citizen" id="non-citizen" />
              <Label htmlFor="non-citizen" className="flex-1 cursor-pointer">
                <span className="font-medium text-foreground">Non-Citizen (Passport)</span>
                <p className="text-sm text-muted-foreground mt-0.5">
                  For non-citizens with a valid passport
                </p>
              </Label>
            </div>
          </RadioGroup>
        </div>

        {/* Phone Number Display */}
        <div className="bg-muted rounded-lg p-4 mb-6">
          <p className="text-sm text-muted-foreground mb-1">Number to be swapped</p>
          <p className="font-mono font-semibold text-foreground text-lg">
            +267 {phoneNumber}
          </p>
        </div>

        {/* What to Expect */}
        <div className="space-y-3 mb-6">
          <h4 className="font-medium text-foreground text-sm">What to expect:</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary" />
              Scan the front and back of your ID
            </li>
            <li className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary" />
              Take a live selfie for verification
            </li>
            <li className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary" />
              Process takes approximately 2-3 minutes
            </li>
          </ul>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button variant="outline" onClick={onBack} className="flex-1" disabled={isVerifying}>
            Back
          </Button>
          <Button 
            variant="hero" 
            onClick={handleStartKYC} 
            className="flex-1"
            disabled={isVerifying || isLoading || !isSDKLoaded}
          >
            {isVerifying || isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {isPolling ? "Verifying..." : "Starting..."}
              </>
            ) : (
              <>
                Start Verification
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </div>
    </motion.div>
  );
};

export default SIMSwapKYC;
