import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, MapPin, Star, Phone, Calendar, Users, ChevronDown } from "lucide-react";
import { Button } from "../components/ui/button";
import VillaCard from "../components/VillaCard";
import CallbackModal from "../components/CallbackModal";
import { motion } from "framer-motion";
import axios from "axios";
import { API } from "../App";

const HomePage = () => {
  const [villas, setVillas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [callbackOpen, setCallbackOpen] = useState(false);

  useEffect(() => {
    fetchVillas();
  }, []);

  const fetchVillas = async () => {
    try {
      const response = await axios.get(`${API}/villas?limit=4`);
      setVillas(response.data.villas);
    } catch (error) {
      console.error("Error fetching villas:", error);
    } finally {
      setLoading(false);
    }
  };

  const amenities = [
    { icon: "🏊", name: "Private Pool" },
    { icon: "🍳", name: "Breakfast" },
    { icon: "📶", name: "WiFi" },
    { icon: "🅿️", name: "Parking" },
    { icon: "🏠", name: "Housekeeping" },
    { icon: "👨‍🍳", name: "Chef Service" },
    { icon: "🔥", name: "Bonfire" },
    { icon: "📺", name: "Smart TV" },
  ];

  const testimonials = [
    {
      name: "Garima",
      role: "Business Owner",
      text: "This has been the best vacation of our lives! The villa exceeded our expectations in every way. We are so grateful for the opportunity to experience such a luxurious and memorable stay.",
      image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200",
    },
    {
      name: "Harpreet",
      role: "Financial Advisor",
      text: "Waking up to the breathtaking views and melodious birdsong was pure bliss. The entire experience was pure paradise. Thank you for making our stay so special.",
      image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200",
    },
    {
      name: "Jyotika",
      role: "Fashion Designer",
      text: "The villa itself was absolutely stunning! It exceeded our expectations in every way. It was clean, spacious, and had all the amenities we needed for a comfortable and relaxing stay.",
      image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200",
    },
  ];

  return (
    <div data-testid="home-page">
      {/* Hero Section */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=1920&q=80"
            alt="Luxury Villa"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-black/60" />
        </div>

        {/* Content */}
        <div className="relative z-10 container-luxury text-center text-white">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-sm uppercase tracking-[0.3em] mb-6 text-white/80"
          >
            Ultra-Luxury Villa Rentals
          </motion.p>
          
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="font-heading text-5xl md:text-7xl lg:text-8xl tracking-tight mb-6 leading-[1.1]"
          >
            Escape to
            <br />
            <span className="italic">Extraordinary</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg md:text-xl text-white/80 max-w-2xl mx-auto mb-10"
          >
            Discover handpicked luxury villas in Goa & beyond. Where every stay
            becomes an unforgettable experience.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Link to="/villas">
              <Button
                className="btn-luxury bg-white text-foreground hover:bg-white/90"
                data-testid="explore-villas-btn"
              >
                Explore Villas
              </Button>
            </Link>
            <Button
              variant="outline"
              className="btn-luxury-outline border-white text-white hover:bg-white hover:text-foreground"
              onClick={() => setCallbackOpen(true)}
              data-testid="request-callback-btn"
            >
              Request Callback
            </Button>
          </motion.div>
        </div>

        {/* Scroll Indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, y: [0, 10, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, delay: 1 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white"
        >
          <ChevronDown size={32} />
        </motion.div>
      </section>

      {/* Featured Villas */}
      <section className="section-spacing bg-background" data-testid="featured-villas-section">
        <div className="container-luxury">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between mb-12 gap-6">
            <div>
              <p className="caption-text mb-4">Our Collection</p>
              <h2 className="font-heading text-4xl md:text-5xl">
                Featured Villas
              </h2>
            </div>
            <Link
              to="/villas"
              className="flex items-center gap-2 text-sm uppercase tracking-wider hover:text-accent transition-colors group"
            >
              View All Villas
              <ArrowRight
                size={16}
                className="group-hover:translate-x-1 transition-transform"
              />
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="aspect-[4/3] bg-muted mb-4" />
                  <div className="h-4 bg-muted w-3/4 mb-2" />
                  <div className="h-3 bg-muted w-1/2" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {villas.map((villa, index) => (
                <VillaCard key={villa.villa_id} villa={villa} index={index} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* About Section */}
      <section className="section-spacing bg-muted/30">
        <div className="container-luxury">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <div>
              <p className="caption-text mb-4">About Us</p>
              <h2 className="font-heading text-4xl md:text-5xl mb-6">
                Crafting Unforgettable
                <br />
                <span className="italic">Experiences</span>
              </h2>
              <p className="text-muted-foreground text-lg leading-relaxed mb-6">
                At Travaholic Stays, we believe that where you stay defines your
                journey. Our curated collection of ultra-luxury villas across
                Goa, Mussoorie, and Himachal Pradesh offers more than just
                accommodation — it's an invitation to experience the
                extraordinary.
              </p>
              <p className="text-muted-foreground text-lg leading-relaxed mb-8">
                From private infinity pools overlooking pristine beaches to cozy
                mountain retreats with breathtaking views, every property in our
                portfolio is handpicked for its unique character, impeccable
                service, and attention to detail.
              </p>
              <Link to="/about">
                <Button className="btn-luxury-outline" data-testid="learn-more-btn">
                  Learn More
                  <ArrowRight size={16} className="ml-2" />
                </Button>
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-4">
                <div className="aspect-[3/4] overflow-hidden">
                  <img
                    src="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800"
                    alt="Villa Interior"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="bg-accent text-accent-foreground p-6">
                  <p className="text-4xl font-heading mb-2">20+</p>
                  <p className="text-sm uppercase tracking-wider">
                    Luxury Properties
                  </p>
                </div>
              </div>
              <div className="space-y-4 pt-12">
                <div className="bg-foreground text-background p-6">
                  <p className="text-4xl font-heading mb-2">500+</p>
                  <p className="text-sm uppercase tracking-wider">
                    Happy Guests
                  </p>
                </div>
                <div className="aspect-[3/4] overflow-hidden">
                  <img
                    src="https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800"
                    alt="Villa Pool"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Amenities Section */}
      <section className="section-spacing bg-background">
        <div className="container-luxury">
          <div className="text-center mb-16">
            <p className="caption-text mb-4">What We Offer</p>
            <h2 className="font-heading text-4xl md:text-5xl">
              Premium Amenities
            </h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
            {amenities.map((amenity, index) => (
              <motion.div
                key={amenity.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="text-center p-6 border border-border hover:border-accent transition-colors group"
              >
                <span className="text-4xl block mb-4">{amenity.icon}</span>
                <p className="text-sm uppercase tracking-wider group-hover:text-accent transition-colors">
                  {amenity.name}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Destinations */}
      <section className="section-spacing bg-foreground text-background">
        <div className="container-luxury">
          <div className="text-center mb-16">
            <p className="caption-text mb-4 text-background/60">Destinations</p>
            <h2 className="font-heading text-4xl md:text-5xl">
              Where Dreams Meet Reality
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                name: "Goa",
                subtitle: "Sun, Sand & Serenity",
                image: "https://images.unsplash.com/photo-1580662768963-f5a4ef9ffede?w=800",
                locations: ["Anjuna", "Vagator", "Morjim"],
              },
              {
                name: "Mussoorie",
                subtitle: "Queen of Hills",
                image: "https://images.unsplash.com/photo-1518780664697-55e3ad937233?w=800",
                locations: ["Landour", "Mall Road", "Cloud End"],
              },
              {
                name: "Himachal",
                subtitle: "Mountain Paradise",
                image: "https://images.unsplash.com/photo-1449158743715-0a90ebb6d2d8?w=800",
                locations: ["Mashobra", "Naldhera", "Shimla"],
              },
            ].map((dest, index) => (
              <motion.div
                key={dest.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="group relative aspect-[3/4] overflow-hidden"
              >
                <img
                  src={dest.image}
                  alt={dest.name}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-8">
                  <p className="text-sm text-background/70 mb-2">
                    {dest.subtitle}
                  </p>
                  <h3 className="font-heading text-3xl mb-4">{dest.name}</h3>
                  <div className="flex flex-wrap gap-2">
                    {dest.locations.map((loc) => (
                      <span
                        key={loc}
                        className="text-xs px-3 py-1 border border-background/30 rounded-full"
                      >
                        {loc}
                      </span>
                    ))}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="section-spacing bg-background">
        <div className="container-luxury">
          <div className="text-center mb-16">
            <p className="caption-text mb-4">Testimonials</p>
            <h2 className="font-heading text-4xl md:text-5xl">
              What Our Guests Say
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={testimonial.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="bg-card p-8 border border-border"
              >
                <div className="flex gap-1 text-accent mb-6">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={16} fill="currentColor" />
                  ))}
                </div>
                <p className="text-muted-foreground leading-relaxed mb-6">
                  "{testimonial.text}"
                </p>
                <div className="flex items-center gap-4">
                  <img
                    src={testimonial.image}
                    alt={testimonial.name}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                  <div>
                    <p className="font-medium">{testimonial.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {testimonial.role}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="section-spacing bg-accent">
        <div className="container-luxury text-center">
          <h2 className="font-heading text-4xl md:text-5xl text-accent-foreground mb-6">
            Ready for Your Escape?
          </h2>
          <p className="text-accent-foreground/80 text-lg max-w-2xl mx-auto mb-10">
            Let us help you find the perfect villa for your next getaway.
            Request a callback and our team will assist you with everything.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/villas">
              <Button
                className="btn-luxury bg-foreground text-background hover:bg-foreground/90"
                data-testid="browse-villas-cta"
              >
                Browse Villas
              </Button>
            </Link>
            <Button
              className="btn-luxury-outline border-foreground text-foreground hover:bg-foreground hover:text-accent"
              onClick={() => setCallbackOpen(true)}
              data-testid="callback-cta-btn"
            >
              <Phone size={16} className="mr-2" />
              Request Callback
            </Button>
          </div>
        </div>
      </section>

      {/* List Your Villa CTA */}
      <section className="section-spacing bg-muted/30">
        <div className="container-luxury">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <p className="caption-text mb-4">For Property Owners</p>
              <h2 className="font-heading text-4xl md:text-5xl mb-6">
                List Your Villa
                <br />
                <span className="italic">With Us</span>
              </h2>
              <p className="text-muted-foreground text-lg leading-relaxed mb-8">
                Join our exclusive collection of luxury properties. We handle
                everything from marketing to guest management, ensuring maximum
                returns for your property.
              </p>
              <ul className="space-y-4 mb-8">
                {[
                  "Professional photography & marketing",
                  "Complete guest management",
                  "Transparent pricing & payouts",
                  "Dedicated property manager",
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <span className="w-2 h-2 bg-accent rounded-full" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link to="/list-your-villa">
                <Button className="btn-luxury" data-testid="list-villa-cta">
                  Get Started
                  <ArrowRight size={16} className="ml-2" />
                </Button>
              </Link>
            </div>
            <div className="aspect-[4/3] overflow-hidden">
              <img
                src="https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800"
                alt="List your villa"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Callback Modal */}
      <CallbackModal
        isOpen={callbackOpen}
        onClose={() => setCallbackOpen(false)}
      />
    </div>
  );
};

export default HomePage;
