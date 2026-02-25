import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { ArrowLeft, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import KYCComplianceTerms from "./KYCComplianceTerms";
import KYCComplianceNumberEntry from "./KYCComplianceNumberEntry";
import KYCComplianceRegistration from "./KYCComplianceRegistration";
import KYCComplianceComplete from "./KYCComplianceComplete";
import KYCLegacyVerification from "./KYCLegacyVerification";
import { api } from "@/lib/api";
import { toast } from "sonner";

type Step = "terms" | "number" | "registration" | "verification" | "complete";

interface KYCLegacyFlowProps {
  onClose: () => void;
}

const steps = [
  { id: "terms", label: "Terms" },
  { id: "number", label: "Number" },
  { id: "registration", label: "Details" },
  { id: "verification", label: "Verify ID" },
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

const KYCLegacyFlow = ({ onClose }: KYCLegacyFlowProps) => {
  const [currentStep, setCurrentStep] = useState<Step>("terms");
  const [phoneNumber, setPhoneNumber] = useState<string>("");
  const [registrationData, setRegistrationData] = useState<any>(null);
  const [kycData, setKycData] = useState<any>(null);
  const [requestId, setRequestId] = useState<string | number | null>(null);
  const [isStarting, setIsStarting] = useState(false);

  const currentStepIndex = steps.findIndex((s) => s.id === currentStep);

  const handleTermsAccept = async () => {
    setIsStarting(true);
    try {
      const start = await api.kycComplianceStart();
      const id = extractRequestId(start);
      if (!id) throw new Error("Missing KYC request id");
      setRequestId(id);
      await api.kycComplianceTerms(id, true);
      setCurrentStep("number");
    } catch (err) {
      console.error("Failed to start legacy KYC compliance:", err);
      toast.error("Failed to start legacy KYC flow");
    } finally {
      setIsStarting(false);
    }
  };

  const handleNumberSubmit = async (number: string) => {
    if (!requestId) return;
    try {
      await api.kycComplianceNumber(requestId, number);
      setPhoneNumber(number);
      setCurrentStep("registration");
    } catch (err) {
      console.error("Failed to submit number:", err);
      toast.error("Failed to submit number");
    }
  };

  const handleRegistrationSubmit = async (data: any) => {
    if (!requestId) return;
    try {
      await api.kycComplianceRegistration(requestId, data);
      setRegistrationData(data);
      setCurrentStep("verification");
    } catch (err) {
      console.error("Failed to submit registration:", err);
      toast.error("Failed to submit registration");
    }
  };

  const handleVerificationComplete = (data: any) => {
    setKycData(data);
    setCurrentStep("complete");
  };

  const handleBack = () => {
    switch (currentStep) {
      case "terms":
        onClose();
        break;
      case "number":
        setCurrentStep("terms");
        break;
      case "registration":
        setCurrentStep("number");
        break;
      case "verification":
        setCurrentStep("registration");
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

          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">KYC Compliance (Legacy)</h1>
          <p className="text-muted-foreground">Uses the previous MetaMap polling/realtime verification flow.</p>
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
                    {index < currentStepIndex ? <Check className="w-4 h-4 md:w-5 md:h-5" /> : index + 1}
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
                  <div className={`w-12 sm:w-20 lg:w-32 h-0.5 mx-2 sm:mx-4 ${index < currentStepIndex ? "bg-primary" : "bg-border"}`} />
                )}
              </div>
            ))}
          </div>
        </div>

        <AnimatePresence mode="wait">
          {currentStep === "terms" && (
            <KYCComplianceTerms key="terms" onAccept={handleTermsAccept} onBack={onClose} isSubmitting={isStarting} />
          )}
          {currentStep === "number" && (
            <KYCComplianceNumberEntry key="number" onSubmit={handleNumberSubmit} onBack={handleBack} />
          )}
          {currentStep === "registration" && (
            <KYCComplianceRegistration key="registration" onSubmit={handleRegistrationSubmit} onBack={handleBack} />
          )}
          {currentStep === "verification" && (
            <KYCLegacyVerification
              key="verification"
              requestId={requestId || ""}
              phoneNumber={phoneNumber}
              registrationData={registrationData}
              onComplete={handleVerificationComplete}
              onBack={handleBack}
            />
          )}
          {currentStep === "complete" && (
            <KYCComplianceComplete key="complete" phoneNumber={phoneNumber} result={kycData} flowState="verified" onComplete={onClose} />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default KYCLegacyFlow;
