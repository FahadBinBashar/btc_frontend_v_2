import { motion } from "framer-motion";
import { 
  Smartphone, 
  UserCheck, 
  CreditCard, 
  RefreshCw, 
  FileCheck,
  ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface ServicesSectionProps {
  onSelectService: (service: string) => void;
}

const services = [
  {
    id: "esim",
    icon: Smartphone,
    title: "Buy eSIM",
    description: "Purchase and activate your digital SIM card instantly. No physical card needed.",
    features: ["Instant activation", "QR code delivery", "Compatible devices"],
    color: "from-[#00875A] to-[#006644]",
    popular: false,
    disabled: true,
  },
  {
    id: "kyc",
    icon: UserCheck,
    title: "KYC Compliance",
    description: "Complete your Know Your Customer verification for regulatory compliance.",
    features: ["ID verification", "Biometric check", "Secure process"],
    color: "from-[#006644] to-[#004D33]",
    popular: true,
    disabled: false,
  },
  {
    id: "physical-sim",
    icon: CreditCard,
    title: "New Physical SIM",
    description: "Register a new physical SIM card with full KYC verification.",
    features: ["Full registration", "Plan selection", "Delivery options"],
    color: "from-[#00B8A9] to-[#00875A]",
    popular: false,
    disabled: true,
  },
  {
    id: "sim-swap",
    icon: RefreshCw,
    title: "SIM Swap",
    description: "Transfer your existing number to a new SIM card securely.",
    features: ["Keep your number", "Quick process", "Identity verified"],
    color: "from-[#B4D335] to-[#8BC34A]",
    popular: false,
    disabled: true,
  },
  {
    id: "smega",
    icon: FileCheck,
    title: "SMEGA Registration",
    description: "Register for BTC's mobile money wallet linked to your number.",
    features: ["Send & receive money", "Bill & airtime payments", "Merchant payments"],
    color: "from-[#00875A] to-[#00B8A9]",
    popular: false,
    disabled: true,
  },
];

const ServicesSection = ({ onSelectService }: ServicesSectionProps) => {
  return (
    <section id="services" className="py-20 bg-background">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Our Services
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Choose from our range of digital mobile services. All processes are secure, 
            compliant, and designed for your convenience.
          </p>
        </motion.div>

        {/* Services Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {services.map((service, index) => (
            <motion.div
              key={service.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="group relative"
            >
              <div className="h-full p-6 rounded-2xl bg-card border border-border hover:border-primary/30 hover:shadow-xl transition-all duration-300">
                {/* Popular Badge */}
                {service.popular && (
                  <div className="absolute -top-3 right-6 px-3 py-1 rounded-full gradient-accent text-xs font-semibold text-accent-foreground">
                    Most Popular
                  </div>
                )}
                {service.disabled && (
                  <div className="absolute -top-3 left-6 px-3 py-1 rounded-full bg-muted text-xs font-semibold text-muted-foreground border border-border">
                    Temporarily unavailable
                  </div>
                )}

                {/* Icon */}
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${service.color} flex items-center justify-center mb-5`}>
                  <service.icon className="w-7 h-7 text-primary-foreground" />
                </div>

                {/* Content */}
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  {service.title}
                </h3>
                <p className="text-muted-foreground text-sm mb-4">
                  {service.description}
                </p>

                {/* Features */}
                <ul className="space-y-2 mb-6">
                  {service.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <div className="w-1.5 h-1.5 rounded-full bg-accent" />
                      {feature}
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <Button
                  variant={service.disabled ? "outline" : service.popular ? "hero" : "outline"}
                  className="w-full"
                  disabled={service.disabled}
                  onClick={() => {
                    if (!service.disabled) onSelectService(service.id);
                  }}
                >
                  {service.disabled ? "Temporary disabled" : service.id === "esim" ? "Buy Now" : "Get Started"}
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ServicesSection;
