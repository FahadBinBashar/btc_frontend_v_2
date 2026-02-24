import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, AlertCircle, FileText, Smartphone, Search, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
// eSIM compatible devices database
const esimCompatibleDevices = [
  // Apple
  "iPhone XS", "iPhone XS Max", "iPhone XR", "iPhone 11", "iPhone 11 Pro", "iPhone 11 Pro Max",
  "iPhone 12", "iPhone 12 Mini", "iPhone 12 Pro", "iPhone 12 Pro Max",
  "iPhone 13", "iPhone 13 Mini", "iPhone 13 Pro", "iPhone 13 Pro Max",
  "iPhone 14", "iPhone 14 Plus", "iPhone 14 Pro", "iPhone 14 Pro Max",
  "iPhone 15", "iPhone 15 Plus", "iPhone 15 Pro", "iPhone 15 Pro Max",
  "iPhone 16", "iPhone 16 Plus", "iPhone 16 Pro", "iPhone 16 Pro Max",
  "iPhone SE (2020)", "iPhone SE (2022)", "iPhone SE 3",
  "iPad Pro 11", "iPad Pro 12.9", "iPad Air (3rd generation)", "iPad Air (4th generation)", "iPad Air (5th generation)",
  "iPad (7th generation)", "iPad (8th generation)", "iPad (9th generation)", "iPad (10th generation)",
  "iPad Mini (5th generation)", "iPad Mini (6th generation)",
  // Samsung
  "Samsung Galaxy S20", "Samsung Galaxy S20+", "Samsung Galaxy S20 Ultra", "Samsung Galaxy S20 FE",
  "Samsung Galaxy S21", "Samsung Galaxy S21+", "Samsung Galaxy S21 Ultra", "Samsung Galaxy S21 FE",
  "Samsung Galaxy S22", "Samsung Galaxy S22+", "Samsung Galaxy S22 Ultra",
  "Samsung Galaxy S23", "Samsung Galaxy S23+", "Samsung Galaxy S23 Ultra", "Samsung Galaxy S23 FE",
  "Samsung Galaxy S24", "Samsung Galaxy S24+", "Samsung Galaxy S24 Ultra",
  "Samsung Galaxy Note 20", "Samsung Galaxy Note 20 Ultra",
  "Samsung Galaxy Z Flip", "Samsung Galaxy Z Flip 3", "Samsung Galaxy Z Flip 4", "Samsung Galaxy Z Flip 5", "Samsung Galaxy Z Flip 6",
  "Samsung Galaxy Z Fold", "Samsung Galaxy Z Fold 2", "Samsung Galaxy Z Fold 3", "Samsung Galaxy Z Fold 4", "Samsung Galaxy Z Fold 5", "Samsung Galaxy Z Fold 6",
  "Samsung Galaxy A54", "Samsung Galaxy A55",
  // Google
  "Google Pixel 3", "Google Pixel 3 XL", "Google Pixel 3a", "Google Pixel 3a XL",
  "Google Pixel 4", "Google Pixel 4 XL", "Google Pixel 4a", "Google Pixel 4a 5G",
  "Google Pixel 5", "Google Pixel 5a",
  "Google Pixel 6", "Google Pixel 6 Pro", "Google Pixel 6a",
  "Google Pixel 7", "Google Pixel 7 Pro", "Google Pixel 7a",
  "Google Pixel 8", "Google Pixel 8 Pro", "Google Pixel 8a",
  "Google Pixel 9", "Google Pixel 9 Pro", "Google Pixel 9 Pro XL",
  "Google Pixel Fold",
  // Huawei
  "Huawei P40", "Huawei P40 Pro", "Huawei Mate 40 Pro",
  // Motorola
  "Motorola Razr 2019", "Motorola Razr 5G", "Motorola Razr 40", "Motorola Razr 40 Ultra",
  "Motorola Edge 40", "Motorola Edge 40 Pro",
  // OnePlus
  "OnePlus 11", "OnePlus 12", "OnePlus Open",
  // Xiaomi
  "Xiaomi 12T Pro", "Xiaomi 13", "Xiaomi 13 Pro", "Xiaomi 14", "Xiaomi 14 Pro",
  // Oppo
  "Oppo Find X3 Pro", "Oppo Find X5 Pro", "Oppo Find N2 Flip",
];

interface TermsConsentProps {
  onAccept: () => void;
  onBack: () => void;
  isSubmitting?: boolean;
}

