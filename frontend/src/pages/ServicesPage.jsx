import { motion } from "framer-motion";
import { Helmet } from "react-helmet-async";
import { Check, Anchor } from "lucide-react";
import { Button } from "../components/ui/button";

// Each entry is a service category (Yacht Charters today, more to follow -
// spa, adventure activities, etc.) so new ones can be appended here without
// touching the page layout.
const serviceCategories = [
  {
    id: "cruises",
    icon: Anchor,
    label: "Now in Goa",
    title: "Luxury Yacht Charters",
    description:
      "Take your Goa getaway to the water. Choose between our sleek speedboat or the spacious luxury yacht — both come with a skilled captain and crew.",
    items: [
      {
        name: "The Eagle",
        tagline: "18ft American Speedboat",
        image: "/cruises/eagle-hero.jpg",
        features: [
          "6 pax, 2 hr cruise",
          "Includes skilled captain for a smooth & safe ride",
          "Fast, sleek and exciting",
          "18ft American speedboat",
        ],
      },
      {
        name: "The Falcon",
        tagline: "35ft Luxury American Yacht",
        image: "/cruises/falcon-hero.jpg",
        features: [
          "14 pax, 2 hr cruise",
          "Includes captain and crew",
          "Full AC bedroom, cabin, lounge, kitchen & bathroom",
          "Spacious outdoor deck, 35ft luxury American yacht",
        ],
      },
    ],
  },
];

const ServicesPage = () => {
  return (
    <div className="pt-24 min-h-screen bg-background" data-testid="services-page">
      <Helmet>
        <title>Services | Yacht Charters in Goa | Travaholic Stays</title>
        <meta name="description" content="Beyond luxury villas, Travaholic Stays offers curated experiences in Goa - including luxury yacht and speedboat charters with a skilled captain and crew." />
        <meta property="og:title" content="Services | Travaholic Stays" />
        <meta property="og:description" content="Curated experiences beyond the stay - luxury yacht and speedboat charters in Goa, with more services on the way." />
        <meta property="og:image" content="https://travaholicstays.com/cruises/falcon-hero.jpg" />
        <meta property="og:url" content="https://travaholicstays.com/services" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Services | Travaholic Stays" />
        <meta name="twitter:description" content="Curated experiences beyond the stay - luxury yacht and speedboat charters in Goa, with more services on the way." />
        <meta name="twitter:image" content="https://travaholicstays.com/cruises/falcon-hero.jpg" />
        <link rel="canonical" href="https://travaholicstays.com/services" />
      </Helmet>

      {/* Hero */}
      <section className="relative h-[50vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="/cruises/eagle-action.jpg"
            alt="Travaholic Services"
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
            Beyond the Stay
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="font-heading text-5xl md:text-7xl"
          >
            Services
          </motion.h1>
        </div>
      </section>

      {serviceCategories.map((category) => (
        <section key={category.id} className="section-spacing" data-testid={`service-category-${category.id}`}>
          <div className="container-luxury">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="mb-12"
            >
              <p className="caption-text mb-4 flex items-center gap-2">
                <category.icon size={14} />
                {category.label}
              </p>
              <h2 className="font-heading text-4xl md:text-5xl mb-3">{category.title}</h2>
              <p className="text-muted-foreground max-w-lg">{category.description}</p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {category.items.map((item, index) => (
                <motion.div
                  key={item.name}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.15 }}
                  viewport={{ once: true }}
                  className="bg-card border border-border overflow-hidden group"
                  data-testid={`service-item-${item.name.toLowerCase().replace(/\s+/g, "-")}`}
                >
                  <div className="aspect-[4/3] overflow-hidden relative">
                    <img
                      src={item.image}
                      alt={item.name}
                      loading="lazy"
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-6">
                      <h3 className="font-heading text-2xl md:text-3xl text-white">{item.name}</h3>
                      <p className="text-white/80 text-sm">{item.tagline}</p>
                    </div>
                  </div>

                  <div className="p-6 md:p-8">
                    <ul className="space-y-3 mb-6">
                      {item.features.map((feature, i) => (
                        <li key={i} className="flex items-start gap-3 text-sm text-muted-foreground">
                          <Check size={16} className="text-accent shrink-0 mt-0.5" />
                          {feature}
                        </li>
                      ))}
                    </ul>

                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <p className="text-xs uppercase tracking-wider text-muted-foreground">
                        Pricing available on request
                      </p>
                      <a
                        href={`https://wa.me/919958871283?text=${encodeURIComponent(`Hi, I'm interested in booking ${item.name} yacht charter in Goa`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        data-testid={`service-enquire-${item.name.toLowerCase().replace(/\s+/g, "-")}`}
                      >
                        <Button className="btn-luxury">
                          Enquire on WhatsApp
                        </Button>
                      </a>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      ))}
    </div>
  );
};

export default ServicesPage;
