import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, Filter, X, MapPin, Users, Bed } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Checkbox } from "../components/ui/checkbox";
import { Slider } from "../components/ui/slider";
import VillaCard from "../components/VillaCard";
import CallbackModal from "../components/CallbackModal";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { API } from "../App";

const VillasPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [villas, setVillas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [locations, setLocations] = useState([]);
  const [regions, setRegions] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [callbackOpen, setCallbackOpen] = useState(false);
  const [total, setTotal] = useState(0);

  const [filters, setFilters] = useState({
    location: searchParams.get("location") || "",
    region: searchParams.get("region") || "",
    minGuests: searchParams.get("minGuests") || "",
    hasPool: searchParams.get("hasPool") === "true",
    priceRange: [0, 100000],
  });

  useEffect(() => {
    fetchLocations();
    fetchVillas();
  }, []);

  useEffect(() => {
    fetchVillas();
  }, [filters]);

  const fetchLocations = async () => {
    try {
      const response = await axios.get(`${API}/locations`);
      setLocations(response.data.locations || []);
      setRegions(response.data.regions || []);
    } catch (error) {
      console.error("Error fetching locations:", error);
    }
  };

  const fetchVillas = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.location) params.append("location", filters.location);
      if (filters.region) params.append("region", filters.region);
      if (filters.minGuests) params.append("min_guests", filters.minGuests);
      if (filters.hasPool) params.append("has_pool", "true");
      if (filters.priceRange[0] > 0)
        params.append("min_price", filters.priceRange[0]);
      if (filters.priceRange[1] < 100000)
        params.append("max_price", filters.priceRange[1]);

      const response = await axios.get(`${API}/villas?${params.toString()}`);
      setVillas(response.data.villas);
      setTotal(response.data.total);
    } catch (error) {
      console.error("Error fetching villas:", error);
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    setFilters({
      location: "",
      region: "",
      minGuests: "",
      hasPool: false,
      priceRange: [0, 100000],
    });
    setSearchParams({});
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(price);
  };

  const hasActiveFilters =
    filters.location ||
    filters.region ||
    filters.minGuests ||
    filters.hasPool ||
    filters.priceRange[0] > 0 ||
    filters.priceRange[1] < 100000;

  return (
    <div className="pt-24 min-h-screen bg-background" data-testid="villas-page">
      {/* Header */}
      <section className="container-luxury py-12">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div>
            <p className="caption-text mb-4">Our Collection</p>
            <h1 className="font-heading text-4xl md:text-5xl">
              Luxury Villas
            </h1>
            <p className="text-muted-foreground mt-4">
              {total} {total === 1 ? "property" : "properties"} available
            </p>
          </div>
          <div className="flex gap-4">
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2"
              data-testid="filter-toggle-btn"
            >
              <Filter size={16} />
              Filters
              {hasActiveFilters && (
                <span className="w-2 h-2 bg-accent rounded-full" />
              )}
            </Button>
            <Button
              onClick={() => setCallbackOpen(true)}
              className="btn-luxury"
              data-testid="need-help-btn"
            >
              Need Help?
            </Button>
          </div>
        </div>
      </section>

      {/* Filters Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.section
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="border-y border-border bg-card"
          >
            <div className="container-luxury py-8">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                {/* Location */}
                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">
                    Location
                  </label>
                  <Select
                    value={filters.location}
                    onValueChange={(value) =>
                      setFilters({ ...filters, location: value })
                    }
                  >
                    <SelectTrigger data-testid="location-filter">
                      <SelectValue placeholder="All Locations" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Locations</SelectItem>
                      {locations.map((loc) => (
                        <SelectItem key={loc} value={loc}>
                          {loc}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Region */}
                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">
                    Region
                  </label>
                  <Select
                    value={filters.region}
                    onValueChange={(value) =>
                      setFilters({ ...filters, region: value })
                    }
                  >
                    <SelectTrigger data-testid="region-filter">
                      <SelectValue placeholder="All Regions" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Regions</SelectItem>
                      {regions.map((reg) => (
                        <SelectItem key={reg} value={reg}>
                          {reg}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Guests */}
                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">
                    Min Guests
                  </label>
                  <Select
                    value={filters.minGuests}
                    onValueChange={(value) =>
                      setFilters({ ...filters, minGuests: value })
                    }
                  >
                    <SelectTrigger data-testid="guests-filter">
                      <SelectValue placeholder="Any" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Any</SelectItem>
                      <SelectItem value="2">2+ Guests</SelectItem>
                      <SelectItem value="4">4+ Guests</SelectItem>
                      <SelectItem value="6">6+ Guests</SelectItem>
                      <SelectItem value="8">8+ Guests</SelectItem>
                      <SelectItem value="10">10+ Guests</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Price Range */}
                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">
                    Price Range: {formatPrice(filters.priceRange[0])} -{" "}
                    {formatPrice(filters.priceRange[1])}
                  </label>
                  <Slider
                    value={filters.priceRange}
                    onValueChange={(value) =>
                      setFilters({ ...filters, priceRange: value })
                    }
                    min={0}
                    max={100000}
                    step={5000}
                    className="mt-4"
                    data-testid="price-slider"
                  />
                </div>

                {/* Pool Filter & Clear */}
                <div className="flex flex-col justify-end gap-4">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="hasPool"
                      checked={filters.hasPool}
                      onCheckedChange={(checked) =>
                        setFilters({ ...filters, hasPool: checked })
                      }
                      data-testid="pool-filter"
                    />
                    <label htmlFor="hasPool" className="text-sm">
                      Private Pool Only
                    </label>
                  </div>
                  {hasActiveFilters && (
                    <Button
                      variant="ghost"
                      onClick={clearFilters}
                      className="text-sm"
                      data-testid="clear-filters-btn"
                    >
                      <X size={14} className="mr-1" />
                      Clear Filters
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* Villas Grid */}
      <section className="container-luxury section-spacing">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="aspect-[4/3] bg-muted mb-4" />
                <div className="h-4 bg-muted w-3/4 mb-2" />
                <div className="h-3 bg-muted w-1/2" />
              </div>
            ))}
          </div>
        ) : villas.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-12">
            {villas.map((villa, index) => (
              <VillaCard key={villa.villa_id} villa={villa} index={index} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <p className="text-muted-foreground text-lg mb-4">
              No villas found matching your criteria.
            </p>
            <Button variant="outline" onClick={clearFilters}>
              Clear Filters
            </Button>
          </div>
        )}
      </section>

      {/* Callback Modal */}
      <CallbackModal
        isOpen={callbackOpen}
        onClose={() => setCallbackOpen(false)}
      />
    </div>
  );
};

export default VillasPage;
