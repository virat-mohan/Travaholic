import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, MapPin, Star, Phone, Calendar, Users, ChevronDown, Waves, UtensilsCrossed, Mountain, Sparkles, Wine, Palmtree } from "lucide-react";
import { Button } from "../components/ui/button";
import VillaCard from "../components/VillaCard";
import CallbackModal from "../components/CallbackModal";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { API } from "../App";

const HomePage = () => {
  const [villas, setVillas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [callbackOpen, setCallbackOpen] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);

  // Hero slideshow images - curated luxury collection
  const heroSlides = [
    {
      image: "https://images.unsplash.com/photo-1758192838598-a1de4da5dcaf?w=1920&q=80",
      title: "Infinity Pool Paradise",
      subtitle: "Where sky meets water"
    },
    {
      image: "https://images.unsplash.com/photo-1759405198466-d7f97ef8b4a7?w=1920&q=80",
      title: "Oceanfront Luxury",
      subtitle: "Wake up to endless views"
    },
    {
      image: "https://images.unsplash.com/photo-1768307198062-67020de156a2?w=1920&q=80",
      title: "Mountain Retreats",
      subtitle: "Serenity at its peak"
    },
    {
      image: "https://images.unsplash.com/photo-1685271552630-9bc169185566?w=1920&q=80",
      title: "Golden Sunsets",
      subtitle: "Moments worth remembering"
    },
    {
      image: "https://images.unsplash.com/photo-1759281944533-a9eea164ffe3?w=1920&q=80",
      title: "Cozy Escapes",
      subtitle: "Your home away from home"
    },
    {
      image: "https://images.pexels.com/photos/12715491/pexels-photo-12715491.jpeg?w=1920&q=80",
      title: "Private Havens",
      subtitle: "Exclusive experiences await"
    }
  ];

  // Auto-advance slideshow
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [heroSlides.length]);

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
    { icon: Waves, name: "Private Pool" },
    { icon: UtensilsCrossed, name: "Gourmet Kitchen" },
    { icon: Sparkles, name: "Daily Housekeeping" },
    { icon: Wine, name: "Premium Bar" },
    { icon: Palmtree, name: "Tropical Gardens" },
    { icon: Mountain, name: "Scenic Views" },
  ];

  // Experience categories for visual section
  const experiences = [
    {
      image: "https://images.unsplash.com/photo-1643633052713-3978931c81a6?w=800&q=80",
      title: "Sunset Cocktails",
      desc: "Sip & unwind"
    },
    {
      image: "https://images.unsplash.com/photo-1759741558258-f24a3e847968?w=800&q=80",
      title: "Fine Dining",
      desc: "Culinary excellence"
    },
    {
      image: "https://images.unsplash.com/photo-1739314990513-49717c633401?w=800&q=80",
      title: "Beach Escapes",
      desc: "Paradise found"
    },
    {
      image: "https://images.unsplash.com/photo-1760067537116-de1f76fe8f95?w=800&q=80",
      title: "Serene Mornings",
      desc: "Wake up refreshed"
    }
  ];

  return (
    <div data-testid="home-page">
      {/* Hero Section with Slideshow */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        {/* Background Slideshow */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5, ease: "easeInOut" }}
            className="absolute inset-0"
          >
            <motion.img
              src={heroSlides[currentSlide].image}
              alt={heroSlides[currentSlide].title}
              className="w-full h-full object-cover"
              initial={{ scale: 1 }}
              animate={{ scale: 1.05 }}
              transition={{ duration: 5, ease: "linear" }}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-black/70" />
          </motion.div>
        </AnimatePresence>

        {/* Slide Indicators */}
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-20 flex gap-2">
          {heroSlides.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`h-1 rounded-full transition-all duration-500 ${
                index === currentSlide ? "w-8 bg-white" : "w-2 bg-white/40 hover:bg-white/60"
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>

        {/* Content */}
        <div className="relative z-10 container-luxury text-center text-white">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="mb-6"
          >
            <span className="inline-block px-4 py-2 border border-white/30 rounded-full text-xs uppercase tracking-[0.3em] text-white/90 backdrop-blur-sm">
              Ultra-Luxury Villa Rentals
            </span>
          </motion.div>
          
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="font-heading text-5xl md:text-7xl lg:text-8xl tracking-tight mb-6 leading-[1.1]"
          >
            Escape to
            <br />
            <span className="italic font-light">Extraordinary</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-lg md:text-xl text-white/80 max-w-2xl mx-auto mb-10 font-light"
          >
            Discover handpicked luxury villas in Goa & beyond. Where every stay
            becomes an unforgettable experience.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Link to="/villas">
              <Button
                className="btn-luxury bg-white text-foreground hover:bg-white/90 px-8 py-6 text-base"
                data-testid="explore-villas-btn"
              >
                Explore Villas
              </Button>
            </Link>
            <Button
              variant="outline"
              className="btn-luxury-outline border-white/60 text-white hover:bg-white hover:text-foreground backdrop-blur-sm px-8 py-6 text-base"
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

      {/* Luxury Experiences Strip */}
      <section className="bg-foreground py-16 overflow-hidden">
        <div className="container-luxury">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-10"
          >
            <p className="text-xs uppercase tracking-[0.3em] text-white/60 mb-3">Curated For You</p>
            <h2 className="font-heading text-3xl md:text-4xl text-white">The Travaholic Experience</h2>
          </motion.div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {experiences.map((exp, index) => (
              <motion.div
                key={exp.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="group relative aspect-[3/4] overflow-hidden cursor-pointer"
              >
                <img
                  src={exp.image}
                  alt={exp.title}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-5">
                  <p className="text-xs text-white/70 uppercase tracking-wider mb-1">{exp.desc}</p>
                  <h3 className="font-heading text-lg md:text-xl text-white">{exp.title}</h3>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Villas */}
      <section className="section-spacing bg-background" data-testid="featured-villas-section">
        <div className="container-luxury">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="flex flex-col md:flex-row md:items-end md:justify-between mb-12 gap-6"
          >
            <div>
              <p className="caption-text mb-4">Our Collection</p>
              <h2 className="font-heading text-4xl md:text-5xl">
                Featured Villas
              </h2>
              <p className="text-muted-foreground mt-3 max-w-lg">Handpicked properties that define luxury living</p>
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
          </motion.div>

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
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
            >
              <p className="caption-text mb-4">About Us</p>
              <h2 className="font-heading text-4xl md:text-5xl mb-6">
                Crafting Unforgettable
                <br />
                <span className="italic font-light">Experiences</span>
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
              
              {/* Concierge USP */}
              <div className="bg-accent/10 border-l-4 border-accent p-6 mb-8">
                <h3 className="font-heading text-xl mb-3">Your Personal Concierge</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Experience the art of effortless travel with your dedicated concierge. 
                  From curated dining reservations at Goa's finest restaurants to bespoke 
                  experiences, adventure activities, and hidden local gems — we craft every 
                  moment of your journey. Each group is welcomed into a private WhatsApp 
                  circle with their personal concierge, ensuring seamless support and 
                  thoughtful recommendations throughout your stay.
                </p>
              </div>

              <Link to="/about">
                <Button className="btn-luxury-outline" data-testid="learn-more-btn">
                  Learn More
                  <ArrowRight size={16} className="ml-2" />
                </Button>
              </Link>
            </motion.div>
            <motion.div 
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              viewport={{ once: true }}
              className="grid grid-cols-2 gap-4"
            >
              <div className="space-y-4">
                <div className="aspect-[3/4] overflow-hidden group">
                  <img
                    src="https://images.unsplash.com/photo-1759281944533-a9eea164ffe3?w=800&q=80"
                    alt="Luxury Mountain Retreat"
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
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
                <div className="aspect-[3/4] overflow-hidden group">
                  <img
                    src="https://images.unsplash.com/photo-1758192838598-a1de4da5dcaf?w=800&q=80"
                    alt="Infinity Pool Paradise"
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Amenities Section */}
      <section className="section-spacing bg-background">
        <div className="container-luxury">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <p className="caption-text mb-4">What We Offer</p>
            <h2 className="font-heading text-4xl md:text-5xl">
              Premium Amenities
            </h2>
            <p className="text-muted-foreground mt-3 max-w-lg mx-auto">Every detail crafted for your comfort</p>
          </motion.div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6 md:gap-8">
            {amenities.map((amenity, index) => (
              <motion.div
                key={amenity.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="text-center p-6 border border-border hover:border-accent hover:bg-accent/5 transition-all duration-300 group"
              >
                <amenity.icon className="w-8 h-8 mx-auto mb-4 text-muted-foreground group-hover:text-accent transition-colors" strokeWidth={1.5} />
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
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <p className="caption-text mb-4 text-background/60">Destinations</p>
            <h2 className="font-heading text-4xl md:text-5xl">
              Where Dreams Meet Reality
            </h2>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                name: "Goa",
                subtitle: "Sun, Sand & Serenity",
                image: "https://images.unsplash.com/photo-1722595197981-6717b8b4af2d?w=800&q=80",
                locations: ["Anjuna", "Vagator", "Morjim"],
              },
              {
                name: "Mussoorie",
                subtitle: "Queen of Hills",
                image: "https://images.unsplash.com/photo-1762862170883-4cfc75c7672a?w=800&q=80",
                locations: ["Landour", "Mall Road", "Cloud End"],
              },
              {
                name: "Himachal",
                subtitle: "Mountain Paradise",
                image: "https://images.unsplash.com/photo-1684248529600-4f0400e1eb22?w=800&q=80",
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

      {/* Google Reviews Section */}
      <section className="section-spacing bg-background" data-testid="google-reviews-section">
        <div className="container-luxury">
          <div className="text-center mb-16">
            <p className="caption-text mb-4">Google Reviews</p>
            <h2 className="font-heading text-4xl md:text-5xl">
              What Our Guests Say
            </h2>
            <div className="flex items-center justify-center gap-2 mt-4">
              <div className="flex gap-1 text-accent">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={20} fill="currentColor" />
                ))}
              </div>
              <span className="text-muted-foreground">5.0 on Google</span>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                name: "Abhishek Kumar",
                text: "Visited La Morena villa with friends, it was beautiful and memorable. The rooms were well-maintained, clean, and the villa was spacious enough for us. Loved the pool and the view from the villa. The property manager was helpful and everything was smooth. Highly recommend this place. Thank you Travaholic Stays for making the stay memorable.",
                timeAgo: "2 months ago",
              },
              {
                name: "Arun Saini",
                text: "Our stay at La Morena was unforgettable! The villa is stunning, with a beautiful pool and lush gardens. Everything was clean and well-maintained. The team was incredibly friendly and helpful, making our vacation seamless. Highly recommend Travaholic Stays for a memorable getaway!",
                timeAgo: "3 months ago",
              },
              {
                name: "Ravi Sharma",
                text: "Travaholic Stays exceeded all expectations during our family trip to Goa! The villa we stayed in was pristine, spacious, and beautifully designed. The team was incredibly responsive and ensured every detail was taken care of. From the private pool to the stunning views, every moment felt like luxury. Highly recommend them for anyone looking for a hassle-free and unforgettable vacation experience!",
                timeAgo: "4 months ago",
              },
              {
                name: "Rajiv",
                text: "We stayed at La Morena and had a great experience. The villa is beautiful, clean, and well-equipped. The staff was helpful and ensured everything went smoothly. Would definitely recommend Travaholic Stays for a relaxing vacation!",
                timeAgo: "2 months ago",
              },
              {
                name: "Praveen Jain",
                text: "We recently stayed at La Morena Villa in North Goa, booked via Travaholic Stays, and it was an incredible experience! The villa was stunning, with a spacious layout, well-maintained pool, and a serene ambiance. The team was responsive and helpful throughout the booking process. A perfect getaway spot – highly recommended!",
                timeAgo: "3 months ago",
              },
              {
                name: "Shalabh Srivastava",
                text: "Had a fantastic stay with Travaholic Stays - one of the most memorable vacations ever! The villa was immaculate, spacious, and designed beautifully. Great attention to detail, and the team made everything seamless. Looking forward to booking again!",
                timeAgo: "5 months ago",
              },
            ].map((review, index) => (
              <motion.div
                key={review.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="bg-card p-8 border border-border"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-accent/20 rounded-full flex items-center justify-center">
                    <span className="text-accent font-medium">{review.name.charAt(0)}</span>
                  </div>
                  <div>
                    <p className="font-medium">{review.name}</p>
                    <p className="text-xs text-muted-foreground">{review.timeAgo}</p>
                  </div>
                </div>
                <div className="flex gap-1 text-accent mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={14} fill="currentColor" />
                  ))}
                </div>
                <p className="text-muted-foreground leading-relaxed text-sm line-clamp-5">
                  "{review.text}"
                </p>
              </motion.div>
            ))}
          </div>
          <div className="text-center mt-10">
            <a 
              href="https://www.google.com/search?q=travaholic+stays+reviews" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-accent hover:underline text-sm uppercase tracking-wider"
            >
              View All Reviews on Google
            </a>
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
