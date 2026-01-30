import { Link } from "react-router-dom";
import { ArrowRight, Calendar, Clock, User } from "lucide-react";
import { motion } from "framer-motion";

const BlogPage = () => {
  // Placeholder blog posts - these would come from a CMS or database
  const blogPosts = [
    {
      id: 1,
      slug: "best-beaches-north-goa",
      title: "The Best Beaches in North Goa for Your Villa Vacation",
      excerpt:
        "Discover the pristine beaches of Anjuna, Vagator, and Morjim - each offering unique experiences for luxury travelers.",
      image: "https://images.unsplash.com/photo-1580662768963-f5a4ef9ffede?w=800",
      category: "Travel Guide",
      date: "Jan 15, 2026",
      readTime: "5 min read",
      author: "Team Travaholic",
    },
    {
      id: 2,
      slug: "planning-perfect-goa-trip",
      title: "Planning the Perfect Goa Trip: A Complete Guide",
      excerpt:
        "Everything you need to know about planning your luxury villa vacation in Goa - from best seasons to local experiences.",
      image: "https://images.unsplash.com/photo-1630632496226-6c862fb7ab24?w=800",
      category: "Travel Tips",
      date: "Jan 10, 2026",
      readTime: "8 min read",
      author: "Team Travaholic",
    },
    {
      id: 3,
      slug: "mussoorie-hill-station-guide",
      title: "Mussoorie: Queen of Hills Travel Guide",
      excerpt:
        "Explore the charming hill station of Mussoorie - colonial heritage, mountain views, and cozy cottage stays.",
      image: "https://images.unsplash.com/photo-1518780664697-55e3ad937233?w=800",
      category: "Destinations",
      date: "Jan 5, 2026",
      readTime: "6 min read",
      author: "Team Travaholic",
    },
    {
      id: 4,
      slug: "luxury-villa-amenities",
      title: "Top Amenities to Look for in a Luxury Villa",
      excerpt:
        "From private pools to personal chefs, discover what makes a villa truly luxurious and memorable.",
      image: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800",
      category: "Villa Guide",
      date: "Dec 28, 2025",
      readTime: "4 min read",
      author: "Team Travaholic",
    },
    {
      id: 5,
      slug: "goa-monsoon-season",
      title: "Visiting Goa During Monsoon: A Hidden Gem Experience",
      excerpt:
        "Why the monsoon season might be the best kept secret for budget-conscious luxury travelers.",
      image: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800",
      category: "Travel Tips",
      date: "Dec 20, 2025",
      readTime: "5 min read",
      author: "Team Travaholic",
    },
    {
      id: 6,
      slug: "himachal-winter-escapes",
      title: "Winter Escapes in Himachal Pradesh",
      excerpt:
        "Experience the magic of Himachal's winter with snow-capped mountains and cozy fireside evenings.",
      image: "https://images.unsplash.com/photo-1449158743715-0a90ebb6d2d8?w=800",
      category: "Destinations",
      date: "Dec 15, 2025",
      readTime: "7 min read",
      author: "Team Travaholic",
    },
  ];

  const categories = [
    "All",
    "Travel Guide",
    "Travel Tips",
    "Destinations",
    "Villa Guide",
  ];

  return (
    <div className="pt-24 min-h-screen bg-background" data-testid="blog-page">
      {/* Hero */}
      <section className="container-luxury section-spacing pb-12">
        <div className="text-center max-w-2xl mx-auto">
          <p className="caption-text mb-4">Travel Journal</p>
          <h1 className="font-heading text-4xl md:text-6xl mb-6">
            Travel Guide & Blog
          </h1>
          <p className="text-muted-foreground text-lg">
            Explore destination guides, travel tips, and insider knowledge to
            make the most of your luxury villa vacation.
          </p>
        </div>
      </section>

      {/* Categories */}
      <section className="container-luxury pb-12">
        <div className="flex flex-wrap justify-center gap-4">
          {categories.map((category) => (
            <button
              key={category}
              className={`px-6 py-2 text-sm uppercase tracking-wider border transition-colors ${
                category === "All"
                  ? "bg-foreground text-background border-foreground"
                  : "border-border hover:border-foreground"
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </section>

      {/* Featured Post */}
      <section className="container-luxury pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="aspect-[4/3] lg:aspect-auto overflow-hidden">
            <img
              src={blogPosts[0].image}
              alt={blogPosts[0].title}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex flex-col justify-center">
            <span className="text-sm uppercase tracking-wider text-accent mb-4">
              {blogPosts[0].category}
            </span>
            <h2 className="font-heading text-3xl md:text-4xl mb-4">
              {blogPosts[0].title}
            </h2>
            <p className="text-muted-foreground text-lg mb-6">
              {blogPosts[0].excerpt}
            </p>
            <div className="flex items-center gap-6 text-sm text-muted-foreground mb-8">
              <span className="flex items-center gap-2">
                <Calendar size={14} />
                {blogPosts[0].date}
              </span>
              <span className="flex items-center gap-2">
                <Clock size={14} />
                {blogPosts[0].readTime}
              </span>
            </div>
            <Link
              to={`/blog/${blogPosts[0].slug}`}
              className="flex items-center gap-2 text-sm uppercase tracking-wider hover:text-accent transition-colors group"
            >
              Read Article
              <ArrowRight
                size={16}
                className="group-hover:translate-x-1 transition-transform"
              />
            </Link>
          </div>
        </div>
      </section>

      {/* Blog Grid */}
      <section className="container-luxury section-spacing pt-0">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {blogPosts.slice(1).map((post, index) => (
            <motion.article
              key={post.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              viewport={{ once: true }}
              className="group"
            >
              <Link to={`/blog/${post.slug}`}>
                <div className="aspect-[4/3] overflow-hidden mb-6">
                  <img
                    src={post.image}
                    alt={post.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
                <span className="text-xs uppercase tracking-wider text-accent mb-3 block">
                  {post.category}
                </span>
                <h3 className="font-heading text-xl mb-3 group-hover:text-accent transition-colors">
                  {post.title}
                </h3>
                <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
                  {post.excerpt}
                </p>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar size={12} />
                    {post.date}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock size={12} />
                    {post.readTime}
                  </span>
                </div>
              </Link>
            </motion.article>
          ))}
        </div>
      </section>

      {/* Newsletter CTA */}
      <section className="section-spacing bg-foreground text-background">
        <div className="container-luxury text-center">
          <h2 className="font-heading text-4xl mb-6">
            Stay Updated
          </h2>
          <p className="text-background/70 max-w-xl mx-auto mb-8">
            Subscribe to our newsletter for travel inspiration, exclusive deals,
            and insider tips on luxury villa vacations.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
            <input
              type="email"
              placeholder="Enter your email"
              className="flex-1 px-6 py-4 bg-transparent border border-background/30 text-background placeholder:text-background/50 focus:outline-none focus:border-background"
            />
            <button className="px-8 py-4 bg-accent text-accent-foreground uppercase text-sm tracking-wider hover:bg-accent/90 transition-colors">
              Subscribe
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default BlogPage;
