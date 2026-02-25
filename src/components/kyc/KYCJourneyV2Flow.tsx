import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Check, ArrowRight, Shield, Loader2, RefreshCw, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { useMetaMap } from "@/hooks/useMetaMap";

type Step = "terms" | "msisdn" | "otp" | "profile" | "metamap" | "complete";
type FrontendState = "pending" | "needs_action" | "verified" | "failed";

interface KYCJourneyV2FlowProps {
  onClose: () => void;
}

const SOURCE_OF_INCOME = "SALARY";

const steps = [
  { id: "terms", label: "Terms" },
  { id: "msisdn", label: "MSISDN" },
  { id: "otp", label: "OTP" },
  { id: "profile", label: "Profile" },
  { id: "metamap", label: "MetaMap" },
  { id: "complete", label: "Complete" },
];

const extractRequestId = (response: any) =>
  response?.request_id ??
  response?.requestId ??
  response?.id ??
  response?.data?.request_id ??
  response?.data?.requestId ??
  response?.data?.id ??
  response?.request?.request_id ??
  response?.request?.id;

const detectRequiresMetamap = (payload: any): boolean | null => {
  if (!payload) return null;

  const hasLookupOrBocraIssue = Boolean(
    payload?.subscriber_lookup_issue === true ||
    payload?.subscriberLookupIssue === true ||
    payload?.subscriber_lookup_ok === false ||
    payload?.subscriberLookupOk === false ||
    payload?.subscriber_found === false ||
    payload?.subscriberFound === false ||
    payload?.bocra_issue === true ||
    payload?.bocraIssue === true ||
    payload?.bocra_ok === false ||
    payload?.bocraOk === false ||
    payload?.compliance?.initial_compliant === false ||
    payload?.compliance?.final_compliant === false ||
    payload?.data?.subscriber_lookup_issue === true ||
    payload?.data?.subscriber_lookup_ok === false ||
    payload?.data?.subscriber_found === false ||
    payload?.data?.bocra_issue === true ||
    payload?.data?.bocra_ok === false ||
    payload?.data?.compliance?.initial_compliant === false ||
    payload?.data?.compliance?.final_compliant === false
  );
  if (hasLookupOrBocraIssue) return true;

  const direct =
    payload?.requires_metamap ??
    payload?.requiresMetaMap ??
    payload?.metamap_required ??
    payload?.metamapRequired ??
    payload?.data?.requires_metamap ??
    payload?.data?.metamap_required;
  if (typeof direct === "boolean") return direct;

  const compliant =
    payload?.compliant ??
    payload?.is_compliant ??
    payload?.compliance?.initial_compliant ??
    payload?.data?.compliant ??
    payload?.data?.compliance?.initial_compliant;
  if (typeof compliant === "boolean") return !compliant;

  const status = String(
    payload?.kyc_status ?? payload?.status ?? payload?.data?.kyc_status ?? payload?.data?.status ?? ""
  )
    .trim()
    .toLowerCase();
  if (!status) return null;
  if (["non_compliant", "failed", "rejected", "needs_metamap", "pending_metamap"].includes(status)) return true;
  if (["complete", "compliant", "verified", "success"].includes(status)) return false;

  return null;
};

