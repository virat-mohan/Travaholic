import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowRight, Award, Users, Heart, MapPin } from "lucide-react";
import { Button } from "../components/ui/button";

const AboutPage = () => {
  const stats = [
    { value: "20+", label: "Luxury Properties" },
    { value: "25,000+", label: "Happy Guests" },
    { value: "5+", label: "Destinations" },
    { value: "24/7", label: "Guest Support" },
  ];

  const values = [
    {
      icon: Award,
      title: "Excellence",
      description: "We maintain the highest standards in hospitality, ensuring every stay exceeds expectations.",
    },
    {
      icon: Users,
      title: "Personalization",
      description: "Every guest is unique, and we tailor experiences to match individual preferences.",
    },
    {
      icon: Heart,
      title: "Passion",
      description: "Our love for hospitality drives us to create memorable moments for every guest.",
    },
    {
      icon: MapPin,
      title: "Local Expertise",
      description: "Deep knowledge of our destinations helps us recommend the best experiences.",
    },
  ];

  return (
    <div className="pt-24 min-h-screen bg-background" data-testid="about-page">
      <Helmet>
        <title>About Us | Travaholic Stays</title>
        <meta name="description" content="Learn the Travaholic Stays story - a curated collection of ultra-luxury villas across Goa, Mussoorie, and Himachal Pradesh, backed by 25,000+ happy guests and a dedicated concierge team." />
        <meta property="og:title" content="About Us | Travaholic Stays" />
        <meta property="og:description" content="The Travaholic Stays story - handpicked luxury villas, 25,000+ happy guests, and a dedicated concierge team." />
        <meta property="og:image" content="https://travaholicstays.com/villas/la-selva-3/External%20Look.jpg" />
        <meta property="og:url" content="https://travaholicstays.com/about" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="About Us | Travaholic Stays" />
        <meta name="twitter:description" content="The Travaholic Stays story - handpicked luxury villas, 25,000+ happy guests, and a dedicated concierge team." />
        <meta name="twitter:image" content="https://travaholicstays.com/villas/la-selva-3/External%20Look.jpg" />
        <link rel="canonical" href="https://travaholicstays.com/about" />
      </Helmet>

      {/* Hero */}
      <section className="relative h-[60vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="/villas/la-selva-3/External%20Look.jpg"
            alt="About Travaholic Stays"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 to-black/30" />
        </div>
        <div className="relative z-10 text-center text-white container-luxury">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="caption-text mb-4 text-white/80"
          >
            Our Story
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="font-heading text-5xl md:text-7xl"
          >
            About Us
          </motion.h1>
        </div>
      </section>

      {/* Story Section */}
      <section className="section-spacing">
        <div className="container-luxury">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <p className="caption-text mb-4">The Travaholic Story</p>
              <h2 className="font-heading text-4xl md:text-5xl mb-6">
                Where Wanderlust
                <br />
                <span className="italic">Becomes a Way of Life</span>
              </h2>
              <div className="space-y-6 text-muted-foreground text-lg leading-relaxed">
                <p>
                  Ishan Seth's journey began on the sun-drenched shores of Durban, South Africa—a childhood defined by surfing, hiking, and endless adventures, always with a trusty cap on his head. That simple accessory became a symbol of something deeper: a life lived outdoors, chasing horizons.
                </p>
                <p>
                  As wanderlust grew, so did his art. Hand-sketched landscapes—mountains, beaches, deserts—transformed into <a href="https://travaholic.in/" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline font-medium">Travaholic Caps</a>, each design a tribute to places that stir the soul. From charcoal sketches to global adventures, the brand became a badge for fellow explorers.
                </p>
                <p>
                  The trails led further. <strong>Travaholic Treks</strong> took kindred spirits through the Himalayas, forging bonds under open skies. Then came <strong>Travaholic Stays</strong>—luxury villas in Goa and the hills, where every home tells a story.
                </p>
                <p>
                  Now, the vision expands. <strong>Travaholic Realty</strong> will craft tomorrow's most sought-after addresses in Goa—spaces designed for those who don't just travel, but <em>live</em> the journey.
                </p>
                <p className="text-foreground font-medium italic">
                  This is Travaholic. Adventure, reimagined.
                </p>
              </div>
            </div>
            <div className="relative">
              <div className="aspect-[4/5] overflow-hidden">
                <img
                  src="/founder-ishan.png"
                  alt="Ishan Seth - Founder of Travaholic"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="absolute -bottom-8 -left-8 bg-gradient-to-br from-accent to-[#A8875C] text-accent-foreground p-8 w-48 shadow-2xl">
                <p className="text-4xl font-heading mb-2">2016</p>
                <p className="text-sm uppercase tracking-wider">Est.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 bg-foreground text-background">
        <div className="container-luxury">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                viewport={{ once: true }}
                className="text-center"
              >
                <p className="font-heading text-5xl mb-2">{stat.value}</p>
                <p className="text-sm uppercase tracking-wider text-background/60">
                  {stat.label}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="section-spacing">
        <div className="container-luxury">
          <div className="text-center mb-16">
            <p className="caption-text mb-4">Our Values</p>
            <h2 className="font-heading text-4xl md:text-5xl">
              What Drives Us
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((value, index) => (
              <motion.div
                key={value.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                viewport={{ once: true }}
                className="p-8 border border-border hover:border-accent transition-colors"
              >
                <value.icon className="w-10 h-10 text-accent mb-6" />
                <h3 className="font-heading text-xl mb-3">{value.title}</h3>
                <p className="text-muted-foreground">{value.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Mission */}
      <section className="section-spacing bg-muted/30">
        <div className="container-luxury">
          <div className="max-w-3xl mx-auto text-center">
            <p className="caption-text mb-4">Our Mission</p>
            <h2 className="font-heading text-4xl md:text-5xl mb-8">
              Creating Memories
              <br />
              That Last Forever
            </h2>
            <p className="text-muted-foreground text-lg leading-relaxed mb-8">
              At Travaholic Stays, we're not just providing accommodation—we're
              creating experiences. From the moment you book to the day you
              check out, every interaction is designed to delight. Our dedicated
              team works tirelessly to ensure your stay is nothing short of
              perfect.
            </p>
            <Link to="/villas">
              <Button className="btn-luxury" data-testid="explore-villas-about">
                Explore Our Villas
                <ArrowRight size={16} className="ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section-spacing bg-accent">
        <div className="container-luxury text-center">
          <h2 className="font-heading text-4xl md:text-5xl text-accent-foreground mb-6">
            Partner With Us
          </h2>
          <p className="text-accent-foreground/80 text-lg max-w-2xl mx-auto mb-10">
            Own a luxury property? Join our exclusive collection and let us help
            you maximize your rental potential.
          </p>
          <Link to="/list-your-villa">
            <Button
              className="btn-luxury bg-foreground text-background hover:bg-foreground/90"
              data-testid="list-villa-about"
            >
              List Your Villa
              <ArrowRight size={16} className="ml-2" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
};

export default AboutPage;
