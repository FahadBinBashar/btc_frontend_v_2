import { Phone, Mail, MapPin } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-primary text-primary-foreground">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Logo & Description */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-primary-foreground/20 flex items-center justify-center">
                <span className="font-bold text-lg">B</span>
              </div>
              <div>
                <h3 className="font-bold text-lg">BTC Online Services</h3>
                <p className="text-xs text-primary-foreground/70">Your Digital Mobile Partner</p>
              </div>
            </div>
            <p className="text-primary-foreground/80 text-sm max-w-md">
              Providing secure and convenient digital mobile services including eSIM activation, 
              KYC compliance, and SIM management solutions.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2 text-sm text-primary-foreground/80">
              <li><a href="#services" className="hover:text-primary-foreground transition-colors">Services</a></li>
              <li><a href="#about" className="hover:text-primary-foreground transition-colors">About Us</a></li>
              <li><a href="#support" className="hover:text-primary-foreground transition-colors">Support</a></li>
              <li><a href="#privacy" className="hover:text-primary-foreground transition-colors">Privacy Policy</a></li>
              <li><a href="#terms" className="hover:text-primary-foreground transition-colors">Terms of Service</a></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold mb-4">Contact Us</h4>
            <ul className="space-y-3 text-sm text-primary-foreground/80">
              <li className="flex items-center gap-2">
                <Phone className="w-4 h-4" />
                <span>(+267) 395 8000</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                <span>support@btc.co.bw</span>
              </li>
              <li className="flex items-start gap-2">
                <MapPin className="w-4 h-4 mt-0.5" />
                <span>Gaborone, Botswana</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-primary-foreground/20 mt-10 pt-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-primary-foreground/70">
            © {new Date().getFullYear()} BTC Online Services. All rights reserved.
          </p>
          <p className="text-xs text-primary-foreground/50">
            Regulated by BOCRA | Botswana
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
