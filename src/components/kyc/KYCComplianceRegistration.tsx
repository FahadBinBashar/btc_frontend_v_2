import { useState } from "react";
import { motion } from "framer-motion";
import { MapPin, Users, Mail, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { z } from "zod";
import { toast } from "sonner";

interface KYCComplianceRegistrationProps {
  onSubmit: (data: any) => void;
  onBack: () => void;
}

const nextOfKinRelations = [
  "Spouse",
  "Parent",
  "Child",
  "Sibling",
  "Guardian",
  "Other Relative",
  "Friend",
];

const registrationSchema = z.object({
  plotNumber: z.string().trim().min(1, "Plot number is required").max(50, "Plot number too long"),
  ward: z.string().trim().min(1, "Ward is required").max(50, "Ward name too long"),
  village: z.string().trim().min(1, "Village is required").max(100, "Village name too long"),
  city: z.string().trim().min(1, "City is required").max(100, "City name too long"),
  postalAddress: z.string().trim().max(200, "Postal address too long").optional().default(""),
  nextOfKinName: z
    .string()
    .trim()
    .min(1, "Next of kin name is required")
    .max(100, "Name too long"),
  nextOfKinRelation: z
    .string()
    .trim()
    .min(1, "Relationship is required"),
  nextOfKinPhone: z
    .string()
    .trim()
    .min(1, "Phone number is required")
    .max(20, "Phone number too long"),
  email: z.string().trim().max(255, "Email too long").optional().default(""),
});

const KYCComplianceRegistration = ({ onSubmit, onBack }: KYCComplianceRegistrationProps) => {
  const [formData, setFormData] = useState({
    plotNumber: "",
    ward: "",
    village: "",
    city: "",
    postalAddress: "",
    nextOfKinName: "",
    nextOfKinRelation: "",
    nextOfKinPhone: "",
    email: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const handleSubmit = () => {
    try {
      const validated = registrationSchema.parse(formData);
      setErrors({});
      onSubmit(validated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            newErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(newErrors);
        toast.error("Please fix the form errors");
      }
    }
  };

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
          <h3 className="text-xl font-bold text-foreground mb-2">Additional Details</h3>
          <p className="text-muted-foreground text-sm">
            Please provide your address and emergency contact information
          </p>
        </div>

        {/* Address Information */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg gradient-accent flex items-center justify-center">
              <MapPin className="w-5 h-5 text-accent-foreground" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Residential Address</h3>
              <p className="text-sm text-muted-foreground">Your current physical address</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="plotNumber">Plot Number *</Label>
              <Input
                id="plotNumber"
                value={formData.plotNumber}
                onChange={(e) => handleChange("plotNumber", e.target.value)}
                placeholder="e.g., Plot 123"
                className={`mt-1 ${errors.plotNumber ? "border-destructive" : ""}`}
              />
              {errors.plotNumber && (
                <p className="text-xs text-destructive mt-1">{errors.plotNumber}</p>
              )}
            </div>
            <div>
              <Label htmlFor="ward">Ward *</Label>
              <Input
                id="ward"
                value={formData.ward}
                onChange={(e) => handleChange("ward", e.target.value)}
                placeholder="e.g., Ward 5"
                className={`mt-1 ${errors.ward ? "border-destructive" : ""}`}
              />
              {errors.ward && (
                <p className="text-xs text-destructive mt-1">{errors.ward}</p>
              )}
            </div>
            <div>
              <Label htmlFor="village">Village *</Label>
              <Input
                id="village"
                value={formData.village}
                onChange={(e) => handleChange("village", e.target.value)}
                placeholder="e.g., Molepolole"
                className={`mt-1 ${errors.village ? "border-destructive" : ""}`}
              />
              {errors.village && (
                <p className="text-xs text-destructive mt-1">{errors.village}</p>
              )}
            </div>
            <div>
              <Label htmlFor="city">City *</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => handleChange("city", e.target.value)}
                placeholder="e.g., Gaborone"
                className={`mt-1 ${errors.city ? "border-destructive" : ""}`}
              />
              {errors.city && (
                <p className="text-xs text-destructive mt-1">{errors.city}</p>
              )}
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="postalAddress">Postal Address (Optional)</Label>
              <Input
                id="postalAddress"
                value={formData.postalAddress}
                onChange={(e) => handleChange("postalAddress", e.target.value)}
                placeholder="e.g., P.O. Box 123, Gaborone"
                className={`mt-1 ${errors.postalAddress ? "border-destructive" : ""}`}
              />
              {errors.postalAddress && (
                <p className="text-xs text-destructive mt-1">{errors.postalAddress}</p>
              )}
            </div>
          </div>
        </div>

        {/* Next of Kin */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-success/20 flex items-center justify-center">
              <Users className="w-5 h-5 text-success" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Next of Kin</h3>
              <p className="text-sm text-muted-foreground">Emergency contact information</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="nextOfKinName">Full Name *</Label>
              <Input
                id="nextOfKinName"
                value={formData.nextOfKinName}
                onChange={(e) => handleChange("nextOfKinName", e.target.value)}
                placeholder="Enter full name"
                className={`mt-1 ${errors.nextOfKinName ? "border-destructive" : ""}`}
              />
              {errors.nextOfKinName && (
                <p className="text-xs text-destructive mt-1">{errors.nextOfKinName}</p>
              )}
            </div>
            <div>
              <Label htmlFor="nextOfKinRelation">Relationship *</Label>
              <Select
                value={formData.nextOfKinRelation}
                onValueChange={(value) => handleChange("nextOfKinRelation", value)}
              >
                <SelectTrigger className={`mt-1 ${errors.nextOfKinRelation ? "border-destructive" : ""}`}>
                  <SelectValue placeholder="Select relationship" />
                </SelectTrigger>
                <SelectContent>
                  {nextOfKinRelations.map((relation) => (
                    <SelectItem key={relation} value={relation.toLowerCase()}>
                      {relation}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.nextOfKinRelation && (
                <p className="text-xs text-destructive mt-1">{errors.nextOfKinRelation}</p>
              )}
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="nextOfKinPhone">Phone Number *</Label>
              <div className="relative mt-1">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="nextOfKinPhone"
                  value={formData.nextOfKinPhone}
                  onChange={(e) => handleChange("nextOfKinPhone", e.target.value)}
                  placeholder="+267 73 XXX XXXX"
                  className={`pl-10 ${errors.nextOfKinPhone ? "border-destructive" : ""}`}
                />
              </div>
              {errors.nextOfKinPhone && (
                <p className="text-xs text-destructive mt-1">{errors.nextOfKinPhone}</p>
              )}
            </div>
          </div>
        </div>

        {/* Email (Optional) */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
              <Mail className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Email Address</h3>
              <p className="text-sm text-muted-foreground">Optional - for notifications and receipts</p>
            </div>
          </div>

          <div>
            <Label htmlFor="email">Email (Optional)</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleChange("email", e.target.value)}
              placeholder="your.email@example.com"
              className={`mt-1 ${errors.email ? "border-destructive" : ""}`}
            />
            {errors.email && (
              <p className="text-xs text-destructive mt-1">{errors.email}</p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button variant="outline" onClick={onBack} className="flex-1">
            Back
          </Button>
          <Button
            variant="hero"
            onClick={handleSubmit}
            className="flex-1"
          >
            Continue to Verification
          </Button>
        </div>
      </div>
    </motion.div>
  );
};

export default KYCComplianceRegistration;
