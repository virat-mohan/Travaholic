import { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, MapPin, Star, Phone, Calendar, Users, ChevronDown, Waves, UtensilsCrossed, Mountain, Sparkles, Wine, Palmtree, ChevronLeft, ChevronRight as ChevronRightIcon } from "lucide-react";
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

  // Hero slideshow images - real photos from the Travaholic portfolio,
  // spanning Goa and the hills
  const heroSlides = [
    {
      image: "/villas/la-selva-6/Villa%20facade.jpeg",
      title: "Timeless Goan Heritage",
      subtitle: "Indo-Portuguese villas, reimagined"
    },
    {
      image: "/villas/dream-villa/Pool%20side.jpg",
      title: "Rooftop Serenity",
      subtitle: "Where sky meets water"
    },
    {
      image: "/villas/clouds-nest/Cottage%20view.jpg",
      title: "Mountain Retreats",
      subtitle: "Serenity at its peak, in Mussoorie"
    },
    {
      image: "/villas/villa-serene/Pool%20area.jpeg",
      title: "Poolside Reflections",
      subtitle: "Moments worth remembering"
    },
    {
      image: "/villas/la-morena-4/Pool%20view.jpg",
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
      const response = await axios.get(`${API}/villas?limit=12`);
      setVillas(response.data.villas);
    } catch (error) {
      console.error("Error fetching villas:", error);
    } finally {
      setLoading(false);
    }
  };

  // One real thumbnail per destination - clicking a card filters the
  // villas page down to it. Goa spans several named locations (Vagator,
  // Assagao, etc.) so it filters by region; Mussoorie and Mashobra are
  // each a single named location within a wider region, so they filter
  // by location instead - matches how VillasPage/GET /villas already
  // support both ?region= and ?location=.
  const destinations = [
    { name: "Goa", filterType: "region", filterValue: "Goa", image: "/villas/la-sierra-12/Pool area.jpeg", tagline: "Beachside luxury villas" },
    { name: "Mussoorie", filterType: "location", filterValue: "Mussoorie", image: "/villas/clouds-nest/Balcony 1.jpg", tagline: "Mountain retreats in the hills" },
    { name: "Mashobra", filterType: "location", filterValue: "Mashobra", image: "/villas/breezedale-mashobra/Balcony 1 (1).jpg", tagline: "Secluded hillside escapes" },
  ];

  const amenities = [
    { icon: Waves, name: "Private Pool" },
    { icon: UtensilsCrossed, name: "Home Style Meals" },
    { icon: Sparkles, name: "Daily Housekeeping" },
    { icon: Wine, name: "Culinary Excellence" },
    { icon: Palmtree, name: "Tropical Gardens" },
    { icon: Mountain, name: "Scenic Views" },
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

      {/* Explore by Location */}
      <section className="section-spacing bg-background" data-testid="destinations-section">
        <div className="container-luxury">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="mb-12"
          >
            <p className="caption-text mb-4">Where to Stay</p>
            <h2 className="font-heading text-4xl md:text-5xl">Explore by Destination</h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {destinations.map((dest, index) => (
              <motion.div
                key={dest.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <Link
                  to={`/villas?${dest.filterType}=${encodeURIComponent(dest.filterValue)}`}
                  className="group relative block aspect-[4/5] overflow-hidden"
                  data-testid={`destination-card-${dest.name.toLowerCase().replace(/\s+/g, "-")}`}
                >
                  <img
                    src={dest.image}
                    alt={dest.name}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-6">
                    <h3 className="font-heading text-2xl text-white mb-1">{dest.name}</h3>
                    <p className="text-white/80 text-sm">{dest.tagline}</p>
                    <span className="inline-flex items-center gap-2 text-white text-xs uppercase tracking-wider mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      View Villas
                      <ArrowRight size={14} />
                    </span>
                  </div>
                </Link>
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
            <div className="relative group/slider">
              {/* Scroll Left Button */}
              <button 
                onClick={() => {
                  const container = document.getElementById('villa-scroller');
                  if (container) container.scrollBy({ left: -350, behavior: 'smooth' });
                }}
                className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10 bg-background/90 hover:bg-background border border-border shadow-lg rounded-full p-3 opacity-0 group-hover/slider:opacity-100 transition-opacity duration-300 hidden md:flex"
                data-testid="scroll-left-btn"
              >
                <ChevronLeft size={24} />
              </button>
              
              {/* Scrollable Container */}
              <div 
                id="villa-scroller"
                className="flex gap-6 overflow-x-auto scroll-smooth pb-4 snap-x snap-mandatory scrollbar-hide"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              >
                {villas.map((villa, index) => (
                  <div 
                    key={villa.villa_id} 
                    className="flex-none w-[300px] md:w-[350px] snap-start"
                  >
                    <VillaCard villa={villa} index={index} />
                  </div>
                ))}
              </div>
              
              {/* Scroll Right Button */}
              <button 
                onClick={() => {
                  const container = document.getElementById('villa-scroller');
                  if (container) container.scrollBy({ left: 350, behavior: 'smooth' });
                }}
                className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10 bg-background/90 hover:bg-background border border-border shadow-lg rounded-full p-3 opacity-0 group-hover/slider:opacity-100 transition-opacity duration-300 hidden md:flex"
                data-testid="scroll-right-btn"
              >
                <ChevronRightIcon size={24} />
              </button>
              
              {/* Scroll Indicator */}
              <div className="flex justify-center mt-6 gap-2 md:hidden">
                <p className="text-sm text-muted-foreground">Swipe to explore →</p>
              </div>
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
                From private pools overlooking pristine beaches to cozy
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
                <Button variant="outline" className="btn-luxury-outline" data-testid="learn-more-btn">
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
                    src="/villas/eagle-nest/Villa%20entrace.JPG"
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
                  <p className="text-4xl font-heading mb-2">25,000+</p>
                  <p className="text-sm uppercase tracking-wider">
                    Happy Guests
                  </p>
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

      {/* Google Reviews Section */}
      <section className="section-spacing bg-background" data-testid="google-reviews-section">
        <div className="container-luxury">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <p className="caption-text mb-4">Google Reviews</p>
            <h2 className="font-heading text-4xl md:text-5xl">
              What Our Guests Say
            </h2>
          </motion.div>
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
                className="bg-card p-8 border border-border hover:border-accent/30 transition-colors"
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
          <motion.div 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mt-10"
          >
            <a 
              href="https://www.google.com/search?q=travaholic+stays+reviews" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-accent hover:underline text-sm uppercase tracking-wider"
            >
              View All Reviews on Google
            </a>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative section-spacing overflow-hidden">
        <div className="absolute inset-0">
          <img 
            src="/villas/la-sierra-14/Backside%20Garden.jpg"
            alt="Luxury vacation"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-accent/90" />
        </div>
        <div className="relative container-luxury text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
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
                  className="btn-luxury bg-foreground text-background hover:bg-foreground/90 px-8 py-6"
                  data-testid="browse-villas-cta"
                >
                  Browse Villas
                </Button>
              </Link>
              <Button
                variant="outline"
                className="btn-luxury-outline border-foreground text-foreground hover:bg-foreground hover:text-accent px-8 py-6"
                onClick={() => setCallbackOpen(true)}
                data-testid="callback-cta-btn"
              >
                <Phone size={16} className="mr-2" />
                Request Callback
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* List Your Villa CTA */}
      <section className="section-spacing bg-muted/30">
        <div className="container-luxury">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
            >
              <p className="caption-text mb-4">For Property Owners</p>
              <h2 className="font-heading text-4xl md:text-5xl mb-6">
                List Your Villa
                <br />
                <span className="italic font-light">With Us</span>
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
                <Button className="btn-luxury px-8 py-6" data-testid="list-villa-cta">
                  Get Started
                  <ArrowRight size={16} className="ml-2" />
                </Button>
              </Link>
            </motion.div>
            <motion.div 
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              viewport={{ once: true }}
              className="aspect-[4/3] overflow-hidden group"
            >
              <img
                src="/villas/la-sierra-15/Pool%20Area.jpg"
                alt="List your luxury villa"
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
            </motion.div>
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
