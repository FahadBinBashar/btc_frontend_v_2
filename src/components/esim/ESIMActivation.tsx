import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { 
  QrCode, 
  Smartphone, 
  CheckCircle2, 
  Copy, 
  Clock,
  ArrowRight,
  HelpCircle,
  Download,
  Mail
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { api } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface ESIMActivationProps {
  selectedNumber: string;
  requestId: string | number;
  onComplete: () => void;
}

const ESIMActivation = ({ selectedNumber, requestId, onComplete }: ESIMActivationProps) => {
  const [activationCode] = useState("LPA:1$btc-esim.com$" + Math.random().toString(36).substring(2, 15).toUpperCase());
  const [timeRemaining, setTimeRemaining] = useState(900); // 15 minutes
  const [activated, setActivated] = useState(false);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);
  const qrCodeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!requestId) return;
    api.esimActivate(requestId).catch((err) => {
      console.error("Failed to activate eSIM:", err);
    });
  }, [requestId]);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 0) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const copyCode = () => {
    navigator.clipboard.writeText(activationCode);
    toast.success("Activation code copied to clipboard!");
  };

  const simulateActivation = () => {
    setActivated(true);
  };

  const saveToGallery = async () => {
    if (!qrCodeRef.current) return;
    
    try {
      // Create a canvas from the QR code element
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      
      canvas.width = 400;
      canvas.height = 500;
      
      // Draw white background
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Draw title
      ctx.fillStyle = "#000000";
      ctx.font = "bold 20px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("BTC eSIM Activation", canvas.width / 2, 40);
      
      // Draw phone number
      ctx.font = "16px sans-serif";
      ctx.fillText(`Number: +267 ${selectedNumber}`, canvas.width / 2, 70);
      
      // Draw QR placeholder pattern
      ctx.fillStyle = "#f3f4f6";
      ctx.fillRect(50, 100, 300, 300);
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 4;
      ctx.strokeRect(50, 100, 300, 300);
      
      // Draw pattern inside (simulating QR code)
      for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 8; j++) {
          if (Math.random() > 0.5) {
            ctx.fillStyle = "#000000";
            ctx.fillRect(70 + i * 32, 120 + j * 32, 28, 28);
          }
        }
      }
      
      // Draw activation code
      ctx.fillStyle = "#666666";
      ctx.font = "12px monospace";
      ctx.fillText(activationCode, canvas.width / 2, 430);
      
      // Draw instructions
      ctx.font = "11px sans-serif";
      ctx.fillText("Scan this QR code in Settings → Cellular → Add eSIM", canvas.width / 2, 460);
      
      // Convert to blob and download
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `BTC-eSIM-${selectedNumber}.png`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          toast.success("eSIM QR code saved to downloads!");
        }
      }, "image/png");
    } catch (error) {
      toast.error("Failed to save QR code. Please try again.");
    }
  };

  const sendEmailWithQR = async () => {
    if (!email || !email.includes("@")) {
      toast.error("Please enter a valid email address");
      return;
    }
    
    setSendingEmail(true);
    
    // Simulate email sending (in production, this would call an edge function)
    setTimeout(() => {
      setSendingEmail(false);
      setEmailDialogOpen(false);
      setEmail("");
      toast.success(`eSIM QR code sent to ${email}!`);
    }, 1500);
  };

  if (activated) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-xl mx-auto"
      >
        <div className="bg-card border border-success/30 rounded-xl p-8 text-center">
          <div className="w-24 h-24 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-12 h-12 text-success" />
          </div>
          
          <h2 className="text-2xl font-bold text-foreground mb-2">eSIM Activated!</h2>
          <p className="text-muted-foreground mb-6">
            Your eSIM is now active and connected to the BTC network.
          </p>

          <div className="bg-muted rounded-xl p-6 mb-6">
            <p className="text-sm text-muted-foreground mb-2">Your New Number</p>
            <p className="text-3xl font-bold font-mono text-foreground">
              +267 {selectedNumber}
            </p>
          </div>

          <div className="space-y-3 text-left bg-muted/50 rounded-lg p-4 mb-6">
            <h4 className="font-semibold text-foreground">What's next?</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-success" />
                <span>You'll receive a confirmation SMS shortly</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-success" />
                <span>Your starter bundle is now active</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-success" />
                <span>Download the BTC app to manage your account</span>
              </li>
            </ul>
          </div>

          <Button variant="hero" onClick={onComplete} className="w-full">
            Go to Dashboard
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
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
      <div className="bg-card border border-border rounded-xl p-6 mb-6">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-full gradient-primary flex items-center justify-center mx-auto mb-4">
            <QrCode className="w-8 h-8 text-primary-foreground" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Your eSIM is Ready!</h2>
          <p className="text-muted-foreground">
            Scan the QR code below to activate your eSIM
          </p>
        </div>

        {/* Timer */}
        <div className="flex items-center justify-center gap-2 mb-6 text-sm">
          <Clock className="w-4 h-4 text-warning" />
          <span className="text-muted-foreground">Code expires in</span>
          <span className={`font-mono font-bold ${timeRemaining < 300 ? "text-destructive" : "text-foreground"}`}>
            {formatTime(timeRemaining)}
          </span>
        </div>

        {/* QR Code Placeholder */}
        <div ref={qrCodeRef} className="bg-primary-foreground p-6 rounded-xl mx-auto max-w-xs mb-4">
          <div className="aspect-square bg-muted rounded-lg flex items-center justify-center border-4 border-foreground">
            {/* This would be a real QR code in production */}
            <div className="grid grid-cols-8 gap-1 p-4">
              {Array.from({ length: 64 }).map((_, i) => (
                <div
                  key={i}
                  className={`w-3 h-3 ${Math.random() > 0.5 ? "bg-foreground" : "bg-transparent"}`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Save/Email QR Code Options */}
        <div className="flex gap-2 justify-center mb-6">
          <Button variant="outline" size="sm" onClick={saveToGallery}>
            <Download className="w-4 h-4 mr-2" />
            Save to Gallery
          </Button>
          <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Mail className="w-4 h-4 mr-2" />
                Email to Me
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Email eSIM QR Code</DialogTitle>
                <DialogDescription>
                  We'll send the QR code and activation instructions to your email address.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <Input
                  type="email"
                  placeholder="Enter your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <Button 
                  variant="hero" 
                  className="w-full" 
                  onClick={sendEmailWithQR}
                  disabled={sendingEmail}
                >
                  {sendingEmail ? "Sending..." : "Send Email"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Activation Code */}
        <div className="bg-muted rounded-lg p-4 mb-6">
          <p className="text-sm text-muted-foreground mb-2 text-center">
            Or enter this code manually:
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs font-mono bg-background p-2 rounded border border-border overflow-x-auto">
              {activationCode}
            </code>
            <Button variant="outline" size="icon" onClick={copyCode}>
              <Copy className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Instructions */}
        <div className="space-y-4 mb-6">
          <h4 className="font-semibold text-foreground flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-primary" />
            How to activate
          </h4>
          <ol className="space-y-3 text-sm text-muted-foreground">
            <li className="flex gap-3">
              <span className="w-6 h-6 rounded-full gradient-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">1</span>
              <span>Open <strong>Settings</strong> on your device</span>
            </li>
            <li className="flex gap-3">
              <span className="w-6 h-6 rounded-full gradient-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">2</span>
              <span>Go to <strong>Cellular/Mobile Data</strong> → <strong>Add eSIM</strong></span>
            </li>
            <li className="flex gap-3">
              <span className="w-6 h-6 rounded-full gradient-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">3</span>
              <span>Select <strong>Scan QR Code</strong> and point camera at the code above</span>
            </li>
            <li className="flex gap-3">
              <span className="w-6 h-6 rounded-full gradient-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">4</span>
              <span>Follow the on-screen prompts to complete activation</span>
            </li>
          </ol>
        </div>

        {/* Simulate Button (for demo) */}
        <Button variant="hero" onClick={simulateActivation} className="w-full mb-3">
          <CheckCircle2 className="w-4 h-4 mr-2" />
          I've Scanned the Code
        </Button>

        <Button variant="ghost" className="w-full">
          <HelpCircle className="w-4 h-4 mr-2" />
          Need Help?
        </Button>
      </div>
    </motion.div>
  );
};

export default ESIMActivation;
