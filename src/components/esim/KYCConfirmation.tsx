import { useState } from "react";
import { motion } from "framer-motion";
import { 
  User, 
  Calendar, 
  CreditCard, 
  Flag, 
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

interface KYCConfirmationProps {
  kycData: {
    full_name: string | null;
    first_name: string | null;
    surname: string | null;
    date_of_birth: string | null;
    sex: string | null;
    document_type: "omang" | "passport";
    document_number: string | null;
    country: string | null;
    expiry_date: string | null;
  };
  onConfirm: () => void;
  onBack: () => void;
}

const KYCConfirmation = ({ kycData, onConfirm, onBack }: KYCConfirmationProps) => {
  const [confirmed, setConfirmed] = useState(false);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    try {
      return format(new Date(dateStr), "dd MMMM yyyy");
    } catch {
      return dateStr;
    }
  };

  const getSexLabel = (sex: string | null) => {
    if (!sex) return "-";
    if (sex.toLowerCase() === "m" || sex.toLowerCase() === "male") return "Male";
    if (sex.toLowerCase() === "f" || sex.toLowerCase() === "female") return "Female";
    return sex;
  };

  const getDocumentTypeLabel = (type: "omang" | "passport") => {
    return type === "omang" ? "Omang (National ID)" : "Passport";
  };

  const dataFields = [
    { 
      icon: User, 
      label: "Full Name", 
      value: kycData.full_name || `${kycData.first_name || ""} ${kycData.surname || ""}`.trim() || "-",
      iconBg: "bg-primary/10",
      iconColor: "text-primary"
    },
    { 
      icon: Calendar, 
      label: "Date of Birth", 
      value: formatDate(kycData.date_of_birth),
      iconBg: "bg-accent/10",
      iconColor: "text-accent-foreground"
    },
    { 
      icon: User, 
      label: "Sex", 
      value: getSexLabel(kycData.sex),
      iconBg: "bg-success/10",
      iconColor: "text-success"
    },
    { 
      icon: CreditCard, 
      label: "Document Type", 
      value: getDocumentTypeLabel(kycData.document_type),
      iconBg: "bg-warning/10",
      iconColor: "text-warning"
    },
    { 
      icon: CreditCard, 
      label: "Document Number", 
      value: kycData.document_number || "-",
      iconBg: "bg-primary/10",
      iconColor: "text-primary"
    },
    { 
      icon: Flag, 
      label: "Country", 
      value: kycData.country || "-",
      iconBg: "bg-accent/10",
      iconColor: "text-accent-foreground"
    },
    { 
      icon: Calendar, 
      label: "Document Expiry", 
      value: formatDate(kycData.expiry_date),
      iconBg: "bg-muted",
      iconColor: "text-muted-foreground"
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="max-w-2xl mx-auto"
    >
      <div className="bg-card border border-border rounded-xl p-6">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-success" />
          </div>
          <h3 className="text-xl font-bold text-foreground mb-2">Verify Your Information</h3>
          <p className="text-muted-foreground text-sm max-w-md mx-auto">
            Please review the information extracted from your identity document. 
            This data will be used for your eSIM registration.
          </p>
        </div>

        {/* KYC Data Display */}
        <div className="bg-muted/30 border border-border rounded-xl p-6 mb-6">
          <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
            Extracted Information
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {dataFields.map((field, index) => (
              <div 
                key={field.label} 
                className={`flex items-start gap-3 p-3 bg-background rounded-lg border border-border ${
                  index === 0 ? "md:col-span-2" : ""
                }`}
              >
                <div className={`w-10 h-10 rounded-lg ${field.iconBg} flex items-center justify-center flex-shrink-0`}>
                  <field.icon className={`w-5 h-5 ${field.iconColor}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                    {field.label}
                  </p>
                  <p className="text-foreground font-semibold truncate">
                    {field.value}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Notice */}
        <div className="bg-accent/10 border border-accent/30 rounded-lg p-4 mb-6 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-accent-foreground flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-foreground font-medium">Important Notice</p>
            <p className="text-xs text-muted-foreground mt-1">
              This information cannot be changed as it was extracted from your official identity document. 
              If any information is incorrect, please contact support.
            </p>
          </div>
        </div>

        {/* Confirmation Radio */}
        <div className="mb-8">
          <label 
            className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
              confirmed 
                ? "border-success bg-success/5" 
                : "border-border bg-muted/30 hover:border-primary/50"
            }`}
          >
            <input
              type="radio"
              name="confirmation"
              checked={confirmed}
              onChange={() => setConfirmed(true)}
              className="w-5 h-5 text-success accent-success"
            />
            <div className="flex-1">
              <span className="text-foreground font-medium block">
                I confirm that the information above is correct
              </span>
              <span className="text-xs text-muted-foreground">
                By confirming, you agree that this data will be used for your eSIM registration
              </span>
            </div>
            {confirmed && (
              <CheckCircle2 className="w-6 h-6 text-success" />
            )}
          </label>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button variant="outline" onClick={onBack} className="flex-1">
            Back
          </Button>
          <Button
            variant="hero"
            onClick={onConfirm}
            disabled={!confirmed}
            className="flex-1"
          >
            Continue to Additional Details
          </Button>
        </div>
      </div>
    </motion.div>
  );
};

export default KYCConfirmation;
