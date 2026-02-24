import { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { 
  Camera, 
  CreditCard, 
  CheckCircle2, 
  Loader2,
  AlertCircle,
  Shield,
  Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useMetaMap } from "@/hooks/useMetaMap";

interface KYCVerificationProps {
  selectedNumber?: string;
  registrationData?: {
    plotNumber?: string;
    ward?: string;
    village?: string;
    city?: string;
    postalAddress?: string;
    nextOfKinName?: string;
    nextOfKinRelation?: string;
    nextOfKinPhone?: string;
    email?: string;
  };
  requestId: string | number;
  onComplete: (data: any) => void;
  onBack: () => void;
}

type VerificationStep = "intro" | "verifying" | "polling" | "complete";
type WebhookStatus = "pending" | "verified" | "rejected" | "manual_review" | "timeout";

const normalizeKycStatus = (value: unknown): string => {
  if (typeof value !== "string") return "";
  return value.trim().toLowerCase();
};

const extractKycStatus = (statusPayload: any): string => {
  // Prefer KYC-specific keys before generic request-level status.
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

const KYCVerification = ({ selectedNumber, registrationData, requestId, onComplete, onBack }: KYCVerificationProps) => {
  const navigate = useNavigate();
  const [step, setStep] = useState<VerificationStep>("intro");
  const [webhookStatus, setWebhookStatus] = useState<WebhookStatus>("pending");
  const [documentType, setDocumentType] = useState<"omang" | "passport" | null>(null);
  const [verificationData, setVerificationData] = useState<any>(null);
  const [pollingTimeLeft, setPollingTimeLeft] = useState(600); // 10 minutes for timeout display
  const [error, setError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [isManuallyRefreshing, setIsManuallyRefreshing] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isFetchingStatusRef = useRef(false);
  const isTerminalStateRef = useRef(false);
  const requestIdRef = useRef<string | number>(requestId);
  const { startVerification, isLoading, isSDKLoaded, error: metaError, clearError, cleanupMetaMapUI } = useMetaMap();

  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    requestIdRef.current = requestId;
  }, [requestId]);

  // Fetch record via edge function (for manual refresh or initial check)
  const fetchKycStatus = useCallback(async () => {
    if (isFetchingStatusRef.current) {
      return null;
    }

    isFetchingStatusRef.current = true;
    console.log("fetchKycStatus called with:", { requestId: requestIdRef.current });
    try {
      const data = await api.esimKycStatus(requestIdRef.current);
      return data;
    } catch (err) {
      console.error("Fetch error:", err);
      return null;
    } finally {
      isFetchingStatusRef.current = false;
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
      isTerminalStateRef.current = true;
      stopPolling();
      setWebhookStatus("verified");
      setVerificationData(statusPayload);
      setStep("complete");
      toast.success("KYC Compliance Verified!");
      return true;
    }

    if (
      status === "rejected" ||
      status === "failed" ||
      status === "kyc_rejected" ||
      status === "declined" ||
      status === "expired"
    ) {
      isTerminalStateRef.current = true;
      stopPolling();
      setWebhookStatus("rejected");
      setVerificationData(statusPayload);
      setStep("complete");
      toast.error("KYC verification was rejected");
      return true;
    }

    if (
      status === "manual_review" ||
      status === "review_required" ||
      status === "requires_review" ||
      status === "pending_review" ||
      (statusPayload?.metadata && (statusPayload?.metadata as any)?.reviewNeeded)
    ) {
      isTerminalStateRef.current = true;
      stopPolling();
      setWebhookStatus("manual_review");
      setStep("complete");
      toast.warning("Your verification requires manual review");
      return true;
    }

    return false;
  }, [stopPolling]);

  // Handle timeout redirect
  useEffect(() => {
    if (webhookStatus === "rejected" || webhookStatus === "manual_review" || webhookStatus === "timeout") {
      const timer = setTimeout(() => {
        navigate("/");
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [webhookStatus, navigate]);

  useEffect(() => {
    return () => {
      cleanupMetaMapUI();
    };
  }, [cleanupMetaMapUI]);

  // Cleanup realtime subscription and timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      stopPolling();
    };
  }, [stopPolling]);

  // Polling effect
  useEffect(() => {
    if (step !== "polling") return;
    // Set up timeout (10 minutes max)
    const maxSeconds = 10 * 60;
    const startedAt = Date.now();

    // Update countdown timer
    const countdownInterval = setInterval(() => {
      const elapsedSeconds = Math.floor((Date.now() - startedAt) / 1000);
      const remaining = Math.max(0, maxSeconds - elapsedSeconds);
      setPollingTimeLeft(remaining);

      if (remaining <= 0) {
        clearInterval(countdownInterval);
        setWebhookStatus("timeout");
        setStep("complete");
        toast.error("Verification timed out. Please contact support.");
      }
    }, 1000);

    timeoutRef.current = countdownInterval as unknown as NodeJS.Timeout;

    return () => {
      clearInterval(countdownInterval);
    };
  }, [step]);

  useEffect(() => {
    if (step !== "polling" || isTerminalStateRef.current) return;

    stopPolling();
    const interval = setInterval(async () => {
      if (isTerminalStateRef.current) {
        stopPolling();
        return;
      }
      const result = await fetchKycStatus();
      if (result) {
        processStatusUpdate(result);
      }
    }, 3000);
    pollingIntervalRef.current = interval as unknown as NodeJS.Timeout;

    return () => {
      clearInterval(interval);
      if (pollingIntervalRef.current === (interval as unknown as NodeJS.Timeout)) {
        pollingIntervalRef.current = null;
      }
    };
  }, [step, fetchKycStatus, processStatusUpdate, stopPolling]);

  const handleStartVerification = async () => {
    if (!documentType) {
      toast.error("Please select a document type");
      return;
    }

    setError(null);
    clearError();
    isTerminalStateRef.current = false;
    stopPolling();
    setStep("verifying");
    setIsStarting(true);

    try {
      if (!requestIdRef.current) {
        throw new Error("Missing request id");
      }
      await api.esimStartKyc(requestIdRef.current, documentType);
      const result = await startVerification(documentType, {
        timestamp: new Date().toISOString(),
        msisdn: selectedNumber ? `+267 ${selectedNumber}` : "",
        selectedNumber: selectedNumber || "",
        plotNumber: registrationData?.plotNumber || "",
        ward: registrationData?.ward || "",
        village: registrationData?.village || "",
        city: registrationData?.city || "",
        postalAddress: registrationData?.postalAddress || "",
        nextOfKinName: registrationData?.nextOfKinName || "",
        nextOfKinRelation: registrationData?.nextOfKinRelation || "",
        nextOfKinPhone: registrationData?.nextOfKinPhone || "",
        email: registrationData?.email || "",
      });
      if (result.status === "cancelled") {
        setStep("intro");
        toast.info("Verification was cancelled");
        return;
      }
      const immediateCheck = await fetchKycStatus();
      if (immediateCheck && processStatusUpdate(immediateCheck)) {
        return;
      }
      setStep("polling");
      toast.info("Verification submitted. Waiting for results...");
    } catch (err) {
      console.error("KYC start failed:", err);
      isTerminalStateRef.current = true;
      stopPolling();
      setError("Failed to start verification");
      setWebhookStatus("rejected");
      setStep("complete");
      toast.error("Verification failed. Please try again.");
    } finally {
      setIsStarting(false);
    }
  };

  const handleComplete = () => {
    onComplete({
      verified: true,
      documentType: documentType === "omang" ? "Omang (National ID)" : "Passport",
      verificationId: verificationData?.verification_id,
      identityId: verificationData?.identity_id,
      recordId: verificationData?.id,
      data: verificationData // Pass the full KYC record
    });
  };

  const handleManualRefresh = async () => {
    console.log("handleManualRefresh called", { requestId: requestIdRef.current });
    
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

  const handleRetry = () => {
    isTerminalStateRef.current = false;
    stopPolling();
    setStep("intro");
    setWebhookStatus("pending");
    setVerificationData(null);
    setPollingTimeLeft(600);
    setError(null);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="max-w-2xl mx-auto"
    >
      {/* Progress Indicator */}
      <div className="flex items-center justify-center gap-2 mb-8">
        {["Select", "Verify", "Result"].map((label, idx) => (
          <div key={label} className="flex items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                (idx === 0 && step !== "intro") ||
                (idx === 1 && (step === "polling" || step === "complete")) ||
                (idx === 2 && step === "complete")
                  ? "gradient-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {idx + 1}
            </div>
            <span className="ml-2 text-sm text-muted-foreground hidden sm:inline">{label}</span>
            {idx < 2 && <div className="w-8 sm:w-12 h-0.5 bg-border mx-2" />}
          </div>
        ))}
      </div>

      {/* Intro Step */}
      {step === "intro" && (
        <div className="bg-card border border-border rounded-xl p-8 text-center">
          <div className="w-20 h-20 rounded-full gradient-primary flex items-center justify-center mx-auto mb-6">
            <Shield className="w-10 h-10 text-primary-foreground" />
          </div>
          <h3 className="text-2xl font-bold text-foreground mb-3">Identity Verification</h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            We need to verify your identity to comply with regulatory requirements. 
            This secure process takes only a few minutes.
          </p>

          <div className="max-w-xs mx-auto mb-8 space-y-3">
            <p className="text-sm font-medium text-foreground mb-3">Select document type:</p>
            <label 
              className={`flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                documentType === "omang" 
                  ? "border-primary bg-primary/5" 
                  : "border-border bg-muted hover:border-primary/50"
              }`}
            >
              <input
                type="radio"
                name="documentType"
                value="omang"
                checked={documentType === "omang"}
                onChange={() => setDocumentType("omang")}
                className="w-4 h-4 text-primary accent-primary"
              />
              <CreditCard className="w-5 h-5 text-primary" />
              <div className="text-left">
                <span className="text-sm text-foreground font-medium block">Omang (National ID)</span>
                <span className="text-xs text-muted-foreground">For Botswana citizens</span>
              </div>
            </label>
            <label 
              className={`flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                documentType === "passport" 
                  ? "border-primary bg-primary/5" 
                  : "border-border bg-muted hover:border-primary/50"
              }`}
            >
              <input
                type="radio"
                name="documentType"
                value="passport"
                checked={documentType === "passport"}
                onChange={() => setDocumentType("passport")}
                className="w-4 h-4 text-primary accent-primary"
              />
              <CreditCard className="w-5 h-5 text-primary" />
              <div className="text-left">
                <span className="text-sm text-foreground font-medium block">Passport</span>
                <span className="text-xs text-muted-foreground">For non-citizens</span>
              </div>
            </label>
          </div>

          {(error || metaError) && (
            <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 mb-6 max-w-md mx-auto">
              <p className="text-sm text-destructive">{error || metaError}</p>
            </div>
          )}

          <div className="bg-accent/10 border border-accent/30 rounded-lg p-4 mb-6 max-w-md mx-auto">
            <p className="text-sm text-muted-foreground">
              <strong className="text-foreground">Powered by MetaMap</strong> - Your data is encrypted 
              and processed securely.
            </p>
          </div>

          {!isSDKLoaded && (
            <div className="flex items-center justify-center gap-2 mb-4">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Loading verification system...</span>
            </div>
          )}

          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={onBack}>
              Back
            </Button>
            <Button 
              variant={documentType ? "default" : "outline"}
              onClick={handleStartVerification}
              disabled={!documentType || isStarting || isLoading || !isSDKLoaded}
              className={!documentType ? "opacity-50 cursor-not-allowed" : ""}
            >
              {isStarting || isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Starting...
                </>
              ) : (
                <>
                  <Camera className="w-4 h-4 mr-2" />
                  Start Verification
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Verifying Step */}
      {step === "verifying" && (
        <div className="bg-card border border-border rounded-xl p-8 text-center">
          <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-6">
            <Loader2 className="w-10 h-10 text-primary animate-spin" />
          </div>
          <h3 className="text-xl font-bold text-foreground mb-2">Verification in Progress</h3>
          <p className="text-muted-foreground text-sm mb-8">
            Please complete the verification in the MetaMap window...
          </p>
          <div className="space-y-3 max-w-xs mx-auto">
            {["Document capture", "OCR extraction", "Facial matching", "Liveness check"].map((item) => (
              <div key={item} className="flex items-center gap-3 text-sm">
                <Loader2 className="w-4 h-4 text-primary animate-spin" />
                <span className="text-muted-foreground">{item}</span>
              </div>
            ))}
          </div>
          <div className="mt-8">
            <Button variant="outline" onClick={handleRetry}>
              Cancel Verification
            </Button>
          </div>
        </div>
      )}

      {/* Polling Step - Waiting for webhook */}
      {step === "polling" && (
        <div className="bg-card border border-border rounded-xl p-8 text-center">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <Clock className="w-10 h-10 text-primary animate-pulse" />
          </div>
          <h3 className="text-xl font-bold text-foreground mb-2">Processing Verification</h3>
          <p className="text-muted-foreground text-sm mb-6">
            Your documents are being verified. Please wait...
          </p>
          <div className="flex items-center justify-center gap-2 mb-6">
            <Loader2 className="w-5 h-5 text-primary animate-spin" />
            <span className="text-sm text-muted-foreground">
              Checking results... ({pollingTimeLeft}s remaining)
            </span>
          </div>
          <div className="w-full max-w-xs mx-auto bg-muted rounded-full h-2 overflow-hidden mb-6">
            <motion.div 
              className="h-full bg-primary"
              initial={{ width: "100%" }}
              animate={{ width: `${(pollingTimeLeft / 600) * 100}%` }}
              transition={{ duration: 1 }}
            />
          </div>
          <Button 
            variant="secondary" 
            onClick={handleManualRefresh}
            disabled={isManuallyRefreshing}
            className="gap-2"
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
      )}

      {/* Complete Step */}
      {step === "complete" && (
        <div className="bg-card border border-border rounded-xl p-8 text-center">
          {webhookStatus === "verified" ? (
            <>
              <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-10 h-10 text-success" />
              </div>
              <h3 className="text-xl font-bold text-success mb-2">KYC Compliance Verified</h3>
              <p className="text-muted-foreground text-sm mb-6">
                Your identity has been successfully verified. We now proceed to create your eSIM.
              </p>
              <Button variant="default" onClick={handleComplete}>
                Continue to Registration
              </Button>
            </>
          ) : webhookStatus === "rejected" || webhookStatus === "manual_review" ? (
            <>
              <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-6">
                <AlertCircle className="w-10 h-10 text-destructive" />
              </div>
              <h3 className="text-xl font-bold text-destructive mb-2">KYC Compliance Experienced Issues</h3>
              <p className="text-muted-foreground text-sm mb-4">
                {webhookStatus === "rejected" 
                  ? "Your verification was not approved. Please contact support for assistance."
                  : "Your verification requires manual review. Please contact support for assistance."}
              </p>
              <div className="bg-muted/50 border border-border rounded-lg p-4 mb-6 max-w-md mx-auto">
                <p className="text-sm text-muted-foreground">
                  <strong className="text-foreground">Contact Support:</strong><br />
                  Email: support@btc.bw<br />
                  Phone: +267 0800 123 456
                </p>
              </div>
              <p className="text-xs text-muted-foreground mb-4">
                Redirecting to home page in 10 seconds...
              </p>
              <Button variant="outline" onClick={() => navigate("/")}>
                Return to Home
              </Button>
            </>
          ) : webhookStatus === "timeout" ? (
            <>
              <div className="w-20 h-20 rounded-full bg-warning/10 flex items-center justify-center mx-auto mb-6">
                <Clock className="w-10 h-10 text-warning" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-2">Verification Timeout</h3>
              <p className="text-muted-foreground text-sm mb-4">
                We couldn't receive the verification results in time. Please contact support.
              </p>
              <div className="bg-muted/50 border border-border rounded-lg p-4 mb-6 max-w-md mx-auto">
                <p className="text-sm text-muted-foreground">
                  <strong className="text-foreground">Contact Support:</strong><br />
                  Email: support@btc.bw<br />
                  Phone: +267 0800 123 456
                </p>
              </div>
              <p className="text-xs text-muted-foreground mb-4">
                Redirecting to home page in 10 seconds...
              </p>
              <Button variant="outline" onClick={() => navigate("/")}>
                Return to Home
              </Button>
            </>
          ) : (
            <>
              <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-6">
                <AlertCircle className="w-10 h-10 text-destructive" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-2">Verification Failed</h3>
              <p className="text-muted-foreground text-sm mb-6">
                We couldn't verify your identity. Please try again or contact support.
              </p>
              <div className="flex gap-3 justify-center">
                <Button variant="outline" onClick={onBack}>
                  Exit
                </Button>
                <Button variant="default" onClick={handleRetry}>
                  Try Again
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </motion.div>
  );
};

export default KYCVerification;
