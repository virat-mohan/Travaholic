import { motion } from "framer-motion";
import { Helmet } from "react-helmet-async";
import { Check, Anchor, Flower2, UtensilsCrossed, Phone } from "lucide-react";
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

// In-villa spa menu - a single price list rather than the yacht-style
// comparison cards, since it's one continuous service, not a choice
// between two options.
const spaTreatments = [
  { name: "Ayurvedic Full Body", duration: "60 mins", price: 2800 },
  { name: "Deep Tissue Full Body", duration: "60 mins", price: 3000 },
  { name: "Aroma Therapy Full Body", duration: "60 mins", price: 3000 },
  { name: "Reflexology (Foot & Hand)", duration: "60 mins", price: 2800 },
  { name: "Neck & Head Massage", duration: "30 mins", price: 1600 },
  { name: "Back & Shoulder Massage", duration: "30 mins", price: 1600 },
  { name: "Full Leg Massage", duration: "45 mins", price: 2000 },
];

// In-villa dining - breakfast is ordered any time from three cuisine
// menus, and lunch/dinner is a fixed per-meal price across three meal
// styles (groceries billed separately, at actual cost).
const breakfastMenus = [
  {
    name: "South Indian Breakfast",
    items: ["Dosa", "Idly", "Vada", "Uttapam"],
    note: "Accompanied with sambar and chutney",
  },
  {
    name: "English Breakfast",
    items: [
      "Avocado on toast",
      "Eggs of choice with toast",
      "Sausages",
      "Bacon",
      "Pancakes (with honey or maple syrup)",
      "Freshly cut fruits",
    ],
  },
  {
    name: "North Indian Breakfast",
    items: [
      "Aloo puri",
      "Dal ka paratha with curd & pickle",
      "Methi ka thepla",
      "Moong dal cheela",
      "Rawa upma",
      "Paratha (potato / cauliflower / cottage cheese / chana dal / pudina)",
      "Pav bhaji",
      "Cheela (besan / rava / oats / moong dal)",
      "Chole bhature",
      "Poha",
    ],
  },
];

const mealOptions = [
  {
    name: "Indian Meal (Veg)",
    items: [
      "2 veg dishes (paneer + one of your choice)",
      "Dal of choice",
      "Roti, steamed/jeera rice",
      "Salad, raita",
    ],
  },
  {
    name: "Goan Meal",
    items: [
      "Goan curry (fish or prawn)",
      "Rava fry / Recheado (fish or prawn)",
      "Vegetable of choice",
      "Roti, Goan bread, steamed rice, salad",
    ],
  },
  {
    name: "Indian Meal (Non-Veg)",
    items: [
      "Non-veg curry (chicken / fish / prawn)",
      "Veg dish (paneer / veg of choice)",
      "Dal of choice",
      "Roti, steamed/jeera rice, salad, raita",
    ],
  },
];

