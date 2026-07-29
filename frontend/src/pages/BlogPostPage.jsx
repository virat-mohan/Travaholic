import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Calendar, Clock, User, ArrowLeft, Share2, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "../components/ui/button";
import { Helmet } from "react-helmet-async";
import axios from "axios";
import { API } from "../App";
import { toast } from "sonner";

const BlogPostPage = () => {
  const { slug } = useParams();
  const [post, setPost] = useState(null);
  const [relatedVillas, setRelatedVillas] = useState([]);
  const [relatedPosts, setRelatedPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPost();
    window.scrollTo(0, 0);
  }, [slug]);

  const fetchPost = async () => {
    try {
      const response = await axios.get(`${API}/blog/posts/${slug}`);
      setPost(response.data.post);
      setRelatedVillas(response.data.related_villas || []);
      setRelatedPosts(response.data.related_posts || []);
    } catch (error) {
      console.error("Error fetching post:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(price || 0);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: post.title,
        text: post.excerpt,
        url: window.location.href
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied to clipboard!");
    }
  };

  // Convert markdown-like formatting to HTML
  const formatContent = (content) => {
    if (!content) return "";
    
    return content
      // Bold text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      // Bullet points
      .replace(/^• (.*?)$/gm, '<li>$1</li>')
      .replace(/(<li>.*<\/li>\n?)+/g, '<ul class="list-disc pl-5 my-4 space-y-2">$&</ul>')
      // Paragraphs
      .split('\n\n')
      .map(p => p.trim() ? `<p class="mb-4">${p}</p>` : '')
      .join('');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-center">
          <div className="h-8 bg-muted w-64 mx-auto mb-4" />
          <div className="h-4 bg-muted w-32 mx-auto" />
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="font-heading text-3xl mb-4">Post Not Found</h1>
          <p className="text-muted-foreground mb-6">This blog post doesn't exist or has been removed.</p>
          <Link to="/blog">
            <Button>Back to Blog</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{post.meta_title || post.title} | Travaholic Stays</title>
        <meta name="description" content={post.meta_description || post.excerpt} />
        {post.meta_keywords?.length > 0 && (
          <meta name="keywords" content={post.meta_keywords.join(', ')} />
        )}
        <link rel="canonical" href={post.canonical_url || `https://travaholicstays.com/blog/${post.slug}`} />
        
        {/* Open Graph */}
        <meta property="og:title" content={post.meta_title || post.title} />
        <meta property="og:description" content={post.meta_description || post.excerpt} />
        <meta property="og:image" content={post.featured_image} />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={`https://travaholicstays.com/blog/${post.slug}`} />
        
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={post.meta_title || post.title} />
        <meta name="twitter:description" content={post.meta_description || post.excerpt} />
        <meta name="twitter:image" content={post.featured_image} />
        
        {/* Article Schema */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            "headline": post.title,
            "description": post.excerpt,
            "image": post.featured_image,
            "author": {
              "@type": "Organization",
              "name": post.author
            },
            "publisher": {
              "@type": "Organization",
              "name": "Travaholic Stays",
              "logo": {
                "@type": "ImageObject",
                "url": "https://travaholicstays.com/logo.png"
              }
            },
            "datePublished": post.published_date,
            "dateModified": post.updated_at?.split('T')[0] || post.published_date,
            "mainEntityOfPage": {
              "@type": "WebPage",
              "@id": `https://travaholicstays.com/blog/${post.slug}`
            }
          })}
        </script>
      </Helmet>

      <div className="pt-24 min-h-screen bg-background" data-testid="blog-post-page">
        {/* Breadcrumb */}
        <div className="border-b border-border">
          <div className="container-luxury py-4">
            <nav className="flex items-center gap-2 text-sm text-muted-foreground">
              <Link to="/" className="hover:text-foreground">Home</Link>
              <ChevronRight size={14} />
              <Link to="/blog" className="hover:text-foreground">Blog</Link>
              <ChevronRight size={14} />
              <span className="text-foreground">{post.category}</span>
            </nav>
          </div>
        </div>

        {/* Hero */}
        <section className="py-12 bg-muted/30">
          <div className="container-luxury max-w-4xl">
            <Link to="/blog" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
              <ArrowLeft size={16} />
              Back to Blog
            </Link>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <span className="caption-text">{post.category}</span>
              <h1 className="font-heading text-3xl md:text-4xl lg:text-5xl mt-2 mb-6">
                {post.title}
              </h1>
              
              <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground mb-8">
                <span className="flex items-center gap-2">
                  <User size={16} />
                  {post.author}
                </span>
                <span className="flex items-center gap-2">
                  <Calendar size={16} />
                  {post.published_date}
                </span>
                <span className="flex items-center gap-2">
                  <Clock size={16} />
                  {post.read_time}
                </span>
                <Button variant="outline" size="sm" onClick={handleShare} className="ml-auto">
                  <Share2 size={14} className="mr-2" />
                  Share
                </Button>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Featured Image */}
        {post.featured_image && (
          <section className="container-luxury max-w-4xl -mt-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="aspect-[16/9] overflow-hidden"
            >
              <img
                src={post.featured_image}
                alt={post.title}
                className="w-full h-full object-cover"
              />
            </motion.div>
          </section>
        )}

        {/* Content */}
        <section className="section-spacing">
          <div className="container-luxury">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
              {/* Main Content */}
              <motion.article
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="lg:col-span-2"
              >
                <div 
                  className="prose prose-lg max-w-none
                    prose-headings:font-heading prose-headings:text-foreground
                    prose-p:text-muted-foreground prose-p:leading-relaxed
                    prose-strong:text-foreground
                    prose-li:text-muted-foreground
                    prose-a:text-accent prose-a:no-underline hover:prose-a:underline"
                  dangerouslySetInnerHTML={{ __html: formatContent(post.content) }}
                />

                {/* Tags */}
                {post.tags?.length > 0 && (
                  <div className="mt-8 pt-8 border-t">
                    <span className="text-sm text-muted-foreground mr-3">Tags:</span>
                    <div className="inline-flex flex-wrap gap-2">
                      {post.tags.map(tag => (
                        <span key={tag} className="px-3 py-1 bg-muted text-sm rounded-full">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </motion.article>

              {/* Sidebar */}
              <aside className="space-y-8">
                {/* Related Villas */}
                {relatedVillas.length > 0 && (
                  <div className="bg-card border border-border p-6">
                    <h3 className="font-heading text-xl mb-4">Featured Villas</h3>
                    <div className="space-y-4">
                      {relatedVillas.map(villa => (
                        <Link key={villa.villa_id} to={`/villas/${villa.slug}`} className="flex gap-4 group">
                          <img
                            src={villa.thumbnail}
                            alt={villa.name}
                            className="w-20 h-16 object-cover flex-shrink-0"
                          />
                          <div>
                            <p className="font-medium group-hover:text-accent transition-colors">{villa.name}</p>
                            <p className="text-sm text-muted-foreground">{villa.location}</p>
                            <p className="text-sm text-accent">{formatPrice(villa.base_price)}/night</p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* Related Posts */}
                {relatedPosts.length > 0 && (
                  <div className="bg-card border border-border p-6">
                    <h3 className="font-heading text-xl mb-4">Related Articles</h3>
                    <div className="space-y-4">
                      {relatedPosts.map(relPost => (
                        <Link key={relPost.slug} to={`/blog/${relPost.slug}`} className="flex gap-4 group">
                          <img
                            src={relPost.featured_image}
                            alt={relPost.title}
                            className="w-20 h-16 object-cover flex-shrink-0"
                          />
                          <div>
                            <p className="font-medium text-sm group-hover:text-accent transition-colors line-clamp-2">
                              {relPost.title}
                            </p>
                            <p className="text-xs text-muted-foreground">{relPost.category}</p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* CTA */}
                <div className="bg-accent/10 border border-accent/30 p-6 text-center">
                  <h3 className="font-heading text-xl mb-2">Plan Your Stay</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Ready to experience luxury? Browse our curated collection of villas.
                  </p>
                  <Link to="/villas">
                    <Button className="w-full">Explore Villas</Button>
                  </Link>
                </div>
              </aside>
            </div>
          </div>
        </section>

        {/* More Posts */}
        <section className="section-spacing bg-muted/30">
          <div className="container-luxury">
            <h2 className="font-heading text-2xl mb-8">More from the Journal</h2>
            <div className="flex gap-4">
              <Link to="/blog">
                <Button variant="outline">View All Posts</Button>
              </Link>
            </div>
          </div>
        </section>
      </div>
    </>
  );
};

export default BlogPostPage;
