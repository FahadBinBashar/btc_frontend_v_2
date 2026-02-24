import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { ArrowLeft, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import SIMSwapNumberEntry from "./SIMSwapNumberEntry";
import SIMSwapOTP from "./SIMSwapOTP";
import SIMSwapPayment from "./SIMSwapPayment";
import SIMSwapKYC from "./SIMSwapKYC";
import SIMSwapTypeSelection from "./SIMSwapTypeSelection";
import SIMSwapESIM from "./SIMSwapESIM";
import SIMSwapShopSelection from "./SIMSwapShopSelection";
import { api } from "@/lib/api";
import { toast } from "sonner";

type Step = "number" | "otp" | "payment" | "kyc" | "type" | "esim" | "shop";

interface SIMSwapFlowProps {
  onClose: () => void;
}

const steps = [
  { id: "number", label: "Number" },
  { id: "otp", label: "OTP" },
  { id: "payment", label: "Payment" },
  { id: "kyc", label: "Verify ID" },
  { id: "type", label: "SIM Type" },
  { id: "complete", label: "Complete" },
];

const SIMSwapFlow = ({ onClose }: SIMSwapFlowProps) => {
  const [currentStep, setCurrentStep] = useState<Step>("number");
  const [phoneNumber, setPhoneNumber] = useState<string>("");
  const [canReceiveOTP, setCanReceiveOTP] = useState<boolean>(true);
  const [kycData, setKycData] = useState<any>(null);
  const [selectedSIMType, setSelectedSIMType] = useState<"esim" | "physical" | null>(null);
  const [requestId, setRequestId] = useState<string | number | null>(null);
  
  // Track flow metadata for data integrity
  const [flowMetadata, setFlowMetadata] = useState<{
    numberEnteredAt?: string;
    otpVerifiedAt?: string;
    otpSkipped?: boolean;
  }>({});

  // Calculate step index for progress display
  const getStepIndex = () => {
    switch (currentStep) {
      case "number":
        return 0;
      case "otp":
        return 1;
      case "payment":
        return 2;
      case "kyc":
        return 3;
      case "type":
        return 4;
      case "esim":
      case "shop":
        return 5;
      default:
        return 0;
    }
  };

  const currentStepIndex = getStepIndex();

  const handleNumberSubmit = async (number: string, canOTP: boolean) => {
    try {
      let id = requestId;
      if (!id) {
        const start = await api.simswapStart();
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
          console.error("Missing SIM swap request id. Response:", start);
          throw new Error("Missing SIM swap request id");
        }
        setRequestId(id);
      }

      await api.simswapNumber(id, number);
      if (canOTP) {
        await api.simswapOtpSend(id, "sms");
      }

      setPhoneNumber(number);
      setCanReceiveOTP(canOTP);
      
      // Record number entry timestamp
      setFlowMetadata(prev => ({
        ...prev,
        numberEnteredAt: new Date().toISOString(),
        otpSkipped: !canOTP,
      }));
      
      if (canOTP) {
        setCurrentStep("otp");
      } else {
        // If can't receive OTP, go directly to payment
        setCurrentStep("payment");
      }
    } catch (err) {
      console.error("Failed to start SIM swap:", err);
      toast.error("Failed to start SIM swap. Please try again.");
    }
  };

  const handleOTPVerified = () => {
    // Record OTP verification timestamp
    setFlowMetadata(prev => ({
      ...prev,
      otpVerifiedAt: new Date().toISOString(),
    }));
    // After OTP, proceed to payment
    setCurrentStep("payment");
  };

  const handlePaymentComplete = () => {
    // After payment, proceed to KYC
    setCurrentStep("kyc");
  };

  const handleKYCComplete = (data: any) => {
    setKycData(data);
    setCurrentStep("type");
  };

  const handleTypeSelect = async (type: "esim" | "physical") => {
    setSelectedSIMType(type);
    try {
      if (requestId) {
        await api.simswapSimType(requestId, type);
      }
      if (type === "esim") {
        setCurrentStep("esim");
      } else {
        setCurrentStep("shop");
      }
    } catch (err) {
      console.error("Failed to set SIM type:", err);
      toast.error("Failed to set SIM type");
    }
  };

  const handleComplete = () => {
    onClose();
  };

  const handleBack = () => {
    switch (currentStep) {
      case "number":
        onClose();
        break;
      case "otp":
        setCurrentStep("number");
        break;
      case "payment":
        if (canReceiveOTP) {
          setCurrentStep("otp");
        } else {
          setCurrentStep("number");
        }
        break;
      case "kyc":
        setCurrentStep("payment");
        break;
      case "type":
        setCurrentStep("kyc");
        break;
      case "esim":
      case "shop":
        setCurrentStep("type");
        break;
    }
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
            SIM Swap
          </h1>
          <p className="text-muted-foreground">
            Transfer your existing number to a new SIM card
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
                    className={`w-12 sm:w-20 lg:w-32 h-0.5 mx-2 sm:mx-4 ${
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
          {currentStep === "number" && (
            <SIMSwapNumberEntry
              key="number"
              onSubmit={handleNumberSubmit}
              onBack={onClose}
            />
          )}
          {currentStep === "otp" && (
            <SIMSwapOTP
              key="otp"
              phoneNumber={phoneNumber}
              requestId={requestId || ""}
              onVerified={handleOTPVerified}
              onBack={handleBack}
            />
          )}
          {currentStep === "payment" && (
            <SIMSwapPayment
              key="payment"
              phoneNumber={phoneNumber}
              requestId={requestId || ""}
              onComplete={handlePaymentComplete}
              onBack={handleBack}
            />
          )}
          {currentStep === "kyc" && (
            <SIMSwapKYC
              key="kyc"
              requestId={requestId || ""}
              phoneNumber={phoneNumber}
              flowMetadata={flowMetadata}
              onComplete={handleKYCComplete}
              onBack={handleBack}
            />
          )}
          {currentStep === "type" && (
            <SIMSwapTypeSelection
              key="type"
              onSelect={handleTypeSelect}
              onBack={handleBack}
            />
          )}
          {currentStep === "esim" && (
            <SIMSwapESIM
              key="esim"
              phoneNumber={phoneNumber}
              requestId={requestId || ""}
              onComplete={handleComplete}
            />
          )}
          {currentStep === "shop" && (
            <SIMSwapShopSelection
              key="shop"
              phoneNumber={phoneNumber}
              requestId={requestId || ""}
              onComplete={handleComplete}
              onBack={handleBack}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default SIMSwapFlow;
