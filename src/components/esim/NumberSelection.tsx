import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Phone, RefreshCw, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { toast } from "sonner";

interface NumberSelectionProps {
  onSelect: (number: string, plan: string) => void;
  requestId: string | number;
  onBack: () => void;
}

const NumberSelection = ({ onSelect, requestId, onBack }: NumberSelectionProps) => {
  const [selectedNumber, setSelectedNumber] = useState<string | null>(null);
  const [numbers, setNumbers] = useState<{ number: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadNumbers = async () => {
    if (!requestId) {
      toast.error("Missing eSIM session");
      return;
    }
    setIsLoading(true);
    try {
      const data = await api.esimNumbers(requestId);
      const list = data?.numbers || data?.data || data || [];
      const formatted = Array.isArray(list)
        ? list.map((item: string) => ({ number: String(item) }))
        : [];
      setNumbers(formatted);
      setSelectedNumber(null);
    } catch (err) {
      console.error("Failed to load numbers:", err);
      toast.error("Failed to load numbers");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadNumbers();
  }, [requestId]);

  const refreshNumbers = () => {
    loadNumbers();
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="max-w-3xl mx-auto"
    >
      {/* Number Selection */}
      <div className="bg-card border border-border rounded-xl p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center">
              <Phone className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Choose Your Number</h3>
              <p className="text-sm text-muted-foreground">Select your preferred mobile number</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={refreshNumbers}>
            <RefreshCw className={`w-4 h-4 mr-1 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {numbers.map((item) => (
            <button
              key={item.number}
              onClick={() => setSelectedNumber(item.number)}
              className={`relative p-4 rounded-xl border-2 transition-all duration-200 text-left ${
                selectedNumber === item.number
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/30"
              }`}
            >
              <p className="font-mono font-semibold text-foreground text-lg">
                +267 {item.number}
              </p>
              {selectedNumber === item.number && (
                <div className="absolute top-3 left-3">
                  <Check className="w-5 h-5 text-primary" />
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} className="flex-1">
          Back
        </Button>
        <Button
          variant="hero"
          onClick={async () => {
            if (!selectedNumber) return;
            try {
              const msisdn = selectedNumber.replace(/\s+/g, "");
              await api.esimSelectNumber(requestId, msisdn);
              onSelect(selectedNumber, "");
            } catch (err) {
              console.error("Failed to select number:", err);
              toast.error("Failed to select number");
            }
          }}
          disabled={!selectedNumber}
          className="flex-1"
        >
          Continue to Verification
        </Button>
      </div>
    </motion.div>
  );
};

export default NumberSelection;
