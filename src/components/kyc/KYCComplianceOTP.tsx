import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { MessageSquare, ArrowRight, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { toast } from "sonner";

interface KYCComplianceOTPProps {
  phoneNumber: string;
  onVerified: () => void;
  onBack: () => void;
}

const DEFAULT_OTP = "7373";

const KYCComplianceOTP = ({ phoneNumber, onVerified, onBack }: KYCComplianceOTPProps) => {
  const [otp, setOtp] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [countdown]);

  const handleOTPChange = (value: string) => {
    setOtp(value);
    setError("");
  };

  const handleVerify = () => {
    if (otp.length !== 4) {
      setError("Please enter the complete OTP");
      return;
    }

    setIsVerifying(true);
    
    // Demo mode: Accept any 4-digit OTP
    setTimeout(() => {
      toast.success("Phone number verified successfully!");
      onVerified();
      setIsVerifying(false);
    }, 1000);
  };

  const handleResend = () => {
    setCountdown(60);
    setCanResend(false);
    setOtp("");
    setError("");
    toast.success("A new OTP has been sent to your phone");
  };

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
            <MessageSquare className="w-8 h-8 text-primary-foreground" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">
            Verify Your Number
          </h2>
          <p className="text-muted-foreground">
            Enter the 4-digit OTP sent to
          </p>
          <p className="font-mono font-semibold text-foreground text-lg mt-1">
            +267 {phoneNumber}
          </p>
        </div>

        {/* OTP Input */}
        <div className="flex flex-col items-center space-y-6">
          <InputOTP
            maxLength={4}
            value={otp}
            onChange={handleOTPChange}
          >
            <InputOTPGroup>
              <InputOTPSlot index={0} className="w-14 h-14 text-xl" />
              <InputOTPSlot index={1} className="w-14 h-14 text-xl" />
              <InputOTPSlot index={2} className="w-14 h-14 text-xl" />
              <InputOTPSlot index={3} className="w-14 h-14 text-xl" />
            </InputOTPGroup>
          </InputOTP>

          {error && (
            <p className="text-destructive text-sm">{error}</p>
          )}

          {/* Resend Timer */}
          <div className="text-center">
            {canResend ? (
              <Button
                variant="ghost"
                onClick={handleResend}
                className="text-primary"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Resend OTP
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground">
                Resend OTP in <span className="font-mono font-semibold text-foreground">{countdown}s</span>
              </p>
            )}
          </div>

          <div className="bg-muted/50 rounded-lg p-4 w-full">
            <p className="text-sm text-muted-foreground text-center">
              <strong className="text-foreground">Demo:</strong> Enter any 4-digit code to proceed
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 mt-8">
          <Button variant="outline" onClick={onBack} className="flex-1">
            Back
          </Button>
          <Button 
            variant="hero" 
            onClick={handleVerify} 
            className="flex-1"
            disabled={otp.length !== 4 || isVerifying}
          >
            {isVerifying ? "Verifying..." : "Verify"}
            {!isVerifying && <ArrowRight className="w-4 h-4 ml-2" />}
          </Button>
        </div>
      </div>
    </motion.div>
  );
};

export default KYCComplianceOTP;