const TermsConsent = ({ onAccept, onBack, isSubmitting }: TermsConsentProps) => {
  const [accepted, setAccepted] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResult, setSearchResult] = useState<"compatible" | "not-found" | null>(null);
  const [matchedDevice, setMatchedDevice] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setSelectedIndex(-1);
    
    if (query.trim().length < 2) {
      setSearchResult(null);
      setMatchedDevice(null);
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const normalizedQuery = query.toLowerCase().trim();
    const matchingDevices = esimCompatibleDevices.filter(device => 
      device.toLowerCase().includes(normalizedQuery)
    );

    setSuggestions(matchingDevices.slice(0, 6)); // Limit to 6 suggestions
    setShowSuggestions(matchingDevices.length > 0);

    // Only show not-found if no matches at all
    if (matchingDevices.length === 0) {
      setSearchResult("not-found");
      setMatchedDevice(null);
    } else {
      setSearchResult(null);
      setMatchedDevice(null);
    }
  };

  const selectDevice = (device: string) => {
    setSearchQuery(device);
    setMatchedDevice(device);
    setSearchResult("compatible");
    setShowSuggestions(false);
    setSuggestions([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : prev));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === "Enter" && selectedIndex >= 0) {
      e.preventDefault();
      selectDevice(suggestions[selectedIndex]);
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="max-w-2xl mx-auto"
    >
      {/* Important Notice */}
      <div className="bg-warning/10 border border-warning/30 rounded-xl p-4 mb-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-warning mt-0.5" />
          <div>
            <h4 className="font-semibold text-foreground mb-1">Important Information</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• eSIM is only available for compatible devices</li>
              <li>• Please check your device settings to verify eSIM compatibility</li>
              <li>• Go to Settings → Cellular/Mobile → Add eSIM to verify</li>
              <li>• You can also dial <strong className="font-mono text-foreground">*#06#</strong> on your phone — if IMEI numbers appear, your device likely supports eSIM</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Compatibility Check */}
      <div className="bg-card border border-border rounded-xl p-6 mb-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center">
            <Smartphone className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Device Compatibility</h3>
            <p className="text-sm text-muted-foreground">Ensure your device supports eSIM</p>
          </div>
        </div>

        {/* Search Input */}
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
            <Input
              ref={inputRef}
              type="text"
              placeholder="Search your phone model (e.g. iPhone 14, Galaxy S23)"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
              onKeyDown={handleKeyDown}
              className="pl-10"
            />
            
            {/* Autocomplete Suggestions */}
            <AnimatePresence>
              {showSuggestions && suggestions.length > 0 && (
                <motion.div
                  ref={suggestionsRef}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-20 overflow-hidden"
                >
                  <ScrollArea className="max-h-48">
                    {suggestions.map((device, index) => (
                      <button
                        key={device}
                        type="button"
                        onClick={() => selectDevice(device)}
                        className={`w-full px-4 py-2.5 text-left text-sm flex items-center gap-2 transition-colors ${
                          index === selectedIndex
                            ? "bg-primary/10 text-primary"
                            : "hover:bg-muted text-foreground"
                        }`}
                      >
                        <Smartphone className="w-4 h-4 text-muted-foreground" />
                        <span>{device}</span>
                        <Check className="w-4 h-4 text-primary ml-auto" />
                      </button>
                    ))}
                  </ScrollArea>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          {/* Search Result */}
          {searchResult === "compatible" && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-3 p-3 rounded-lg bg-primary/10 border border-primary/30 flex items-center gap-2"
            >
              <Check className="w-5 h-5 text-primary" />
              <span className="text-sm text-foreground">
                <strong>{matchedDevice}</strong> is eSIM compatible!
              </span>
            </motion.div>
          )}
          
          {searchResult === "not-found" && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-3 p-3 rounded-lg bg-destructive/10 border border-destructive/30 flex items-center gap-2"
            >
              <X className="w-5 h-5 text-destructive" />
              <span className="text-sm text-foreground">
                Device not found in our database. Please check with your manufacturer or try a different search term.
              </span>
            </motion.div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="p-3 rounded-lg bg-muted">
            <p className="font-medium text-foreground">iPhone</p>
            <p className="text-muted-foreground">XS, XR and newer</p>
          </div>
          <div className="p-3 rounded-lg bg-muted">
            <p className="font-medium text-foreground">Samsung</p>
            <p className="text-muted-foreground">S20 and newer</p>
          </div>
          <div className="p-3 rounded-lg bg-muted">
            <p className="font-medium text-foreground">Google Pixel</p>
            <p className="text-muted-foreground">Pixel 3 and newer</p>
          </div>
          <div className="p-3 rounded-lg bg-muted">
            <p className="font-medium text-foreground">Other</p>
            <p className="text-muted-foreground">Check manufacturer</p>
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
          <h4 className="font-semibold text-foreground mb-2">BTC eSIM Service Terms</h4>
          <p className="mb-3">
            By using the BTC eSIM service, you agree to the following terms and conditions:
          </p>
          <p className="mb-3">
            1. <strong>Eligibility:</strong> You must be at least 18 years old and provide valid identification 
            to purchase and activate an eSIM.
          </p>
          <p className="mb-3">
            2. <strong>KYC Compliance:</strong> You consent to identity verification processes including 
            document capture and biometric verification as required by BOCRA regulations.
          </p>
          <p className="mb-3">
            3. <strong>Service Usage:</strong> The eSIM service is for personal use only. Any misuse or 
            fraudulent activity will result in service termination.
          </p>
          <p className="mb-3">
            4. <strong>Data Protection:</strong> Your personal information will be processed in accordance 
            with applicable data protection laws and BTC's privacy policy.
          </p>
          <p className="mb-3">
            5. <strong>Device Compatibility:</strong> BTC is not responsible for compatibility issues with 
            devices that do not support eSIM technology.
          </p>
          <p className="mb-3">
            6. <strong>Activation:</strong> The eSIM profile is single-use and will be bound to your device 
            upon activation. Transfer to another device may require a new profile.
          </p>
          <p>
            7. <strong>Support:</strong> For any issues or queries, please contact BTC customer support.
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
            I consent to the collection and processing of my personal data for KYC verification.
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

export default TermsConsent;
