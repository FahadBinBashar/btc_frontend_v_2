import { useState } from "react";
import { motion } from "framer-motion";
import { 
  CreditCard, 
  Banknote,
  Shield,
  Loader2,
  CheckCircle2,
  UserCheck,
  User
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { api } from "@/lib/api";
import { toast } from "sonner";

interface PaymentStepProps {
  selectedPlan: string;
  requestId: string | number;
  onComplete: (plan: string) => void;
  onBack: () => void;
}

const paymentMethods = [
  { id: "card", name: "Card Payment", icon: CreditCard, description: "Visa, Mastercard" },
  { id: "cash", name: "Cash", icon: Banknote, description: "Pay with voucher" },
];

const planOptions = [
  { id: "esim", name: "eSIM Only", price: 10, data: null, minutes: null, sms: null },
  { id: "starter", name: "Starter Pack", price: 50, data: "1GB", minutes: "50", sms: "50" },
  { id: "value", name: "Value Pack", price: 100, data: "3GB", minutes: "150", sms: "100", popular: true },
  { id: "premium", name: "Premium Pack", price: 200, data: "8GB", minutes: "Unlimited", sms: "Unlimited" },
];

const PaymentStep = ({ selectedPlan, requestId, onComplete, onBack }: PaymentStepProps) => {
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [currentPlan, setCurrentPlan] = useState<string>(selectedPlan || "starter");
  const [processing, setProcessing] = useState(false);
  const [completed, setCompleted] = useState(false);
  
  // Cash payment states
  const [cashType, setCashType] = useState<"assisted" | "non_assisted" | null>(null);
  const [voucherCode, setVoucherCode] = useState("737373");
  const [customerCareUserId, setCustomerCareUserId] = useState("737373");

  const plan = planOptions.find(p => p.id === currentPlan) || planOptions[0];
  const activationFee = plan.id === "esim" ? 0 : 10;
  const total = plan.price + activationFee;

  const handlePayment = async () => {
    if (selectedMethod === 'cash') {
      if (!cashType) {
        toast.error("Please select assisted or non-assisted");
        return;
      }
      if (!voucherCode.trim()) {
        toast.error("Please enter voucher code");
        return;
      }
      if (cashType === 'assisted' && !customerCareUserId.trim()) {
        toast.error("Please enter Customer Care User ID");
        return;
      }
    }

    if (!requestId) {
      toast.error("Missing eSIM session");
      return;
    }

    setProcessing(true);
    
    // Simulate payment processing
    setTimeout(async () => {
      setProcessing(false);
      setCompleted(true);
      try {
        await api.esimPayment(requestId, total);
        await api.paymentsRecord({
          amount: total,
          currency: "BWP",
          status: "completed",
        });
      } catch (error) {
        console.error("Failed to record payment:", error);
      }
    }, 2000);
  };

  if (completed) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md mx-auto bg-card border border-border rounded-xl p-8 text-center"
      >
        <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-10 h-10 text-success" />
        </div>
        <h3 className="text-2xl font-bold text-foreground mb-2">Payment Successful!</h3>
        <p className="text-muted-foreground mb-6">
          Your payment of <strong>P{total}.00</strong> has been processed successfully.
        </p>
        <Button variant="hero" onClick={() => onComplete(currentPlan)} className="w-full">
          Update Your Information & Choose Your Number
        </Button>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="max-w-3xl mx-auto"
    >
      {/* Select Your Plan */}
      <div className="bg-card border border-border rounded-xl p-6 mb-6">
        <h3 className="font-semibold text-foreground mb-4">Select Your Plan</h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {planOptions.map((option) => (
            <button
              key={option.id}
              onClick={() => setCurrentPlan(option.id)}
              className={`relative p-4 rounded-xl border-2 text-center transition-all ${
                currentPlan === option.id
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              }`}
            >
              {option.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-amber-500 text-white text-xs font-medium rounded-full">
                  Popular
                </span>
              )}
              <h4 className="font-semibold text-foreground">{option.name}</h4>
              <p className="text-2xl font-bold text-primary my-2">P{option.price}</p>
              <p className="text-xs text-muted-foreground mb-3">{option.data ? "30 days" : "Activation"}</p>
              {option.data ? (
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p>✓ {option.data} Data</p>
                  <p>✓ {option.minutes} Minutes</p>
                  <p>✓ {option.sms} SMS</p>
                </div>
              ) : (
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p>✓ eSIM Card</p>
                  <p>✓ Phone Number</p>
                  <p className="text-xs">No bundle included</p>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Order Summary */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="font-semibold text-foreground mb-4">Order Summary</h3>
          
          <div className="space-y-4 mb-6">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{plan.name}</span>
              <span className="font-medium text-foreground">P{plan.price}.00</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Activation Fee</span>
              <span className="font-medium text-foreground">P{activationFee}.00</span>
            </div>
            <div className="border-t border-border pt-4">
              <div className="flex justify-between">
                <span className="font-semibold text-foreground">Total</span>
                <span className="font-bold text-xl text-primary">P{total}.00</span>
              </div>
            </div>
          </div>

          <div className="bg-muted rounded-lg p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Shield className="w-4 h-4 text-success" />
              <span>Secure payment processing</span>
            </div>
          </div>
        </div>

        {/* Payment Methods */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="font-semibold text-foreground mb-4">Select Payment Method</h3>

          <div className="space-y-3 mb-6">
            {paymentMethods.map((method) => (
              <button
                key={method.id}
                onClick={() => {
                  setSelectedMethod(method.id);
                  if (method.id !== 'cash') {
                    setCashType(null);
                    setVoucherCode("");
                    setCustomerCareUserId("");
                  }
                }}
                className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
                  selectedMethod === method.id
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/30"
                }`}
              >
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                  selectedMethod === method.id ? "gradient-primary" : "bg-muted"
                }`}>
                  <method.icon className={`w-6 h-6 ${
                    selectedMethod === method.id ? "text-primary-foreground" : "text-muted-foreground"
                  }`} />
                </div>
                <div className="text-left">
                  <p className="font-medium text-foreground">{method.name}</p>
                  <p className="text-sm text-muted-foreground">{method.description}</p>
                </div>
              </button>
            ))}
          </div>

          {/* Cash Payment Options */}
          {selectedMethod === 'cash' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="space-y-4 mb-6 border-t border-border pt-4"
            >
              <Label className="text-foreground font-medium">Payment Type</Label>
              <RadioGroup
                value={cashType || ""}
                onValueChange={(value) => setCashType(value as "assisted" | "non_assisted")}
                className="space-y-3"
              >
                <div
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer ${
                    cashType === 'assisted' ? 'border-primary bg-primary/5' : 'border-border'
                  }`}
                  onClick={() => setCashType('assisted')}
                >
                  <RadioGroupItem value="assisted" id="assisted" />
                  <UserCheck className="w-5 h-5 text-primary" />
                  <div className="flex-1">
                    <Label htmlFor="assisted" className="font-medium cursor-pointer">Assisted</Label>
                    <p className="text-xs text-muted-foreground">Customer care person collects cash & generates voucher</p>
                  </div>
                </div>
                <div
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer ${
                    cashType === 'non_assisted' ? 'border-primary bg-primary/5' : 'border-border'
                  }`}
                  onClick={() => setCashType('non_assisted')}
                >
                  <RadioGroupItem value="non_assisted" id="non_assisted" />
                  <User className="w-5 h-5 text-primary" />
                  <div className="flex-1">
                    <Label htmlFor="non_assisted" className="font-medium cursor-pointer">Non-Assisted</Label>
                    <p className="text-xs text-muted-foreground">Buy voucher in store and enter it yourself</p>
                  </div>
                </div>
              </RadioGroup>

              {cashType && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-4 pt-2"
                >
                  <div>
                    <Label htmlFor="voucherCode" className="text-foreground">Voucher Code</Label>
                    <Input
                      id="voucherCode"
                      placeholder="Enter voucher code"
                      value={voucherCode}
                      onChange={(e) => setVoucherCode(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  
                  {cashType === 'assisted' && (
                    <div>
                      <Label htmlFor="customerCareId" className="text-foreground">Customer Care User ID</Label>
                      <Input
                        id="customerCareId"
                        placeholder="Enter customer care user ID"
                        value={customerCareUserId}
                        onChange={(e) => setCustomerCareUserId(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                  )}
                </motion.div>
              )}
            </motion.div>
          )}

          <div className="flex gap-3">
            <Button variant="outline" onClick={onBack} className="flex-1">
              Back
            </Button>
            <Button
              variant="hero"
              onClick={handlePayment}
              disabled={!selectedMethod || processing || (selectedMethod === 'cash' && !cashType)}
              className="flex-1"
            >
              {processing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>Pay P{total}.00</>
              )}
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default PaymentStep;