const ServicesPage = () => {
  return (
    <div className="pt-24 min-h-screen bg-background" data-testid="services-page">
      <Helmet>
        <title>Services | Spa, Dining & Yacht Charters | Travaholic Stays</title>
        <meta name="description" content="Beyond luxury villas, Travaholic Stays offers curated experiences - in-villa spa treatments, private chef dining, and luxury yacht charters in Goa." />
        <meta property="og:title" content="Services | Travaholic Stays" />
        <meta property="og:description" content="Curated experiences beyond the stay - in-villa spa, private dining, and luxury yacht charters in Goa." />
        <meta property="og:image" content="https://travaholicstays.com/cruises/falcon-hero.jpg" />
        <meta property="og:url" content="https://travaholicstays.com/services" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Services | Travaholic Stays" />
        <meta name="twitter:description" content="Curated experiences beyond the stay - in-villa spa, private dining, and luxury yacht charters in Goa." />
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

      {/* Spa */}
      <section className="section-spacing bg-muted/30" data-testid="service-category-spa">
        <div className="container-luxury">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="mb-12 max-w-2xl"
          >
            <p className="caption-text mb-4 flex items-center gap-2">
              <Flower2 size={14} />
              In-Villa Wellness
            </p>
            <h2 className="font-heading text-4xl md:text-5xl mb-3">Heavenly Massages</h2>
            <p className="text-muted-foreground">
              Travaholic has curated an in-villa spa experience for your comfort — a reflection of
              our commitment to wellness, letting you replenish mind and body with a personal,
              sensory treatment. Just let your villa attendant know which one you'd like, and it'll
              be arranged around your schedule.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            viewport={{ once: true }}
            className="bg-card border border-border max-w-2xl"
            data-testid="spa-price-list"
          >
            {spaTreatments.map((t, i) => (
              <div
                key={t.name}
                className={`flex items-center justify-between gap-4 px-6 md:px-8 py-4 ${
                  i !== spaTreatments.length - 1 ? "border-b border-border" : ""
                }`}
              >
                <div>
                  <p className="font-medium">{t.name}</p>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">{t.duration}</p>
                </div>
                <p className="font-heading text-xl text-accent whitespace-nowrap">₹{t.price.toLocaleString("en-IN")}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Food */}
      <section className="section-spacing" data-testid="service-category-food">
        <div className="container-luxury">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
            >
              <p className="caption-text mb-4 flex items-center gap-2">
                <UtensilsCrossed size={14} />
                In-Villa Dining
              </p>
              <h2 className="font-heading text-4xl md:text-5xl mb-3">A Private Chef, On Your Time</h2>
              <p className="text-muted-foreground">
                We know you're on holiday, so we don't believe in restricting you on meal timings —
                order your favourite tailor-made breakfast any time of day. We provide the chef for
                the breakfast service; groceries are purchased separately by guests at actual cost.
              </p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              viewport={{ once: true }}
            >
              <div className="aspect-[4/3] overflow-hidden">
                <img
                  src="/villas/dream-villa/Dinning%201A.jpg"
                  alt="In-villa dining setup"
                  loading="lazy"
                  className="w-full h-full object-cover"
                />
              </div>
              <p className="text-xs text-muted-foreground italic mt-2">
                Image for illustration purposes only — actual dishes and presentation may vary.
              </p>
            </motion.div>
          </div>

          <motion.h3
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="font-heading text-2xl md:text-3xl mb-6"
          >
            Breakfast Menu
          </motion.h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
            {breakfastMenus.map((menu, index) => (
              <motion.div
                key={menu.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="bg-card border border-border p-6 md:p-8"
                data-testid={`breakfast-menu-${menu.name.toLowerCase().replace(/\s+/g, "-")}`}
              >
                <h4 className="font-heading text-xl mb-4">{menu.name}</h4>
                <ul className="space-y-2 mb-2">
                  {menu.items.map((item) => (
                    <li key={item} className="flex items-start gap-3 text-sm text-muted-foreground">
                      <Check size={16} className="text-accent shrink-0 mt-0.5" />
                      {item}
                    </li>
                  ))}
                </ul>
                {menu.note && (
                  <p className="text-xs text-muted-foreground italic mt-3">{menu.note}</p>
                )}
              </motion.div>
            ))}
          </div>

          <motion.h3
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="font-heading text-2xl md:text-3xl mb-6"
          >
            Lunch &amp; Dinner
          </motion.h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">
            {mealOptions.map((meal, index) => (
              <motion.div
                key={meal.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="bg-card border border-border p-6 md:p-8"
                data-testid={`meal-option-${meal.name.toLowerCase().replace(/\s+/g, "-")}`}
              >
                <h4 className="font-heading text-xl mb-4">{meal.name}</h4>
                <ul className="space-y-2">
                  {meal.items.map((item) => (
                    <li key={item} className="flex items-start gap-3 text-sm text-muted-foreground">
                      <Check size={16} className="text-accent shrink-0 mt-0.5" />
                      {item}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="bg-accent/10 border-l-4 border-accent p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-4"
          >
            <p className="text-sm md:text-base">
              <strong className="text-foreground">₹2,000 per meal</strong> for 2BHK/3BHK villas,{" "}
              <strong className="text-foreground">₹3,000 per meal</strong> for 4BHK villas
              <span className="text-muted-foreground"> (groceries charged at actual cost).</span>
            </p>
            <a href="tel:+919730366534" className="inline-flex items-center gap-2 text-accent hover:underline whitespace-nowrap">
              <Phone size={16} />
              +91 97303 66534
            </a>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default ServicesPage;
