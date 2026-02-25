import { useState } from "react";
import { motion } from "framer-motion";
import { ShieldCheck, ArrowRight, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface SmegaInlineKycPayload {
  metamap_verified: boolean;
  first_name: string;
  last_name: string;
  gender: "MALE" | "FEMALE" | "OTHER";
  document_number: string;
  document_type: "NATIONAL_ID" | "PASSPORT" | "DRIVER_LICENSE";
  address: string;
  city: string;
  email: string;
  nationality: string;
  dob: string;
}

interface SmegaInlineKYCProps {
  onSubmit: (payload: SmegaInlineKycPayload) => void;
  onBack: () => void;
  isSubmitting?: boolean;
}

const SmegaInlineKYC = ({ onSubmit, onBack, isSubmitting = false }: SmegaInlineKYCProps) => {
  const [form, setForm] = useState<SmegaInlineKycPayload>({
    metamap_verified: true,
    first_name: "",
    last_name: "",
    gender: "MALE",
    document_number: "",
    document_type: "NATIONAL_ID",
    address: "",
    city: "",
    email: "",
    nationality: "",
    dob: "",
  });
  const [error, setError] = useState("");

  const updateField = (key: keyof SmegaInlineKycPayload, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [key]: value } as SmegaInlineKycPayload));
    if (error) setError("");
  };

  const handleSubmit = () => {
    const required: Array<keyof SmegaInlineKycPayload> = [
      "first_name",
      "last_name",
      "document_number",
      "address",
      "city",
      "email",
      "nationality",
      "dob",
    ];

    const missing = required.find((key) => !String(form[key] || "").trim());
    if (missing) {
      setError("Please complete all required fields.");
      return;
    }

    onSubmit(form);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="max-w-3xl mx-auto"
    >
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full gradient-primary flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="w-8 h-8 text-primary-foreground" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Inline KYC Details</h2>
          <p className="text-muted-foreground">
            Please provide your identity details to complete SMEGA registration.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <Label htmlFor="first_name">First Name</Label>
            <Input
              id="first_name"
              value={form.first_name}
              onChange={(e) => updateField("first_name", e.target.value)}
              placeholder="Moffat"
            />
          </div>
          <div>
            <Label htmlFor="last_name">Last Name</Label>
            <Input
              id="last_name"
              value={form.last_name}
              onChange={(e) => updateField("last_name", e.target.value)}
              placeholder="Matenge"
            />
          </div>
          <div>
            <Label htmlFor="gender">Gender</Label>
            <Select
              value={form.gender}
              onValueChange={(value) => updateField("gender", value)}
            >
              <SelectTrigger id="gender">
                <SelectValue placeholder="Select gender" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MALE">Male</SelectItem>
                <SelectItem value="FEMALE">Female</SelectItem>
                <SelectItem value="OTHER">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="nationality">Nationality</Label>
            <Input
              id="nationality"
              value={form.nationality}
              onChange={(e) => updateField("nationality", e.target.value)}
              placeholder="Motswana"
            />
          </div>
          <div>
            <Label htmlFor="document_type">Document Type</Label>
            <Select
              value={form.document_type}
              onValueChange={(value) => updateField("document_type", value)}
            >
              <SelectTrigger id="document_type">
                <SelectValue placeholder="Select document type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NATIONAL_ID">National ID</SelectItem>
                <SelectItem value="PASSPORT">Passport</SelectItem>
                <SelectItem value="DRIVER_LICENSE">Driver License</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="document_number">Document Number</Label>
            <Input
              id="document_number"
              value={form.document_number}
              onChange={(e) => updateField("document_number", e.target.value)}
              placeholder="935512806"
            />
          </div>
          <div>
            <Label htmlFor="dob">Date of Birth</Label>
            <Input
              id="dob"
              type="date"
              value={form.dob}
              onChange={(e) => updateField("dob", e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => updateField("email", e.target.value)}
              placeholder="moffat@btc.bw"
            />
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="address">Address</Label>
            <Textarea
              id="address"
              value={form.address}
              onChange={(e) => updateField("address", e.target.value)}
              placeholder="Plot 3501 Metlhabeng"
            />
          </div>
          <div>
            <Label htmlFor="city">City</Label>
            <Input
              id="city"
              value={form.city}
              onChange={(e) => updateField("city", e.target.value)}
              placeholder="Tlokweng"
            />
          </div>
        </div>

        {error && (
          <div className="flex gap-3 p-4 bg-destructive/10 rounded-lg border border-destructive/30 mt-5">
            <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        <div className="flex gap-3 mt-8">
          <Button variant="outline" onClick={onBack} className="flex-1">
            Back
          </Button>
          <Button variant="hero" onClick={handleSubmit} disabled={isSubmitting} className="flex-1">
            {isSubmitting ? "Submitting..." : "Continue"}
            {!isSubmitting && <ArrowRight className="w-4 h-4 ml-2" />}
          </Button>
        </div>
      </div>
    </motion.div>
  );
};

export default SmegaInlineKYC;
