import { useState } from "react";
import { MapPin, Phone, Mail, Clock, Send } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { toast } from "sonner";
import axios from "axios";
import { API } from "../App";
import { motion } from "framer-motion";

const ContactPage = () => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    message: "",
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await axios.post(`${API}/leads`, {
        name: formData.name,
        phone: formData.phone,
        email: formData.email,
        message: formData.message,
        lead_type: "guest",
      });
      toast.success("Message sent successfully! We'll get back to you soon.");
      setFormData({ name: "", phone: "", email: "", message: "" });
    } catch (error) {
      toast.error("Failed to send message. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pt-24 min-h-screen bg-background" data-testid="contact-page">
      {/* Hero */}
      <section className="container-luxury section-spacing pb-12">
        <div className="text-center max-w-2xl mx-auto">
          <p className="caption-text mb-4">Get In Touch</p>
          <h1 className="font-heading text-4xl md:text-6xl mb-6">Contact Us</h1>
          <p className="text-muted-foreground text-lg">
            Have questions about our villas or need help planning your perfect
            getaway? We're here to help.
          </p>
        </div>
      </section>

      {/* Contact Content */}
      <section className="container-luxury pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
          {/* Contact Info */}
          <div>
            <h2 className="font-heading text-3xl mb-8">Get in Touch</h2>
            <div className="space-y-8">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-accent/10 text-accent">
                  <MapPin size={24} />
                </div>
                <div>
                  <h3 className="font-medium mb-1">Location</h3>
                  <p className="text-muted-foreground">
                    North Goa, India
                    <br />
                    Serving Goa, Mussoorie & Himachal Pradesh
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="p-3 bg-accent/10 text-accent">
                  <Phone size={24} />
                </div>
                <div>
                  <h3 className="font-medium mb-1">Phone</h3>
                  <a
                    href="tel:+919876543210"
                    className="text-muted-foreground hover:text-accent transition-colors"
                  >
                    +91 98765 43210
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="p-3 bg-accent/10 text-accent">
                  <Mail size={24} />
                </div>
                <div>
                  <h3 className="font-medium mb-1">Email</h3>
                  <a
                    href="mailto:Travaholicstays@gmail.com"
                    className="text-muted-foreground hover:text-accent transition-colors"
                  >
                    Travaholicstays@gmail.com
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="p-3 bg-accent/10 text-accent">
                  <Clock size={24} />
                </div>
                <div>
                  <h3 className="font-medium mb-1">Hours</h3>
                  <p className="text-muted-foreground">
                    Monday - Sunday
                    <br />
                    9:00 AM - 9:00 PM IST
                  </p>
                </div>
              </div>
            </div>

            {/* WhatsApp CTA */}
            <div className="mt-12 p-6 bg-muted/30 border border-border">
              <h3 className="font-heading text-xl mb-3">Prefer WhatsApp?</h3>
              <p className="text-muted-foreground mb-4">
                Message us directly for quick responses.
              </p>
              <a
                href="https://wa.me/919876543210?text=Hi, I have a question about Travaholic Stays"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button className="btn-luxury-outline" data-testid="whatsapp-contact-btn">
                  Chat on WhatsApp
                </Button>
              </a>
            </div>
          </div>

          {/* Contact Form */}
          <div className="bg-card border border-border p-8 lg:p-12">
            <h2 className="font-heading text-3xl mb-2">Send a Message</h2>
            <p className="text-muted-foreground mb-8">
              Fill out the form below and we'll get back to you within 24 hours.
            </p>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Input
                  placeholder="Your Name *"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                  className="input-luxury"
                  data-testid="contact-name-input"
                />
              </div>

              <div>
                <Input
                  type="tel"
                  placeholder="Phone Number *"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  required
                  className="input-luxury"
                  data-testid="contact-phone-input"
                />
              </div>

              <div>
                <Input
                  type="email"
                  placeholder="Email Address"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="input-luxury"
                  data-testid="contact-email-input"
                />
              </div>

              <div>
                <Textarea
                  placeholder="Your Message *"
                  value={formData.message}
                  onChange={(e) =>
                    setFormData({ ...formData, message: e.target.value })
                  }
                  required
                  className="input-luxury min-h-[150px]"
                  data-testid="contact-message-input"
                />
              </div>

              <Button
                type="submit"
                className="w-full btn-luxury"
                disabled={loading}
                data-testid="send-message-btn"
              >
                {loading ? "Sending..." : "Send Message"}
                <Send size={16} className="ml-2" />
              </Button>
            </form>
          </div>
        </div>
      </section>

      {/* Map Section (Placeholder) */}
      <section className="h-[400px] bg-muted relative">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <MapPin size={48} className="text-accent mx-auto mb-4" />
            <p className="text-muted-foreground">
              Interactive map will be added here
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default ContactPage;
