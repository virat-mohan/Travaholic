import { Link } from "react-router-dom";
import { MapPin, Users, Bed, Bath } from "lucide-react";
import { motion } from "framer-motion";

const VillaCard = ({ villa, index = 0 }) => {
  const formatPrice = (price) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(price);
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
        {/* Image */}
        <div className="relative aspect-[4/3] overflow-hidden">
          <img
            src={villa.thumbnail || villa.images?.[0] || "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800"}
            alt={villa.name}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
          {villa.has_pool && (
            <span className="absolute top-4 left-4 bg-accent text-accent-foreground px-3 py-1 text-xs uppercase tracking-wider">
              Private Pool
            </span>
          )}
        </div>

        {/* Content */}
        <div className="p-6">
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
              <span className="text-xs text-muted-foreground uppercase tracking-wider">
                From
              </span>
              <p className="font-heading text-xl">
                {formatPrice(villa.base_price)}
                <span className="text-sm font-body text-muted-foreground">
                  /night
                </span>
              </p>
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
