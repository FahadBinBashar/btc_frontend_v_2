import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Phone, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import btcLogo from "@/assets/btc-logo.png";

const Header = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-md border-b border-border shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-24">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <img src={btcLogo} alt="BTC Logo" className="h-[72px] w-auto" />
            <div>
              <h1 className="font-bold text-lg text-foreground">BTC</h1>
              <p className="text-[10px] text-muted-foreground -mt-1">Online Services</p>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <a href="#services" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
              Services
            </a>
            <a href="tel:+2673958000" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors flex items-center gap-1">
              <Phone className="w-4 h-4" />
              (+267) 395 8000
            </a>
          </nav>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-3">
            <Button variant="ghost" size="sm">
              <HelpCircle className="w-4 h-4 mr-1" />
              Help
            </Button>
            <Button variant="outline" size="sm">
              <Phone className="w-4 h-4 mr-1" />
              Contact
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-muted transition-colors"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-card border-t border-border"
          >
            <div className="container mx-auto px-4 py-4 space-y-3">
              <a href="#services" className="block py-2 text-sm font-medium text-muted-foreground hover:text-primary">
                Services
              </a>
              <a href="tel:+2673958000" className="block py-2 text-sm font-medium text-muted-foreground hover:text-primary flex items-center gap-2">
                <Phone className="w-4 h-4" />
                (+267) 395 8000
              </a>
              <div className="pt-3 flex gap-2">
                <Button variant="ghost" size="sm" className="flex-1">
                  <HelpCircle className="w-4 h-4 mr-1" />
                  Help
                </Button>
                <Button variant="outline" size="sm" className="flex-1">
                  <Phone className="w-4 h-4 mr-1" />
                  Contact
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

export default Header;
