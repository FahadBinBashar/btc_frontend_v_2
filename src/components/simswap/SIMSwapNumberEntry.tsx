import { useState } from "react";
import { motion } from "framer-motion";
import { Phone, ArrowRight, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

interface SIMSwapNumberEntryProps {
  onSubmit: (number: string, canReceiveOTP: boolean) => void;
  onBack: () => void;
}

const SIMSwapNumberEntry = ({ onSubmit, onBack }: SIMSwapNumberEntryProps) => {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [canReceiveOTP, setCanReceiveOTP] = useState<string>("yes");
  const [error, setError] = useState("");

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "");
    if (value.length <= 8) {
      setPhoneNumber(value);
      setError("");
    }
  };

  const handleSubmit = () => {
    // Demo mode: Accept any number with at least 1 digit
    if (phoneNumber.length < 1) {
      setError("Please enter a phone number");
      return;
    }
    
    onSubmit(phoneNumber, canReceiveOTP === "yes");
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
            <Phone className="w-8 h-8 text-primary-foreground" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">
            Enter Your Number
          </h2>
          <p className="text-muted-foreground">
            Enter the phone number you want to swap to a new SIM
          </p>
        </div>

        {/* Phone Number Input */}
        <div className="space-y-6">
          <div>
            <Label htmlFor="phone" className="text-sm font-medium text-foreground mb-2 block">
              Phone Number
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                +267
              </span>
              <Input
                id="phone"
                type="tel"
                placeholder="7X XXX XXX"
                value={phoneNumber}
                onChange={handlePhoneChange}
                className="pl-14 text-lg h-12"
                maxLength={8}
              />
            </div>
            {error && (
              <p className="text-destructive text-sm mt-2 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {error}
              </p>
            )}
          </div>

          {/* OTP Capability Selection */}
          <div className="space-y-4">
            <Label className="text-sm font-medium text-foreground block">
              Can this number currently receive SMS/OTP?
            </Label>
            <RadioGroup
              value={canReceiveOTP}
              onValueChange={setCanReceiveOTP}
              className="space-y-3"
            >
              <div className="flex items-center space-x-3 p-4 rounded-lg border border-border hover:border-primary/30 transition-colors cursor-pointer">
                <RadioGroupItem value="yes" id="otp-yes" />
                <Label htmlFor="otp-yes" className="flex-1 cursor-pointer">
                  <span className="font-medium text-foreground">Yes, I can receive OTP</span>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    An OTP will be sent to verify ownership
                  </p>
                </Label>
              </div>
              <div className="flex items-center space-x-3 p-4 rounded-lg border border-border hover:border-primary/30 transition-colors cursor-pointer">
                <RadioGroupItem value="no" id="otp-no" />
                <Label htmlFor="otp-no" className="flex-1 cursor-pointer">
                  <span className="font-medium text-foreground">No, I cannot receive OTP</span>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    You'll need to complete identity verification instead
                  </p>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Info Box */}
          <div className="bg-muted/50 rounded-lg p-4">
            <p className="text-sm text-muted-foreground">
              <strong className="text-foreground">Note:</strong> If your SIM is lost, stolen, or damaged 
              and cannot receive messages, select "No" to proceed with identity verification.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 mt-8">
          <Button variant="outline" onClick={onBack} className="flex-1">
            Cancel
          </Button>
          <Button 
            variant="hero" 
            onClick={handleSubmit} 
            className="flex-1"
            disabled={phoneNumber.length < 1}
          >
            Continue
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
};

export default SIMSwapNumberEntry;