const KYCJourneyV2Flow = ({ onClose }: KYCJourneyV2FlowProps) => {
  const [currentStep, setCurrentStep] = useState<Step>("terms");
  const [frontendState, setFrontendState] = useState<FrontendState>("pending");
  const [requestId, setRequestId] = useState<string | number | null>(null);
  const [msisdn, setMsisdn] = useState("");
  const [smegaOptIn, setSmegaOptIn] = useState<"yes" | "no">("yes");
  const [challengeId, setChallengeId] = useState<string | number | null>(null);
  const [debugCode, setDebugCode] = useState<string | number | null>(null);
  const [requiresMetamap, setRequiresMetamap] = useState<boolean | null>(null);
  const [otp, setOtp] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [metaMapDocType, setMetaMapDocType] = useState<"omang" | "passport">("omang");
  const [metaMapStatus, setMetaMapStatus] = useState<"idle" | "verifying" | "waiting" | "failed">("idle");
  const [metaMapError, setMetaMapError] = useState<string | null>(null);
  const [finalResult, setFinalResult] = useState<any>(null);
  const processingMetaMapResultRef = useRef(false);
  const { startVerification, isLoading: isMetaMapLoading, isSDKLoaded, clearError, lastResult } = useMetaMap();
  const [profile, setProfile] = useState({
    first_name: "",
    last_name: "",
    id_type: "NATIONAL_ID",
    id_number: "",
    nationality: "",
    plot_number: "",
    ward: "",
    village: "",
    city: "",
    postal_address: "",
  });

  const currentStepIndex = steps.findIndex((s) => s.id === currentStep);

  const normalizedMsisdn = msisdn.replace(/\D/g, "");
  const fullMsisdn = normalizedMsisdn.startsWith("267") ? normalizedMsisdn : `267${normalizedMsisdn}`;
  const smegaSelected = smegaOptIn === "yes";

  const startAndSubmitMsisdn = async () => {
    if (!normalizedMsisdn) {
      toast.error("Enter mobile number");
      return;
    }
    setIsBusy(true);
    try {
      const start = await api.kycJourneyStart({
        smega_selected: smegaSelected,
        source_of_income: SOURCE_OF_INCOME,
      });
      const id = extractRequestId(start);
      if (!id) throw new Error("Missing request_id");
      setRequestId(id);

      const msisdnResponse = await api.kycJourneyMsisdn(id, {
        terms_accepted: true,
        msisdn: fullMsisdn,
        smega_selected: smegaSelected,
        source_of_income: SOURCE_OF_INCOME,
      });
      const msisdnRequires = detectRequiresMetamap(msisdnResponse);
      if (msisdnRequires !== null) {
        setRequiresMetamap(msisdnRequires);
      }
      setFrontendState("pending");
      setCurrentStep("otp");
    } catch (error) {
      console.error("KYC V2 start/msisdn failed:", error);
      setFrontendState("failed");
      toast.error("Failed to start KYC Journey V2");
    } finally {
      setIsBusy(false);
    }
  };

  const sendOtp = async () => {
    if (!requestId) return;
    setIsBusy(true);
    try {
      const send: any = await api.kycJourneyOtpSend(requestId);
      const rawChallenge = send?.challenge_id ?? send?.challengeId ?? send?.data?.challenge_id ?? send?.data?.challengeId ?? null;
      setChallengeId(rawChallenge);
      setDebugCode(send?.debug_code ?? send?.debugCode ?? send?.data?.debug_code ?? send?.data?.debugCode ?? null);
      toast.success("OTP sent");
    } catch (error) {
      console.error("OTP send failed:", error);
      setFrontendState("failed");
      toast.error("Failed to send OTP");
    } finally {
      setIsBusy(false);
    }
  };

  const verifyOtp = async () => {
    if (!requestId || !challengeId) {
      toast.error("Send OTP first");
      return;
    }
    if (otp.length < 4) {
      toast.error("Enter OTP");
      return;
    }
    setIsBusy(true);
    try {
      const verifyResponse = await api.kycJourneyOtpVerify(requestId, { challenge_id: challengeId as any, code: otp });
      const otpRequires = detectRequiresMetamap(verifyResponse);
      if (otpRequires !== null) {
        setRequiresMetamap(otpRequires);
      }
      setFrontendState("pending");
      setCurrentStep("profile");
      toast.success("OTP verified");
    } catch (error) {
      console.error("OTP verify failed:", error);
      setFrontendState("needs_action");
      toast.error("OTP invalid/expired");
    } finally {
      setIsBusy(false);
    }
  };

  const submitProfile = async () => {
    if (!requestId) return;
    setIsBusy(true);
    try {
      const profileResponse = await api.kycJourneyProfile(requestId, profile as any);
      const profileRequires = detectRequiresMetamap(profileResponse);
      const finalRequires = profileRequires !== null ? profileRequires : requiresMetamap;
      setRequiresMetamap(finalRequires ?? true);

      if (finalRequires === false) {
        await finalizeJourney(false);
        toast.success("KYC finalized without MetaMap");
      } else {
        setCurrentStep("metamap");
      }
    } catch (error) {
      console.error("Profile submit failed:", error);
      setFrontendState("needs_action");
      toast.error("Profile submission failed");
    } finally {
      setIsBusy(false);
    }
  };

  const startMetaMapVerification = async () => {
    if (!requestId) return;
    setMetaMapError(null);
    setMetaMapStatus("verifying");
    try {
      clearError();
      const result = await startVerification(metaMapDocType, {
        msisdn: fullMsisdn,
        request_id: String(requestId),
        flow: "kyc_journey_v2",
        step: "metamap_required",
      });
      if (result.status === "cancelled") {
        setMetaMapStatus("idle");
        setMetaMapError("MetaMap verification was cancelled.");
        return;
      }
      setMetaMapStatus("waiting");
      toast.info("MetaMap kyc verification starting");
    } catch (error) {
      console.error("MetaMap start failed:", error);
      setMetaMapStatus("failed");
      setMetaMapError("Failed to start MetaMap verification.");
    }
  };

  const finalizeJourney = async (afterMetamap: boolean) => {
    if (!requestId) return;
    const complete = await api.kycJourneyComplete(requestId, { apply_rating_status: false });
    const payload = complete?.data ?? complete ?? {};
    setFinalResult(payload);
    const status = String(payload?.kyc_status ?? "").toLowerCase();

    if (status === "complete") {
      setFrontendState("verified");
      setCurrentStep("complete");
      return;
    }

    setFrontendState("needs_action");
    if (afterMetamap) {
      setCurrentStep("complete");
    } else {
      setCurrentStep("metamap");
      toast.warning("KYC needs action. MetaMap verification is now required.");
    }
  };

  useEffect(() => {
    const processMetaMapResult = async () => {
      if (currentStep !== "metamap" || !lastResult || processingMetaMapResultRef.current) return;
      processingMetaMapResultRef.current = true;
      try {
        if (lastResult.status === "cancelled") {
          setMetaMapStatus("idle");
          setMetaMapError("MetaMap verification was cancelled. Please try again.");
          return;
        }
        if (lastResult.status === "failed") {
          setMetaMapStatus("failed");
          setMetaMapError("MetaMap verification failed.");
          setFrontendState("needs_action");
          return;
        }
        const verificationId =
          lastResult.verificationId ??
          lastResult.data?.verificationId ??
          lastResult.data?.verification_id ??
          null;
        const sessionId =
          lastResult.sessionId ??
          lastResult.data?.sessionId ??
          lastResult.data?.session_id ??
          null;

        if (!verificationId || !sessionId) {
          setMetaMapStatus("failed");
          setMetaMapError("MetaMap result missing session/verification id.");
          setFrontendState("needs_action");
          return;
        }

        await api.kycJourneyMetamapGate(requestId as string | number, {
          verified: true,
          session_id: String(sessionId),
          verification_id: String(verificationId),
        });
        setMetaMapStatus("idle");
        await finalizeJourney(true);
      } catch (error) {
        console.error("MetaMap finalize failed:", error);
        setMetaMapStatus("failed");
        setMetaMapError("Failed to finalize MetaMap verification.");
        setFrontendState("failed");
      } finally {
        processingMetaMapResultRef.current = false;
      }
    };
    processMetaMapResult();
  }, [currentStep, lastResult]);

  const kycStatus = String(finalResult?.kyc_status ?? "").toLowerCase();
  const smegaStatus = String(finalResult?.smega_status ?? "skipped");

  return (
    <div className="min-h-screen bg-background pt-20 pb-10">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto mb-8">
          <Button variant="ghost" onClick={onClose} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">KYC Journey V2</h1>
          <p className="text-muted-foreground">
            State: <span className="font-medium text-foreground">{frontendState}</span>
          </p>
        </div>

        <div className="max-w-4xl mx-auto mb-10 overflow-x-auto">
          <div className="flex items-center justify-between min-w-max px-4">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold ${
                      index < currentStepIndex
                        ? "gradient-primary text-primary-foreground"
                        : index === currentStepIndex
                        ? "border-2 border-primary text-primary bg-primary/10"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {index < currentStepIndex ? <Check className="w-4 h-4" /> : index + 1}
                  </div>
                  <span className={`text-xs mt-2 ${index <= currentStepIndex ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                    {step.label}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div className={`w-10 sm:w-16 h-0.5 mx-2 ${index < currentStepIndex ? "bg-primary" : "bg-border"}`} />
                )}
              </div>
            ))}
          </div>
        </div>

        <AnimatePresence mode="wait">
          {currentStep === "terms" && (
            <motion.div key="terms" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-2xl mx-auto bg-card border rounded-xl p-6">
              <h3 className="text-xl font-bold mb-2">Step 1: Terms</h3>
              <p className="text-muted-foreground mb-6">Accept terms and continue to MSISDN + SMEGA opt-in.</p>
              <Button variant="hero" onClick={() => setCurrentStep("msisdn")}>
                Continue
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </motion.div>
          )}

          {currentStep === "msisdn" && (
            <motion.div key="msisdn" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-2xl mx-auto bg-card border rounded-xl p-6">
              <h3 className="text-xl font-bold mb-4">Step 2: MSISDN + SMEGA Opt-In</h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="msisdn">MSISDN</Label>
                  <Input id="msisdn" value={msisdn} onChange={(e) => setMsisdn(e.target.value)} placeholder="26773717137 or 73717137" />
                </div>
                <div>
                  <Label className="mb-2 block">Do you also want SMEGA Registration?</Label>
                  <RadioGroup value={smegaOptIn} onValueChange={(v) => setSmegaOptIn(v as "yes" | "no")} className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="yes" id="smega-yes" />
                      <Label htmlFor="smega-yes">Yes</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="no" id="smega-no" />
                      <Label htmlFor="smega-no">No</Label>
                    </div>
                  </RadioGroup>
                </div>
                <Button variant="hero" onClick={startAndSubmitMsisdn} disabled={isBusy}>
                  {isBusy ? "Submitting..." : "Start Journey"}
                </Button>
              </div>
            </motion.div>
          )}

          {currentStep === "otp" && (
            <motion.div key="otp" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-2xl mx-auto bg-card border rounded-xl p-6">
              <h3 className="text-xl font-bold mb-4">Step 3: OTP</h3>
              <div className="space-y-4">
                <Button variant="outline" onClick={sendOtp} disabled={isBusy}>
                  {isBusy ? "Sending..." : "Send OTP"}
                </Button>
                <div>
                  <Label>Challenge ID</Label>
                  <Input value={challengeId ? String(challengeId) : ""} readOnly />
                </div>
                {debugCode ? (
                  <div>
                    <Label>Debug Code (local/testing)</Label>
                    <Input value={String(debugCode)} readOnly />
                  </div>
                ) : null}
                <div>
                  <Label htmlFor="otp">OTP Code</Label>
                  <Input id="otp" value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="123456" />
                </div>
                <Button variant="hero" onClick={verifyOtp} disabled={isBusy}>
                  {isBusy ? "Verifying..." : "Verify OTP"}
                </Button>
              </div>
            </motion.div>
          )}

          {currentStep === "profile" && (
            <motion.div key="profile" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-3xl mx-auto bg-card border rounded-xl p-6">
              <h3 className="text-xl font-bold mb-2">Steps 4-7: C1/Compliance Path</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Backend runs C1 token+retrieve, BOCRA checks, compliant/non-compliant path, and C1 updates internally.
              </p>
              <div className="mb-4 rounded-lg border border-border bg-muted/40 p-3 text-sm">
                MetaMap path:
                {" "}
                <span className="font-semibold">
                  {requiresMetamap === null
                    ? "deciding after compliance checks"
                    : requiresMetamap
                    ? "required (subscriber/BOCRA issues or non-compliant path)"
                    : "not required (compliant path)"}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><Label>First Name</Label><Input value={profile.first_name} onChange={(e) => setProfile((p) => ({ ...p, first_name: e.target.value }))} /></div>
                <div><Label>Last Name</Label><Input value={profile.last_name} onChange={(e) => setProfile((p) => ({ ...p, last_name: e.target.value }))} /></div>
                <div>
                  <Label>ID Type</Label>
                  <Select value={profile.id_type} onValueChange={(value) => setProfile((p) => ({ ...p, id_type: value }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NATIONAL_ID">NATIONAL_ID</SelectItem>
                      <SelectItem value="PASSPORT">PASSPORT</SelectItem>
                      <SelectItem value="DRIVER_LICENSE">DRIVER_LICENSE</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>ID Number</Label><Input value={profile.id_number} onChange={(e) => setProfile((p) => ({ ...p, id_number: e.target.value }))} /></div>
                <div><Label>Nationality</Label><Input value={profile.nationality} onChange={(e) => setProfile((p) => ({ ...p, nationality: e.target.value }))} /></div>
                <div><Label>Plot Number</Label><Input value={profile.plot_number} onChange={(e) => setProfile((p) => ({ ...p, plot_number: e.target.value }))} /></div>
                <div><Label>Ward</Label><Input value={profile.ward} onChange={(e) => setProfile((p) => ({ ...p, ward: e.target.value }))} /></div>
                <div><Label>Village</Label><Input value={profile.village} onChange={(e) => setProfile((p) => ({ ...p, village: e.target.value }))} /></div>
                <div><Label>City</Label><Input value={profile.city} onChange={(e) => setProfile((p) => ({ ...p, city: e.target.value }))} /></div>
                <div className="md:col-span-2"><Label>Postal Address</Label><Textarea value={profile.postal_address} onChange={(e) => setProfile((p) => ({ ...p, postal_address: e.target.value }))} /></div>
              </div>
              <Button className="mt-5" variant="hero" onClick={submitProfile} disabled={isBusy}>
                {isBusy ? "Submitting..." : "Continue"}
              </Button>
            </motion.div>
          )}

          {currentStep === "metamap" && (
            <motion.div key="metamap" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-2xl mx-auto bg-card border rounded-xl p-6">
              <h3 className="text-xl font-bold mb-2">Steps 8-9: SMEGA Branch + Finalize</h3>
              <p className="text-sm text-muted-foreground mb-4">
                MetaMap is required for non-compliant path. If SMEGA is selected, backend runs API 13-14 after BOCRA/C1 updates; then API 15 logs transaction.
              </p>
              <div className="space-y-4">
                <div className="rounded-lg border border-border bg-muted/40 p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <Shield className="w-5 h-5 text-primary" />
                    <p className="font-medium">MetaMap Verification Required</p>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    KYC or BOCRA checks found issues. Please complete MetaMap verification to continue.
                  </p>
                  <Label className="mb-2 block">Select ID type</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      type="button"
                      variant={metaMapDocType === "omang" ? "hero" : "outline"}
                      onClick={() => setMetaMapDocType("omang")}
                      disabled={metaMapStatus === "verifying" || isMetaMapLoading}
                    >
                      Omang
                    </Button>
                    <Button
                      type="button"
                      variant={metaMapDocType === "passport" ? "hero" : "outline"}
                      onClick={() => setMetaMapDocType("passport")}
                      disabled={metaMapStatus === "verifying" || isMetaMapLoading}
                    >
                      Passport
                    </Button>
                  </div>
                </div>

                {!isSDKLoaded && (
                  <p className="text-sm text-muted-foreground">Loading MetaMap SDK...</p>
                )}

                {metaMapError ? (
                  <div className="flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                    <XCircle className="w-4 h-4" />
                    <span>{metaMapError}</span>
                  </div>
                ) : null}

                {metaMapStatus === "waiting" ? (
                  <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
                    Waiting for MetaMap completion...
                  </div>
                ) : null}

                <Button variant="hero" onClick={startMetaMapVerification} disabled={metaMapStatus === "verifying" || isMetaMapLoading || !isSDKLoaded}>
                  {metaMapStatus === "verifying" || isMetaMapLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Starting MetaMap...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Start MetaMap Verification
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          )}

          {currentStep === "complete" && (
            <motion.div key="complete" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-2xl mx-auto bg-card border rounded-xl p-6">
              <h3 className="text-2xl font-bold mb-4">Final Status</h3>
              <div className="space-y-2 text-sm mb-6">
                <p>kyc_status: <span className="font-medium">{String(finalResult?.kyc_status ?? "n/a")}</span></p>
                <p>compliance.initial_compliant: <span className="font-medium">{String(finalResult?.compliance?.initial_compliant ?? "n/a")}</span></p>
                <p>compliance.final_compliant: <span className="font-medium">{String(finalResult?.compliance?.final_compliant ?? "n/a")}</span></p>
                <p>smega_status: <span className="font-medium">{String(finalResult?.smega_status ?? "skipped")}</span></p>
                <p>external_log_ok: <span className="font-medium">{String(finalResult?.external_log_ok ?? "n/a")}</span></p>
                <p>c1_updates_ok: <span className="font-medium">{String(finalResult?.c1_updates_ok ?? "n/a")}</span></p>
                <p>c1_lifecycle_ok: <span className="font-medium">{String(finalResult?.c1_lifecycle_ok ?? "n/a")}</span></p>
                <p>c1_rating_status_ok: <span className="font-medium">{String(finalResult?.c1_rating_status_ok ?? "n/a")}</span></p>
              </div>

              <div className="bg-muted/50 rounded-lg p-4 mb-6">
                <p className="font-semibold text-foreground">
                  {kycStatus === "complete" ? "KYC Verification Complete" : "KYC Verification Needs Action"}
                </p>
                {smegaSelected && (smegaStatus === "registered" || smegaStatus === "already_exists") ? (
                  <p className="font-semibold text-foreground mt-1">SMEGA Registration Complete</p>
                ) : null}
              </div>

              {frontendState === "needs_action" ? (
                <Button className="mb-3" variant="outline" onClick={() => setCurrentStep("metamap")}>
                  Continue with MetaMap Verification
                </Button>
              ) : null}

              <Button variant="hero" onClick={onClose}>Return to Home</Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default KYCJourneyV2Flow;
