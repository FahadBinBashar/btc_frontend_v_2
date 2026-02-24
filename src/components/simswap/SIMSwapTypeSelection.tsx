import { useState } from "react";
import { motion } from "framer-motion";
import { Smartphone, CreditCard, ArrowRight, QrCode, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

interface SIMSwapTypeSelectionProps {
  onSelect: (type: "esim" | "physical") => void;
  onBack: () => void;
}

const SIMSwapTypeSelection = ({ onSelect, onBack }: SIMSwapTypeSelectionProps) => {
  const [selectedType, setSelectedType] = useState<"esim" | "physical" | null>(null);

  const handleContinue = () => {
    if (selectedType) {
      onSelect(selectedType);
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
            <Smartphone className="w-8 h-8 text-primary-foreground" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">
            Choose Your SIM Type
          </h2>
          <p className="text-muted-foreground">
            Select whether you want an eSIM or a physical SIM card
          </p>
        </div>

        {/* SIM Type Selection */}
        <RadioGroup
          value={selectedType || ""}
          onValueChange={(value) => setSelectedType(value as "esim" | "physical")}
          className="space-y-4 mb-8"
        >
          {/* eSIM Option */}
          <div 
            className={`relative p-6 rounded-xl border-2 transition-all cursor-pointer ${
              selectedType === "esim" 
                ? "border-primary bg-primary/5" 
                : "border-border hover:border-primary/30"
            }`}
            onClick={() => setSelectedType("esim")}
          >
            <div className="flex items-start gap-4">
              <RadioGroupItem value="esim" id="esim" className="mt-1" />
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <QrCode className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <Label htmlFor="esim" className="text-lg font-semibold text-foreground cursor-pointer">
                      eSIM
                    </Label>
                    <p className="text-sm text-muted-foreground">Digital SIM card</p>
                  </div>
                </div>
                <ul className="space-y-2 mt-4 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-success" />
                    Instant activation via QR code
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-success" />
                    No need to visit a store
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-success" />
                    Compatible with modern devices
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Physical SIM Option */}
          <div 
            className={`relative p-6 rounded-xl border-2 transition-all cursor-pointer ${
              selectedType === "physical" 
                ? "border-primary bg-primary/5" 
                : "border-border hover:border-primary/30"
            }`}
            onClick={() => setSelectedType("physical")}
          >
            <div className="flex items-start gap-4">
              <RadioGroupItem value="physical" id="physical" className="mt-1" />
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <CreditCard className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <Label htmlFor="physical" className="text-lg font-semibold text-foreground cursor-pointer">
                      Physical SIM
                    </Label>
                    <p className="text-sm text-muted-foreground">Traditional SIM card</p>
                  </div>
                </div>
                <ul className="space-y-2 mt-4 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    Pick up from a BTC store
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    Works with all devices
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    No internet needed to activate
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </RadioGroup>

        {/* Actions */}
        <div className="flex gap-3">
          <Button variant="outline" onClick={onBack} className="flex-1">
            Back
          </Button>
          <Button 
            variant="hero" 
            onClick={handleContinue} 
            className="flex-1"
            disabled={!selectedType}
          >
            Continue
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
};

export default SIMSwapTypeSelection;
