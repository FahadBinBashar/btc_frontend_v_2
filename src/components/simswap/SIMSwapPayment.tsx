import { useState } from "react";
import { motion } from "framer-motion";
import { CreditCard, Banknote, CheckCircle2, ArrowRight, Shield, UserCheck, User, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { api } from "@/lib/api";

interface SIMSwapPaymentProps {
  phoneNumber: string;
  requestId: string | number;
  onComplete: () => void;
  onBack: () => void;
}

type PaymentMethod = "card" | "cash";
type CashType = "assisted" | "non_assisted";

const paymentMethods = [
  {
    id: "card" as PaymentMethod,
    name: "Card Payment",
    description: "Visa, Mastercard accepted",
    icon: CreditCard,
  },
  {
    id: "cash" as PaymentMethod,
    name: "Cash",
    description: "Pay with voucher",
    icon: Banknote,
  },
];

const SIM_SWAP_FEE = 10.00;

const SIMSwapPayment = ({ phoneNumber, requestId, onComplete, onBack }: SIMSwapPaymentProps) => {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Cash payment states
  const [cashType, setCashType] = useState<CashType | null>(null);
  const [voucherCode, setVoucherCode] = useState("737373");
  const [customerCareUserId, setCustomerCareUserId] = useState("737373");

  const handlePayment = async () => {
    if (!selectedMethod) return;
    if (!requestId) {
      toast.error("Missing SIM swap session");
      return;
    }
    
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
    
    setIsProcessing(true);
    
    // Simulate payment processing
    setTimeout(async () => {
      setIsProcessing(false);
      toast.success("Payment successful!");
      try {
        await api.simswapPayment(requestId, SIM_SWAP_FEE);
        await api.paymentsRecord({
          msisdn: phoneNumber,
          amount: SIM_SWAP_FEE,
          currency: "BWP",
          status: "completed",
        });
      } catch (err) {
        console.error("Failed to record SIM swap payment:", err);
      }
      onComplete();
    }, 2000);
  };

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
            <CreditCard className="w-8 h-8 text-primary-foreground" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">
            Payment
          </h2>
          <p className="text-muted-foreground">
            Pay the SIM swap fee to proceed
          </p>
        </div>

        {/* Order Summary */}
        <div className="bg-muted rounded-xl p-4 mb-6">
          <h3 className="font-semibold text-foreground mb-3">Order Summary</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Phone Number</span>
              <span className="font-mono text-foreground">+267 {phoneNumber}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">SIM Swap Fee</span>
              <span className="text-foreground">P{SIM_SWAP_FEE.toFixed(2)}</span>
            </div>
            <div className="border-t border-border pt-2 mt-2">
              <div className="flex justify-between font-semibold">
                <span className="text-foreground">Total</span>
                <span className="text-primary text-lg">P{SIM_SWAP_FEE.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Methods */}
        <div className="mb-6">
          <h3 className="font-semibold text-foreground mb-3">Select Payment Method</h3>
          <RadioGroup
            value={selectedMethod || ""}
            onValueChange={(value) => {
              setSelectedMethod(value as PaymentMethod);
              if (value !== 'cash') {
                setCashType(null);
                setVoucherCode("");
                setCustomerCareUserId("");
              }
            }}
            className="space-y-3"
          >
            {paymentMethods.map((method) => {
              const Icon = method.icon;
              return (
                <div
                  key={method.id}
                  className={`relative p-4 rounded-xl border transition-all cursor-pointer ${
                    selectedMethod === method.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/30"
                  }`}
                  onClick={() => {
                    setSelectedMethod(method.id);
                    if (method.id !== 'cash') {
                      setCashType(null);
                      setVoucherCode("");
                      setCustomerCareUserId("");
                    }
                  }}
                >
                  <div className="flex items-center gap-3">
                    <RadioGroupItem value={method.id} id={method.id} />
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <Label htmlFor={method.id} className="font-semibold text-foreground cursor-pointer">
                        {method.name}
                      </Label>
                      <p className="text-sm text-muted-foreground">{method.description}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </RadioGroup>
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
              onValueChange={(value) => setCashType(value as CashType)}
              className="space-y-3"
            >
              <div
                className={`flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer ${
                  cashType === 'assisted' ? 'border-primary bg-primary/5' : 'border-border'
                }`}
                onClick={() => setCashType('assisted')}
              >
                <RadioGroupItem value="assisted" id="sim-assisted" />
                <UserCheck className="w-5 h-5 text-primary" />
                <div className="flex-1">
                  <Label htmlFor="sim-assisted" className="font-medium cursor-pointer">Assisted</Label>
                  <p className="text-xs text-muted-foreground">Customer care person collects cash & generates voucher</p>
                </div>
              </div>
              <div
                className={`flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer ${
                  cashType === 'non_assisted' ? 'border-primary bg-primary/5' : 'border-border'
                }`}
                onClick={() => setCashType('non_assisted')}
              >
                <RadioGroupItem value="non_assisted" id="sim-non-assisted" />
                <User className="w-5 h-5 text-primary" />
                <div className="flex-1">
                  <Label htmlFor="sim-non-assisted" className="font-medium cursor-pointer">Non-Assisted</Label>
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
                  <Label htmlFor="simVoucherCode" className="text-foreground">Voucher Code</Label>
                  <Input
                    id="simVoucherCode"
                    placeholder="Enter voucher code"
                    value={voucherCode}
                    onChange={(e) => setVoucherCode(e.target.value)}
                    className="mt-1"
                  />
                </div>
                
                {cashType === 'assisted' && (
                  <div>
                    <Label htmlFor="simCustomerCareId" className="text-foreground">Customer Care User ID</Label>
                    <Input
                      id="simCustomerCareId"
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

        {/* Security Notice */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6 bg-muted/50 rounded-lg p-3">
          <Shield className="w-4 h-4 text-success" />
          <span>Your payment is secured with 256-bit encryption</span>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button variant="outline" onClick={onBack} className="flex-1">
            Back
          </Button>
          <Button 
            variant="hero" 
            onClick={handlePayment} 
            className="flex-1"
            disabled={!selectedMethod || isProcessing || (selectedMethod === 'cash' && !cashType)}
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                Pay P{SIM_SWAP_FEE.toFixed(2)}
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </div>
    </motion.div>
  );
};

export default SIMSwapPayment;
