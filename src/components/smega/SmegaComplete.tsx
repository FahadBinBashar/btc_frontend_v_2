import { motion } from "framer-motion";
import { CheckCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SmegaCompleteProps {
  phoneNumber: string;
  flowState?: "pending" | "needs_action" | "verified" | "failed";
  result?: any;
  onComplete: () => void;
}

const SmegaComplete = ({ phoneNumber, flowState = "verified", result, onComplete }: SmegaCompleteProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-2xl mx-auto"
    >
      <div className="bg-card border border-border rounded-2xl p-8 text-center">
        <div className="w-20 h-20 rounded-full gradient-primary flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-10 h-10 text-primary-foreground" />
        </div>
        <h2 className="text-3xl font-bold text-foreground mb-3">SMEGA Registration Complete</h2>
        <p className="text-muted-foreground mb-6">
          Your SMEGA wallet has been linked to
          <span className="font-mono font-semibold text-foreground"> +267 {phoneNumber}</span>.
        </p>

        <div className="bg-muted/50 rounded-lg p-4 text-left mb-6">
          <p className="text-sm"><span className="text-muted-foreground">frontend_state:</span> {flowState}</p>
          <p className="text-sm"><span className="text-muted-foreground">status:</span> {String(result?.status ?? result?.data?.status ?? "success")}</p>
        </div>

        <div className="bg-muted/50 rounded-lg p-5 text-left mb-6">
          <h3 className="font-semibold text-foreground mb-2">Next steps</h3>
          <ul className="text-sm text-muted-foreground space-y-2">
            <li>Check SMS notifications for activation details.</li>
            <li>Set up your wallet PIN the first time you log in.</li>
            <li>Start sending money, paying bills, and buying airtime.</li>
          </ul>
        </div>

        <Button variant="hero" onClick={onComplete} className="w-full">
          Return to Home
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </motion.div>
  );
};

export default SmegaComplete;
