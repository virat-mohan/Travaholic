import { useState } from "react";
import { Link } from "react-router-dom";
import { MapPin, Users, Bed, Bath, ChevronLeft, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";

// Extract caption from image URL filename
const getImageCaption = (url) => {
  if (!url) return "";
  try {
    // Get filename from URL
    const filename = url.split("/").pop().split("?")[0];
    // URL decode the filename
    const decodedFilename = decodeURIComponent(filename);
    // Remove extension
    const nameWithoutExt = decodedFilename.replace(/\.[^/.]+$/, "");
    // Replace dashes, underscores with spaces and capitalize
    const caption = nameWithoutExt
      .replace(/[-_]/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase())
      .trim();
    return caption;
  } catch {
    return "";
  }
};

const VillaCard = ({ villa, index = 0, showCaption = false }) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  
  const formatPrice = (price) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(price);
  };

  // Get up to 5 images for the carousel, starting with the villa's chosen
  // thumbnail (usually the facade shot) rather than whatever happened to
  // be first in the raw array.
  const orderedImages = villa.images?.length
    ? villa.thumbnail && villa.images.includes(villa.thumbnail)
      ? [villa.thumbnail, ...villa.images.filter((i) => i !== villa.thumbnail)]
      : villa.images
    : [villa.thumbnail || "/villas/la-sierra-12/Pool area.jpeg"];
  const images = orderedImages.slice(0, 5);
  const currentImage = images[currentImageIndex] || images[0];
  const imageCaption = showCaption ? getImageCaption(currentImage) : "";

  const nextImage = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="group card-luxury"
      data-testid={`villa-card-${villa.slug}`}
    >
      <Link to={`/villas/${villa.slug}`}>
        {/* Image Carousel */}
        <div className="relative aspect-[4/3] overflow-hidden">
          <img
            src={currentImage}
            alt={villa.name}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
          
          {/* Navigation Arrows */}
          {images.length > 1 && (
            <>
              <button
                onClick={prevImage}
                className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                data-testid="villa-card-prev"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                onClick={nextImage}
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                data-testid="villa-card-next"
              >
                <ChevronRight size={18} />
              </button>
            </>
          )}
          
          {/* Image Dots Indicator */}
          {images.length > 1 && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
              {images.map((_, idx) => (
                <button
                  key={idx}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setCurrentImageIndex(idx);
                  }}
                  className={`w-2 h-2 rounded-full transition-all ${
                    idx === currentImageIndex 
                      ? "bg-white w-4" 
                      : "bg-white/50 hover:bg-white/75"
                  }`}
                />
              ))}
            </div>
          )}
          
        </div>
        
        {/* Image Caption Below */}
        {imageCaption && (
          <div className="px-6 py-2 bg-muted/30 border-x border-border">
            <p className="text-sm text-muted-foreground truncate">{imageCaption}</p>
          </div>
        )}

        {/* Content */}
        <div className="p-6 pt-4">
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
            <MapPin size={14} />
            <span>{villa.location}, {villa.region}</span>
          </div>

          <h3 className="font-heading text-xl mb-3 group-hover:text-accent transition-colors">
            {villa.name}
          </h3>

          <p className="text-muted-foreground text-sm line-clamp-2 mb-4">
            {villa.short_description || villa.description?.substring(0, 100)}
          </p>

          {/* Features */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
            <span className="flex items-center gap-1">
              <Users size={14} />
              {villa.max_guests} Guests
            </span>
            <span className="flex items-center gap-1">
              <Bed size={14} />
              {villa.bedrooms} Beds
            </span>
            <span className="flex items-center gap-1">
              <Bath size={14} />
              {villa.bathrooms} Baths
            </span>
          </div>

          {/* Price */}
          <div className="flex items-baseline justify-between pt-4 border-t border-border">
            <div>
              {villa.hide_price ? (
                <p className="font-heading text-lg text-accent">
                  Request Callback
                </p>
              ) : (
                <>
                  <span className="text-xs text-muted-foreground uppercase tracking-wider">
                    From
                  </span>
                  <p className="font-heading text-xl">
                    {formatPrice(villa.base_price)}
                    <span className="text-sm font-body text-muted-foreground">
                      /night
                    </span>
                  </p>
                </>
              )}
            </div>
            <span className="text-sm uppercase tracking-wider text-accent group-hover:underline">
              View Details
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
};

export default VillaCard;

// Export helper for use in other components
export { getImageCaption };
