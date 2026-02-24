import { motion } from "framer-motion";
import { CheckCircle, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

interface KYCComplianceCompleteProps {
  phoneNumber: string;
  onComplete: () => void;
}

const KYCComplianceComplete = ({ phoneNumber, onComplete }: KYCComplianceCompleteProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="max-w-xl mx-auto"
    >
      <div className="bg-card border border-border rounded-xl p-8 text-center">
        {/* Success Animation */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.2 }}
          className="w-24 h-24 rounded-full bg-success/20 flex items-center justify-center mx-auto mb-6"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.4 }}
          >
            <CheckCircle className="w-12 h-12 text-success" />
          </motion.div>
        </motion.div>

        {/* Title */}
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="text-2xl md:text-3xl font-bold text-foreground mb-3"
        >
          KYC Verification Complete!
        </motion.h2>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="text-muted-foreground mb-8"
        >
          Thank you for completing your Know Your Customer verification.
        </motion.p>

        {/* Summary Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="bg-muted/50 rounded-xl p-6 mb-8"
        >
          <h3 className="font-semibold text-foreground mb-4">Verification Summary</h3>
          
          <div className="space-y-3 text-left">
            <div className="flex justify-between items-center py-2 border-b border-border">
              <span className="text-muted-foreground">Phone Number</span>
              <span className="font-mono font-medium text-foreground">+267 {phoneNumber}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border">
              <span className="text-muted-foreground">Service Type</span>
              <span className="font-medium text-foreground">KYC Compliance</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border">
              <span className="text-muted-foreground">Status</span>
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-success/20 text-success text-sm font-medium">
                <CheckCircle className="w-3 h-3" />
                Verified
              </span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-muted-foreground">Completed</span>
              <span className="font-medium text-foreground">
                {new Date().toLocaleDateString("en-BW", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </span>
            </div>
          </div>
        </motion.div>

        {/* Info Text */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-sm text-muted-foreground mb-8"
        >
          Your account is now fully verified and compliant with regulatory requirements.
          You can now access all BTC mobile services.
        </motion.p>

        {/* Action Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
        >
          <Button variant="hero" size="lg" onClick={onComplete} className="w-full">
            <Home className="w-5 h-5 mr-2" />
            Return to Home
          </Button>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default KYCComplianceComplete;
