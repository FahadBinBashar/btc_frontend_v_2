import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { MapPin, Clock, Phone, CheckCircle2, ArrowRight, Store, Download } from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { api } from "@/lib/api";

interface SIMSwapShopSelectionProps {
  phoneNumber: string;
  requestId: string | number;
  onComplete: () => void;
  onBack: () => void;
}

const shops = [
  {
    id: "shop-1",
    name: "BTC Main Mall",
    address: "Main Mall, Gaborone",
    hours: "Mon-Sat: 8:00 AM - 6:00 PM",
    phone: "+267 3600 100",
  },
  {
    id: "shop-2",
    name: "BTC Game City",
    address: "Game City Mall, Gaborone",
    hours: "Mon-Sun: 9:00 AM - 8:00 PM",
    phone: "+267 3600 200",
  },
  {
    id: "shop-3",
    name: "BTC Francistown",
    address: "Nzano Centre, Francistown",
    hours: "Mon-Sat: 8:00 AM - 5:00 PM",
    phone: "+267 2600 300",
  },
  {
    id: "shop-4",
    name: "BTC Maun",
    address: "Ngami Centre, Maun",
    hours: "Mon-Fri: 8:00 AM - 5:00 PM",
    phone: "+267 6860 400",
  },
  {
    id: "shop-5",
    name: "BTC Kasane",
    address: "President Avenue, Kasane",
    hours: "Mon-Fri: 8:00 AM - 4:30 PM",
    phone: "+267 6250 500",
  },
];

const SIMSwapShopSelection = ({ phoneNumber, requestId, onComplete, onBack }: SIMSwapShopSelectionProps) => {
  const [selectedShop, setSelectedShop] = useState<string | null>(null);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const confirmationRef = useRef<HTMLDivElement>(null);

  const handleConfirm = () => {
    if (!selectedShop) return;
    if (!requestId) {
      toast.error("Missing SIM swap session");
      return;
    }
    
    setIsSubmitting(true);
    
    const shopId = Number(String(selectedShop).replace("shop-", "")) || 1;
    api.simswapSelectShop(requestId, shopId)
      .then(() => {
        setIsSubmitting(false);
        setIsConfirmed(true);
        toast.success("SIM swap request confirmed!");
      })
      .catch((error) => {
        console.error("Failed to select shop:", error);
        setIsSubmitting(false);
        toast.error("Failed to confirm shop selection");
      });
  };

  const handleDownload = async () => {
    if (!confirmationRef.current) return;
    
    setIsDownloading(true);
    
    try {
      const canvas = await html2canvas(confirmationRef.current, {
        scale: 2,
        backgroundColor: "#ffffff",
        useCORS: true,
      });
      
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });
      
      const imgWidth = 190;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      pdf.addImage(imgData, "PNG", 10, 10, imgWidth, imgHeight);
      pdf.save(`SIM_Swap_Confirmation_${phoneNumber}.pdf`);
      
      toast.success("Confirmation downloaded!");
    } catch (error) {
      console.error("Download failed:", error);
      toast.error("Failed to download confirmation");
    } finally {
      setIsDownloading(false);
    }
  };

  const selectedShopDetails = shops.find(s => s.id === selectedShop);

  if (isConfirmed && selectedShopDetails) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-xl mx-auto"
      >
        <div ref={confirmationRef} className="bg-card border border-success/30 rounded-xl p-8 text-center">
          <div className="w-24 h-24 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-12 h-12 text-success" />
          </div>
          
          <h2 className="text-2xl font-bold text-foreground mb-2">Request Confirmed!</h2>
          <p className="text-muted-foreground mb-6">
            Your SIM swap request has been submitted. Please visit the store to collect your new SIM.
          </p>

          <div className="bg-muted rounded-xl p-6 mb-6 text-left">
            <p className="text-sm text-muted-foreground mb-2">Phone Number</p>
            <p className="text-xl font-bold font-mono text-foreground mb-4">
              +267 {phoneNumber}
            </p>
            
            <div className="border-t border-border pt-4">
              <p className="text-sm text-muted-foreground mb-2">Collection Point</p>
              <p className="font-semibold text-foreground">{selectedShopDetails.name}</p>
              <p className="text-sm text-muted-foreground">{selectedShopDetails.address}</p>
            </div>
          </div>

          <div className="space-y-3 text-left bg-muted/50 rounded-lg p-4 mb-6">
            <h4 className="font-semibold text-foreground">What to bring:</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-success" />
                <span>Your original ID (Omang or Passport)</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-success" />
                <span>This confirmation (screenshot or reference)</span>
              </li>
            </ul>
          </div>

          <div className="bg-warning/10 border border-warning/30 rounded-lg p-4 mb-6">
            <p className="text-sm text-warning-foreground">
              <strong>Important:</strong> Your request is valid for 7 days. Please collect your SIM within this period.
            </p>
          </div>

          <div className="flex gap-3">
            <Button 
              variant="outline" 
              onClick={handleDownload} 
              className="flex-1"
              disabled={isDownloading}
            >
              <Download className="w-4 h-4 mr-2" />
              {isDownloading ? "Downloading..." : "Download"}
            </Button>
            <Button variant="hero" onClick={onComplete} className="flex-1">
              Done
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </motion.div>
    );
  }

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
            <Store className="w-8 h-8 text-primary-foreground" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">
            Choose Collection Point
          </h2>
          <p className="text-muted-foreground">
            Select a BTC store to collect your new physical SIM
          </p>
        </div>

        {/* Shop Selection */}
        <RadioGroup
          value={selectedShop || ""}
          onValueChange={setSelectedShop}
          className="space-y-3 mb-6"
        >
          {shops.map((shop) => (
            <div
              key={shop.id}
              className={`relative p-4 rounded-xl border transition-all cursor-pointer ${
                selectedShop === shop.id
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/30"
              }`}
              onClick={() => setSelectedShop(shop.id)}
            >
              <div className="flex items-start gap-3">
                <RadioGroupItem value={shop.id} id={shop.id} className="mt-1" />
                <div className="flex-1">
                  <Label htmlFor={shop.id} className="font-semibold text-foreground cursor-pointer">
                    {shop.name}
                  </Label>
                  <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                    <p className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      {shop.address}
                    </p>
                    <p className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      {shop.hours}
                    </p>
                    <p className="flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      {shop.phone}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </RadioGroup>

        {/* Phone Number Display */}
        <div className="bg-muted rounded-lg p-4 mb-6">
          <p className="text-sm text-muted-foreground mb-1">Number to be swapped</p>
          <p className="font-mono font-semibold text-foreground text-lg">
            +267 {phoneNumber}
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button variant="outline" onClick={onBack} className="flex-1">
            Back
          </Button>
          <Button 
            variant="hero" 
            onClick={handleConfirm} 
            className="flex-1"
            disabled={!selectedShop || isSubmitting}
          >
            {isSubmitting ? "Confirming..." : "Confirm Selection"}
            {!isSubmitting && <ArrowRight className="w-4 h-4 ml-2" />}
          </Button>
        </div>
      </div>
    </motion.div>
  );
};

export default SIMSwapShopSelection;
