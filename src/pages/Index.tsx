import { useState } from "react";
import Header from "@/components/layout/Header";
import HeroSection from "@/components/landing/HeroSection";
import ServicesSection from "@/components/landing/ServicesSection";
import Footer from "@/components/landing/Footer";
import ESIMPurchaseFlow from "@/components/esim/ESIMPurchaseFlow";
import SIMSwapFlow from "@/components/simswap/SIMSwapFlow";
import KYCComplianceFlow from "@/components/kyc/KYCComplianceFlow";
import SmegaFlow from "@/components/smega/SmegaFlow";

const Index = () => {
  const [showESIMFlow, setShowESIMFlow] = useState(false);
  const [showSIMSwapFlow, setShowSIMSwapFlow] = useState(false);
  const [showKYCFlow, setShowKYCFlow] = useState(false);
  const [showSmegaFlow, setShowSmegaFlow] = useState(false);

  const handleSelectService = (service: string) => {
    if (service === "esim") {
      setShowESIMFlow(true);
    } else if (service === "sim-swap") {
      setShowSIMSwapFlow(true);
    } else if (service === "kyc") {
      setShowKYCFlow(true);
    } else if (service === "smega") {
      setShowSmegaFlow(true);
    }
    // Other services can be implemented later
  };

  if (showESIMFlow) {
    return <ESIMPurchaseFlow onClose={() => setShowESIMFlow(false)} />;
  }

  if (showSIMSwapFlow) {
    return <SIMSwapFlow onClose={() => setShowSIMSwapFlow(false)} />;
  }

  if (showKYCFlow) {
    return <KYCComplianceFlow onClose={() => setShowKYCFlow(false)} />;
  }

  if (showSmegaFlow) {
    return <SmegaFlow onClose={() => setShowSmegaFlow(false)} />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <HeroSection />
        <ServicesSection onSelectService={handleSelectService} />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
