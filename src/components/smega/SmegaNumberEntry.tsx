import { useState } from "react";
import { motion } from "framer-motion";
import { Phone, ArrowRight, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface SmegaNumberEntryProps {
  onSubmit: (phoneNumber: string) => void;
  onBack: () => void;
  isSubmitting?: boolean;
}

const SmegaNumberEntry = ({ onSubmit, onBack, isSubmitting = false }: SmegaNumberEntryProps) => {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [error, setError] = useState("");

  const handlePhoneChange = (value: string) => {
    const cleaned = value.replace(/\D/g, "").slice(0, 8);
    setPhoneNumber(cleaned);
    if (error) setError("");
  };

  const handleSubmit = () => {
    if (phoneNumber.length !== 8) {
      setError("Please enter a valid 8-digit phone number");
      return;
    }
    onSubmit(phoneNumber);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="max-w-xl mx-auto"
    >
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full gradient-primary flex items-center justify-center mx-auto mb-4">
            <Phone className="w-8 h-8 text-primary-foreground" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Enter Your Number</h2>
          <p className="text-muted-foreground">Provide the mobile number to register for SMEGA</p>
        </div>

        <div className="space-y-4">
          <div>
            <Label htmlFor="smega-phone">Mobile Number</Label>
            <div className="relative mt-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                +267
              </span>
              <Input
                id="smega-phone"
                type="tel"
                value={phoneNumber}
                onChange={(e) => handlePhoneChange(e.target.value)}
                placeholder="7X XXX XXX"
                className={`pl-14 text-lg h-12 font-mono ${error ? "border-destructive" : ""}`}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSubmit();
                }}
              />
            </div>
            {error && (
              <div className="flex gap-3 p-4 bg-destructive/10 rounded-lg border border-destructive/30 mt-3">
                <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-3 mt-8">
          <Button variant="outline" onClick={onBack} className="flex-1">
            Back
          </Button>
          <Button
            variant="hero"
            onClick={handleSubmit}
            disabled={phoneNumber.length !== 8 || isSubmitting}
            className="flex-1"
          >
            {isSubmitting ? "Submitting..." : "Continue"}
            {!isSubmitting && <ArrowRight className="w-4 h-4 ml-2" />}
          </Button>
        </div>
      </div>
    </motion.div>
  );
};

export default SmegaNumberEntry;
