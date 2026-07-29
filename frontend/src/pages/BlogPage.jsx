import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Calendar, Clock, User, Search } from "lucide-react";
import { motion } from "framer-motion";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Helmet } from "react-helmet-async";
import axios from "axios";
import { API } from "../App";

const BlogPage = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchPosts();
    fetchCategories();
  }, [selectedCategory]);

  const fetchPosts = async () => {
    try {
      const params = selectedCategory ? `?category=${encodeURIComponent(selectedCategory)}` : "";
      const response = await axios.get(`${API}/blog/posts${params}`);
      setPosts(response.data.posts || []);
    } catch (error) {
      console.error("Error fetching posts:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${API}/blog/categories`);
      setCategories(response.data.categories || []);
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const filteredPosts = posts.filter(post => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return post.title.toLowerCase().includes(search) || 
           post.excerpt.toLowerCase().includes(search) ||
           post.category.toLowerCase().includes(search);
  });

  const featuredPost = filteredPosts.find(p => p.is_featured);
  const regularPosts = filteredPosts.filter(p => !p.is_featured || p !== featuredPost);

  return (
    <>
      <Helmet>
        <title>Travel Blog | Travaholic Stays - Luxury Villa Guides & Tips</title>
        <meta name="description" content="Discover travel guides, destination tips, and luxury villa insights from Travaholic Stays. Plan your perfect Goa, Mussoorie, or Himachal vacation." />
        <meta name="keywords" content="goa travel blog, luxury villa guide, north goa beaches, mussoorie travel tips, himachal vacation" />
        <link rel="canonical" href="https://travaholicstays.com/blog" />
      </Helmet>

      <div className="pt-24 min-h-screen bg-background" data-testid="blog-page">
        {/* Hero Section */}
        <section className="bg-foreground text-background py-20">
          <div className="container-luxury text-center">
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="caption-text mb-4 text-background/60"
            >
              Travel Inspiration
            </motion.p>
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="font-heading text-4xl md:text-5xl lg:text-6xl mb-6"
            >
              The Travaholic Journal
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-background/70 max-w-2xl mx-auto text-lg"
            >
              Destination guides, travel tips, and insights for the discerning traveler
            </motion.p>
          </div>
        </section>

        {/* Search & Filter */}
        <section className="border-b border-border">
          <div className="container-luxury py-6">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="relative w-full md:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                <Input
                  placeholder="Search articles..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={selectedCategory === null ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(null)}
                >
                  All
                </Button>
                {categories.map(cat => (
                  <Button
                    key={cat.name}
                    variant={selectedCategory === cat.name ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedCategory(cat.name)}
                  >
                    {cat.name} ({cat.count})
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Blog Posts */}
        <section className="section-spacing bg-background">
          <div className="container-luxury">
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="aspect-[4/3] bg-muted mb-4" />
                    <div className="h-4 bg-muted w-1/4 mb-2" />
                    <div className="h-6 bg-muted w-3/4 mb-2" />
                    <div className="h-4 bg-muted w-full" />
                  </div>
                ))}
              </div>
            ) : filteredPosts.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No posts found</p>
                {searchTerm && (
                  <Button variant="link" onClick={() => setSearchTerm("")}>
                    Clear search
                  </Button>
                )}
              </div>
            ) : (
              <>
                {/* Featured Post */}
                {featuredPost && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-12"
                  >
                    <Link to={`/blog/${featuredPost.slug}`}>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 group">
                        <div className="aspect-[4/3] overflow-hidden">
                          <img
                            src={featuredPost.featured_image}
                            alt={featuredPost.title}
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                          />
                        </div>
                        <div className="flex flex-col justify-center">
                          <span className="caption-text mb-4">{featuredPost.category}</span>
                          <h2 className="font-heading text-3xl md:text-4xl mb-4 group-hover:text-accent transition-colors">
                            {featuredPost.title}
                          </h2>
                          <p className="text-muted-foreground mb-6 text-lg">
                            {featuredPost.excerpt}
                          </p>
                          <div className="flex items-center gap-6 text-sm text-muted-foreground mb-6">
                            <span className="flex items-center gap-2">
                              <User size={14} />
                              {featuredPost.author}
                            </span>
                            <span className="flex items-center gap-2">
                              <Calendar size={14} />
                              {featuredPost.published_date}
                            </span>
                            <span className="flex items-center gap-2">
                              <Clock size={14} />
                              {featuredPost.read_time}
                            </span>
                          </div>
                          <span className="flex items-center gap-2 text-accent group-hover:gap-4 transition-all">
                            Read Article <ArrowRight size={16} />
                          </span>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                )}

                {/* Regular Posts Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {regularPosts.map((post, index) => (
                    <motion.article
                      key={post.post_id || post.slug}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="group"
                    >
                      <Link to={`/blog/${post.slug}`}>
                        <div className="aspect-[4/3] overflow-hidden mb-4">
                          <img
                            src={post.featured_image}
                            alt={post.title}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                        </div>
                        <span className="caption-text">{post.category}</span>
                        <h3 className="font-heading text-xl mt-2 mb-3 group-hover:text-accent transition-colors">
                          {post.title}
                        </h3>
                        <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
                          {post.excerpt}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar size={12} />
                            {post.published_date}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock size={12} />
                            {post.read_time}
                          </span>
                        </div>
                      </Link>
                    </motion.article>
                  ))}
                </div>
              </>
            )}
          </div>
        </section>

        {/* Newsletter CTA */}
        <section className="section-spacing bg-muted/30">
          <div className="container-luxury text-center max-w-2xl mx-auto">
            <h2 className="font-heading text-3xl mb-4">Stay Inspired</h2>
            <p className="text-muted-foreground mb-8">
              Get travel tips, destination guides, and exclusive villa offers delivered to your inbox.
            </p>
            <div className="flex gap-4 max-w-md mx-auto">
              <Input placeholder="Your email address" className="flex-1" />
              <Button>Subscribe</Button>
            </div>
          </div>
        </section>
      </div>
    </>
  );
};

export default BlogPage;
