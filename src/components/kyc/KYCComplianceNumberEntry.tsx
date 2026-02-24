import { useState } from "react";
import { motion } from "framer-motion";
import { Phone, ArrowRight, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { api } from "@/lib/api";

interface KYCComplianceNumberEntryProps {
  onSubmit: (phoneNumber: string) => void;
  onBack: () => void;
}

const KYCComplianceNumberEntry = ({ onSubmit, onBack }: KYCComplianceNumberEntryProps) => {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [error, setError] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);

  const handlePhoneChange = (value: string) => {
    // Only allow digits and limit to 8 characters
    const cleaned = value.replace(/\D/g, "").slice(0, 8);
    setPhoneNumber(cleaned);
    if (error) setError("");
  };

  const handleSubmit = async () => {
    const cleaned = phoneNumber.replace(/\D/g, "");
    
    if (!cleaned) {
      setError("Please enter your phone number");
      return;
    }

    setIsVerifying(true);
    
    try {
      const data = await api.subscriberLookup(cleaned);

      if (data.exists) {
        // Phone number is in whitelist, proceed
        setError("");
        onSubmit(cleaned);
      } else {
        // Phone number not found in whitelist
        setError("Your phone number is not part of this exercise. Please contact customer care.");
        toast.error("Phone number not found");
      }
    } catch (err) {
      console.error('Lookup error:', err);
      setError("Failed to verify phone number");
      toast.error("Failed to verify phone number");
    } finally {
      setIsVerifying(false);
    }
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
            Enter Your Phone Number
          </h2>
          <p className="text-muted-foreground">
            Please enter your registered BTC mobile number for KYC verification
          </p>
        </div>

        {/* Phone Input */}
        <div className="space-y-4">
          <div>
            <Label htmlFor="phone">Mobile Number</Label>
            <div className="relative mt-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                +267
              </span>
              <Input
                id="phone"
                type="tel"
                value={phoneNumber}
                onChange={(e) => handlePhoneChange(e.target.value)}
                placeholder="7X XXX XXX"
                className={`pl-14 text-lg h-12 font-mono ${error ? "border-destructive" : ""}`}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleSubmit();
                  }
                }}
              />
            </div>
           {error && (
             <div className="flex gap-3 p-4 bg-destructive/10 rounded-lg border border-destructive/30">
               <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
               <p className="text-sm text-destructive">{error}</p>
             </div>
           )}
          </div>

        </div>

        {/* Actions */}
        <div className="flex gap-3 mt-8">
          <Button variant="outline" onClick={onBack} className="flex-1">
            Back
          </Button>
           <Button
             variant="hero"
             onClick={handleSubmit}
             disabled={!phoneNumber || isVerifying}
             className="flex-1"
           >
             {isVerifying ? "Verifying..." : "Continue"}
             {!isVerifying && <ArrowRight className="w-4 h-4 ml-2" />}
           </Button>
        </div>
      </div>
    </motion.div>
  );
};

export default KYCComplianceNumberEntry;
