import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { ArrowLeft, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { toast } from "sonner";
import SmegaNumberEntry from "./SmegaNumberEntry";
import SmegaInlineKYC, { SmegaInlineKycPayload } from "./SmegaInlineKYC";
import SmegaOTP from "./SmegaOTP";
import SmegaComplete from "./SmegaComplete";

type Step = "number" | "inlineKyc" | "otp" | "complete";

interface SmegaFlowProps {
  onClose: () => void;
}

const steps = [
  { id: "number", label: "Number" },
  { id: "inlineKyc", label: "KYC" },
  { id: "otp", label: "OTP" },
  { id: "complete", label: "Complete" },
];

const SmegaFlow = ({ onClose }: SmegaFlowProps) => {
  const [currentStep, setCurrentStep] = useState<Step>("number");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [requestId, setRequestId] = useState<string | number | null>(null);
  const [challengeId, setChallengeId] = useState<string | number | null>(null);
  const [debugCode, setDebugCode] = useState<string | number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentStepIndex = steps.findIndex((s) => s.id === currentStep);

  const sendOtp = async (id: string | number) => {
    const send: any = await api.smegaOtpSend(id);
    const rawChallenge =
      send?.challenge_id ??
      send?.challengeId ??
      send?.data?.challenge_id ??
      send?.data?.challengeId ??
      null;
    const newChallengeId =
      rawChallenge !== null && rawChallenge !== undefined && String(rawChallenge).trim() !== ""
        ? Number.isNaN(Number(rawChallenge))
          ? rawChallenge
          : Number(rawChallenge)
        : null;
    const newDebugCode =
      send?.debug_code ?? send?.debugCode ?? send?.data?.debug_code ?? send?.data?.debugCode ?? null;
    setChallengeId(newChallengeId);
    setDebugCode(newDebugCode);
    setCurrentStep("otp");
  };

  const handleNumberSubmit = async (number: string) => {
    setIsSubmitting(true);
    try {
      let id = requestId;
      if (!id) {
        const start = await api.smegaStart();
        id =
          start?.request_id ??
          start?.requestId ??
          start?.id ??
          start?.data?.request_id ??
          start?.data?.requestId ??
          start?.data?.id ??
          start?.data?.request?.id ??
          start?.request?.id ??
          start?.request?.request_id;
        if (!id) {
          console.error("Missing SMEGA request id. Response:", start);
          throw new Error("Missing SMEGA request id");
        }
        setRequestId(id);
      }

      const msisdnResponse: any = await api.smegaMsisdn(id, number);
      setPhoneNumber(number);
      const isCompliant =
        msisdnResponse?.compliant ??
        msisdnResponse?.data?.compliant ??
        msisdnResponse?.status === "compliant" ??
        false;
      if (isCompliant) {
        await sendOtp(id);
      } else {
        setCurrentStep("inlineKyc");
      }
    } catch (err) {
      console.error("Failed to start SMEGA registration:", err);
      toast.error("Failed to start SMEGA registration");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInlineKycContinue = async (payload: SmegaInlineKycPayload) => {
    if (!requestId) return;
    setIsSubmitting(true);
    try {
      await api.smegaInlineKycComplete(requestId, payload);
      await sendOtp(requestId);
    } catch (err) {
      console.error("Failed to proceed with SMEGA KYC:", err);
      toast.error("Failed to continue SMEGA registration");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOTPVerified = async () => {
    if (!requestId) return;
    setIsSubmitting(true);
    try {
      const correlationId = `smega-${Date.now()}`;
      await api.smegaComplete(requestId, correlationId);
      setCurrentStep("complete");
    } catch (err) {
      console.error("Failed to complete SMEGA registration:", err);
      toast.error("Failed to complete SMEGA registration");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    switch (currentStep) {
      case "number":
        onClose();
        break;
      case "inlineKyc":
        setCurrentStep("number");
        break;
      case "otp":
        setCurrentStep("inlineKyc");
        break;
      case "complete":
        break;
    }
  };

  return (
    <div className="min-h-screen bg-background pt-20 pb-10">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto mb-8">
          <Button variant="ghost" onClick={onClose} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>

          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
            SMEGA Registration
          </h1>
          <p className="text-muted-foreground">
            Register for BTC's mobile money wallet linked to your number
          </p>
        </div>

        <div className="max-w-4xl mx-auto mb-10 overflow-x-auto">
          <div className="flex items-center justify-between min-w-max px-4">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-9 h-9 md:w-10 md:h-10 rounded-full flex items-center justify-center text-xs md:text-sm font-semibold transition-all ${
                      index < currentStepIndex
                        ? "gradient-primary text-primary-foreground"
                        : index === currentStepIndex
                        ? "border-2 border-primary text-primary bg-primary/10"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {index < currentStepIndex ? (
                      <Check className="w-4 h-4 md:w-5 md:h-5" />
                    ) : (
                      index + 1
                    )}
                  </div>
                  <span
                    className={`text-xs mt-2 hidden sm:block ${
                      index <= currentStepIndex ? "text-foreground font-medium" : "text-muted-foreground"
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`w-12 sm:w-20 lg:w-32 h-0.5 mx-2 sm:mx-4 ${
                      index < currentStepIndex ? "bg-primary" : "bg-border"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        <AnimatePresence mode="wait">
          {currentStep === "number" && (
            <SmegaNumberEntry
              key="number"
              onSubmit={handleNumberSubmit}
              onBack={onClose}
              isSubmitting={isSubmitting}
            />
          )}
          {currentStep === "inlineKyc" && (
            <SmegaInlineKYC
              key="inlineKyc"
              onSubmit={handleInlineKycContinue}
              onBack={handleBack}
              isSubmitting={isSubmitting}
            />
          )}
          {currentStep === "otp" && (
            <SmegaOTP
              key="otp"
              phoneNumber={phoneNumber}
              requestId={requestId || ""}
              challengeId={challengeId}
              debugCode={debugCode}
              onVerified={handleOTPVerified}
              onBack={handleBack}
              onChallengeUpdate={(id, code) => {
                setChallengeId(id);
                setDebugCode(code ?? null);
              }}
            />
          )}
          {currentStep === "complete" && (
            <SmegaComplete key="complete" phoneNumber={phoneNumber} onComplete={onClose} />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default SmegaFlow;
