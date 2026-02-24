import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { ArrowLeft, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import TermsConsent from "./TermsConsent";
import NumberSelection from "./NumberSelection";
import KYCVerification from "./KYCVerification";
import KYCConfirmation from "./KYCConfirmation";
import RegistrationForm from "./RegistrationForm";
import PaymentStep from "./PaymentStep";
import ESIMActivation from "./ESIMActivation";
import { api } from "@/lib/api";
import { toast } from "sonner";

type Step = "terms" | "number" | "kyc" | "confirm" | "registration" | "payment" | "activation";

interface ESIMPurchaseFlowProps {
  onClose: () => void;
}

const steps = [
  { id: "terms", label: "Terms" },
  { id: "payment", label: "Payment" },
  { id: "number", label: "Number" },
  { id: "registration", label: "Details" },
  { id: "kyc", label: "Verify" },
  { id: "confirm", label: "Confirm" },
  { id: "activation", label: "Activate" },
];

const ESIMPurchaseFlow = ({ onClose }: ESIMPurchaseFlowProps) => {
  const [currentStep, setCurrentStep] = useState<Step>("terms");
  const [selectedNumber, setSelectedNumber] = useState<string>("");
  const [selectedPlan, setSelectedPlan] = useState<string>("starter");
  const [kycData, setKycData] = useState<any>(null);
  const [registrationData, setRegistrationData] = useState<any>(null);
  const [requestId, setRequestId] = useState<string | number | null>(null);
  const [isStarting, setIsStarting] = useState(false);

  const currentStepIndex = steps.findIndex((s) => s.id === currentStep);

  const handlePaymentComplete = (plan: string) => {
    setSelectedPlan(plan);
    setCurrentStep("number");
  };

  const handleNumberSelect = (number: string, plan: string) => {
    setSelectedNumber(number);
    setSelectedPlan(plan);
    setCurrentStep("registration");
  };

  const handleRegistrationSubmit = async (data: any) => {
    if (!requestId) return;
    try {
      await api.esimRegistration(requestId, data);
      setRegistrationData(data);
      setCurrentStep("kyc");
    } catch (err) {
      console.error("Failed to submit registration:", err);
      toast.error("Failed to submit registration");
    }
  };

  const handleKYCComplete = (data: any) => {
    console.log("KYC Complete data:", data);
    setKycData(data);
    setCurrentStep("confirm");
  };

  const handleKYCConfirm = async () => {
    if (!requestId) return;
    try {
      await api.esimConfirmKyc(requestId, true);
      setCurrentStep("activation");
    } catch (err) {
      console.error("Failed to confirm KYC:", err);
      toast.error("Failed to confirm KYC");
    }
  };

  const handleActivationComplete = () => {
    onClose();
  };

  return (
    <div className="min-h-screen bg-background pt-20 pb-10">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="max-w-3xl mx-auto mb-8">
          <Button variant="ghost" onClick={onClose} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
          
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
            Buy eSIM
          </h1>
          <p className="text-muted-foreground">
            Complete the following steps to activate your eSIM
          </p>
        </div>

        {/* Progress Steps */}
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
                    className={`w-6 sm:w-10 lg:w-16 h-0.5 mx-1 sm:mx-2 ${
                      index < currentStepIndex ? "bg-primary" : "bg-border"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <AnimatePresence mode="wait">
          {currentStep === "terms" && (
            <TermsConsent
              key="terms"
              onAccept={async () => {
                setIsStarting(true);
                try {
                  const start = await api.esimStart();
                  console.log("eSIM start response:", start);
                  const id =
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
                    console.error("Missing eSIM request id. Response:", start);
                    toast.error("Missing eSIM request id. Check API response.");
                    throw new Error("Missing eSIM request id");
                  }
                  setRequestId(id);
                  await api.esimAcceptTerms(id, true);
                  setCurrentStep("payment");
                } catch (err) {
                  console.error("Failed to start eSIM flow:", err);
                  toast.error("Failed to start eSIM flow");
                } finally {
                  setIsStarting(false);
                }
              }}
              onBack={onClose}
              isSubmitting={isStarting}
            />
          )}
          {currentStep === "payment" && (
            <PaymentStep
              key="payment"
              selectedPlan={selectedPlan}
              requestId={requestId || ""}
              onComplete={handlePaymentComplete}
              onBack={() => setCurrentStep("terms")}
            />
          )}
          {currentStep === "number" && (
            <NumberSelection
              key="number"
              onSelect={handleNumberSelect}
              requestId={requestId || ""}
              onBack={() => setCurrentStep("payment")}
            />
          )}
          {currentStep === "registration" && (
            <RegistrationForm
              key="registration"
              kycData={null}
              onSubmit={handleRegistrationSubmit}
              onBack={() => setCurrentStep("number")}
            />
          )}
          {currentStep === "kyc" && (
            <KYCVerification
              key="kyc"
              selectedNumber={selectedNumber}
              registrationData={registrationData}
              requestId={requestId || ""}
              onComplete={handleKYCComplete}
              onBack={() => setCurrentStep("registration")}
            />
          )}
          {currentStep === "confirm" && kycData?.data && (
            <KYCConfirmation
              key="confirm"
              kycData={kycData.data}
              onConfirm={handleKYCConfirm}
              onBack={() => setCurrentStep("kyc")}
            />
          )}
          {currentStep === "activation" && (
            <ESIMActivation
              key="activation"
              selectedNumber={selectedNumber}
              requestId={requestId || ""}
              onComplete={handleActivationComplete}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ESIMPurchaseFlow;
