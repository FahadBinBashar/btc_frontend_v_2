import { useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, FileText, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

interface KYCComplianceTermsProps {
  onAccept: () => void;
  onBack: () => void;
  isSubmitting?: boolean;
}

const KYCComplianceTerms = ({ onAccept, onBack, isSubmitting }: KYCComplianceTermsProps) => {
  const [accepted, setAccepted] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="max-w-2xl mx-auto"
    >
      {/* Header Card */}
      <div className="bg-card border border-border rounded-xl p-6 mb-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-14 h-14 rounded-xl gradient-primary flex items-center justify-center">
            <Shield className="w-7 h-7 text-primary-foreground" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">KYC Verification</h2>
            <p className="text-muted-foreground">Know Your Customer Compliance</p>
          </div>
        </div>
        
        <p className="text-muted-foreground text-sm">
          As part of regulatory requirements set by BOCRA (Botswana Communications Regulatory Authority), 
          all mobile subscribers must complete identity verification. This process helps ensure the security 
          of telecommunications services in Botswana.
        </p>
      </div>

      {/* What to Expect */}
      <div className="bg-card border border-border rounded-xl p-6 mb-6">
        <h3 className="font-semibold text-foreground mb-4">What You'll Need</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-lg bg-muted">
            <div className="text-2xl mb-2">🪪</div>
            <p className="font-medium text-foreground">Valid ID Document</p>
            <p className="text-sm text-muted-foreground">Omang (Citizen) or Passport (Non-Citizen)</p>
          </div>
          <div className="p-4 rounded-lg bg-muted">
            <div className="text-2xl mb-2">📱</div>
            <p className="font-medium text-foreground">Your Phone</p>
            <p className="text-sm text-muted-foreground">To receive OTP verification</p>
          </div>
          <div className="p-4 rounded-lg bg-muted">
            <div className="text-2xl mb-2">📷</div>
            <p className="font-medium text-foreground">Camera Access</p>
            <p className="text-sm text-muted-foreground">For document and selfie capture</p>
          </div>
          <div className="p-4 rounded-lg bg-muted">
            <div className="text-2xl mb-2">⏱️</div>
            <p className="font-medium text-foreground">5 Minutes</p>
            <p className="text-sm text-muted-foreground">Estimated completion time</p>
          </div>
        </div>
      </div>

      {/* Terms & Conditions */}
      <div className="bg-card border border-border rounded-xl p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <FileText className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">Terms & Conditions</h3>
        </div>
        <div className="h-48 overflow-y-auto bg-muted rounded-lg p-4 text-sm text-muted-foreground mb-4">
          <h4 className="font-semibold text-foreground mb-2">BTC KYC Compliance Terms</h4>
          <p className="mb-3">
            By proceeding with KYC verification, you agree to the following terms and conditions:
          </p>
          <p className="mb-3">
            1. <strong>Identity Verification:</strong> You consent to the collection and verification of your 
            identity documents (Omang or Passport) as required by BOCRA regulations.
          </p>
          <p className="mb-3">
            2. <strong>Biometric Data:</strong> You consent to the capture and processing of biometric data 
            including facial images for identity verification purposes.
          </p>
          <p className="mb-3">
            3. <strong>Accuracy of Information:</strong> You confirm that all information provided is accurate 
            and truthful. Providing false information may result in service termination and legal action.
          </p>
          <p className="mb-3">
            4. <strong>Data Protection:</strong> Your personal information will be processed in accordance 
            with the Data Protection Act of Botswana and BTC's privacy policy.
          </p>
          <p className="mb-3">
            5. <strong>Data Retention:</strong> Your KYC records will be retained as required by regulatory 
            requirements and may be shared with authorized regulatory bodies upon request.
          </p>
          <p className="mb-3">
            6. <strong>Service Continuity:</strong> Failure to complete KYC verification may result in 
            suspension or termination of your mobile services as per regulatory requirements.
          </p>
          <p>
            7. <strong>Support:</strong> For any issues or queries regarding KYC verification, please contact 
            BTC customer support at 123 or visit your nearest BTC shop.
          </p>
        </div>

        {/* Consent Checkbox */}
        <label className="flex items-start gap-3 cursor-pointer">
          <Checkbox
            checked={accepted}
            onCheckedChange={(checked) => setAccepted(checked as boolean)}
            className="mt-0.5"
          />
          <span className="text-sm text-foreground">
            I have read and agree to the Terms & Conditions and Privacy Policy. 
            I consent to the collection and processing of my personal data and biometric information 
            for KYC verification purposes.
          </span>
        </label>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} className="flex-1">
          Back
        </Button>
        <Button
          variant="hero"
          onClick={onAccept}
          disabled={!accepted || isSubmitting}
          className="flex-1"
        >
          <CheckCircle2 className="w-4 h-4 mr-1" />
          {isSubmitting ? "Starting..." : "Accept & Continue"}
        </Button>
      </div>
    </motion.div>
  );
};

export default KYCComplianceTerms;
