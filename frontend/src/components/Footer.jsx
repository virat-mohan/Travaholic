import { Link } from "react-router-dom";
import { MapPin, Phone, Mail, Instagram } from "lucide-react";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-foreground text-background" data-testid="main-footer">
      {/* Main Footer */}
      <div className="container-luxury section-spacing">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-8">
          {/* Brand */}
          <div className="lg:col-span-1">
            <Link to="/" className="block">
              <img 
                src="/Travaholic_color_logo-removebg-preview.png" 
                alt="Travaholic Stays"
                className="h-20 w-auto"
              />
            </Link>
            <p className="mt-6 text-background/70 leading-relaxed">
              Ultra-luxury villa rentals in Goa & beyond. Experience the finest
              hospitality with our handpicked collection of premium properties.
            </p>
            <div className="flex gap-4 mt-6">
              <a
                href="https://www.instagram.com/travaholicstays/?hl=en"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 border border-background/30 rounded-full hover:bg-background hover:text-foreground transition-colors"
                data-testid="instagram-link"
              >
                <Instagram size={20} />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-heading text-xl mb-6">Quick Links</h4>
            <ul className="space-y-4">
              <li>
                <Link
                  to="/villas"
                  className="text-background/70 hover:text-accent transition-colors"
                >
                  Our Villas
                </Link>
              </li>
              <li>
                <Link
                  to="/about"
                  className="text-background/70 hover:text-accent transition-colors"
                >
                  About Us
                </Link>
              </li>
              <li>
                <Link
                  to="/blog"
                  className="text-background/70 hover:text-accent transition-colors"
                >
                  Travel Guide
                </Link>
              </li>
              <li>
                <Link
                  to="/list-your-villa"
                  className="text-background/70 hover:text-accent transition-colors"
                >
                  List Your Villa
                </Link>
              </li>
              <li>
                <Link
                  to="/contact"
                  className="text-background/70 hover:text-accent transition-colors"
                >
                  Contact Us
                </Link>
              </li>
            </ul>
          </div>

          {/* Destinations */}
          <div>
            <h4 className="font-heading text-xl mb-6">Destinations</h4>
            <ul className="space-y-4">
              <li>
                <Link
                  to="/villas?location=Anjuna"
                  className="text-background/70 hover:text-accent transition-colors"
                >
                  Anjuna, Goa
                </Link>
              </li>
              <li>
                <Link
                  to="/villas?location=Vagator"
                  className="text-background/70 hover:text-accent transition-colors"
                >
                  Vagator, Goa
                </Link>
              </li>
              <li>
                <Link
                  to="/villas?location=Morjim"
                  className="text-background/70 hover:text-accent transition-colors"
                >
                  Morjim, Goa
                </Link>
              </li>
              <li>
                <Link
                  to="/villas?region=Uttarakhand"
                  className="text-background/70 hover:text-accent transition-colors"
                >
                  Mussoorie
                </Link>
              </li>
              <li>
                <Link
                  to="/villas?region=Himachal"
                  className="text-background/70 hover:text-accent transition-colors"
                >
                  Himachal Pradesh
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-heading text-xl mb-6">Contact</h4>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <MapPin size={20} className="text-accent mt-1 flex-shrink-0" />
                <span className="text-background/70">
                  North Goa, India
                </span>
              </li>
              <li>
                <a
                  href="tel:+919876543210"
                  className="flex items-center gap-3 text-background/70 hover:text-accent transition-colors"
                >
                  <Phone size={20} className="text-accent" />
                  +91 98765 43210
                </a>
              </li>
              <li>
                <a
                  href="mailto:hello@travaholicstays.com"
                  className="flex items-center gap-3 text-background/70 hover:text-accent transition-colors"
                >
                  <Mail size={20} className="text-accent" />
                  hello@travaholicstays.com
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-background/10">
        <div className="container-luxury py-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-background/50 text-sm">
            © {currentYear} Travaholic Stays. All rights reserved.
          </p>
          <div className="flex gap-6 text-sm text-background/50">
            <Link to="/privacy" className="hover:text-background transition-colors">
              Privacy Policy
            </Link>
            <Link to="/terms" className="hover:text-background transition-colors">
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
