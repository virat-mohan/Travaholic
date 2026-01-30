import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import {
  MapPin, Users, Bed, Bath, Check, Phone, MessageCircle,
  ChevronLeft, ChevronRight, Calendar, Plus, Minus, X
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Calendar as CalendarComponent } from "../components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "../components/ui/popover";
import { Checkbox } from "../components/ui/checkbox";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import CallbackModal from "../components/CallbackModal";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { format, addDays, differenceInDays, isAfter, isBefore, parseISO } from "date-fns";
import axios from "axios";
import { API } from "../App";

const VillaDetailPage = () => {
  const { slug } = useParams();
  const [villa, setVilla] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [callbackOpen, setCallbackOpen] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [addons, setAddons] = useState([]);
  const [blockedDates, setBlockedDates] = useState([]);

  // Booking state
  const [checkIn, setCheckIn] = useState(null);
  const [checkOut, setCheckOut] = useState(null);
  const [numGuests, setNumGuests] = useState(2);
  const [selectedAddons, setSelectedAddons] = useState([]);
  const [pricing, setPricing] = useState(null);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [guestInfo, setGuestInfo] = useState({
    name: "",
    email: "",
    phone: "",
    specialRequests: "",
  });

  useEffect(() => {
    fetchVilla();
    fetchAddons();
  }, [slug]);

  useEffect(() => {
    if (villa && checkIn && checkOut) {
      calculatePrice();
    }
  }, [checkIn, checkOut, selectedAddons, villa]);

  const fetchVilla = async () => {
    try {
      const response = await axios.get(`${API}/villas/slug/${slug}`);
      setVilla(response.data);
      // Fetch availability
      const availResponse = await axios.get(`${API}/villas/${response.data.villa_id}/availability`);
      const blocked = availResponse.data.blocked_dates || [];
      setBlockedDates(blocked);
    } catch (error) {
      console.error("Error fetching villa:", error);
      toast.error("Villa not found");
    } finally {
      setLoading(false);
    }
  };

  const fetchAddons = async () => {
    try {
      const response = await axios.get(`${API}/addons`);
      setAddons(response.data.addons || []);
    } catch (error) {
      console.error("Error fetching addons:", error);
    }
  };

  const calculatePrice = async () => {
    if (!villa || !checkIn || !checkOut) return;

    try {
      const response = await axios.post(`${API}/bookings/calculate-price`, {
        villa_id: villa.villa_id,
        check_in: format(checkIn, "yyyy-MM-dd"),
        check_out: format(checkOut, "yyyy-MM-dd"),
        addons: selectedAddons.map((a) => ({ addon_id: a.addon_id, quantity: a.quantity || 1 })),
      });
      setPricing(response.data);
    } catch (error) {
      console.error("Error calculating price:", error);
    }
  };

  const handleAddonToggle = (addon) => {
    const exists = selectedAddons.find((a) => a.addon_id === addon.addon_id);
    if (exists) {
      setSelectedAddons(selectedAddons.filter((a) => a.addon_id !== addon.addon_id));
    } else {
      setSelectedAddons([...selectedAddons, { ...addon, quantity: 1 }]);
    }
  };

  const handleAddonQuantity = (addonId, change) => {
    setSelectedAddons(
      selectedAddons.map((a) => {
        if (a.addon_id === addonId) {
          const newQty = Math.max(1, (a.quantity || 1) + change);
          return { ...a, quantity: newQty };
        }
        return a;
      })
    );
  };

  const isDateBlocked = (date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return blockedDates.some((block) => {
      return dateStr >= block.start_date && dateStr <= block.end_date;
    });
  };

  const handleBooking = async () => {
    if (!guestInfo.name || !guestInfo.email || !guestInfo.phone) {
      toast.error("Please fill in all guest details");
      return;
    }

    setBookingLoading(true);
    try {
      const bookingData = {
        villa_id: villa.villa_id,
        guest_name: guestInfo.name,
        guest_email: guestInfo.email,
        guest_phone: guestInfo.phone,
        check_in: format(checkIn, "yyyy-MM-dd"),
        check_out: format(checkOut, "yyyy-MM-dd"),
        num_guests: numGuests,
        addons: selectedAddons.map((a) => ({ addon_id: a.addon_id, quantity: a.quantity || 1 })),
        special_requests: guestInfo.specialRequests,
      };

      const response = await axios.post(`${API}/bookings`, bookingData);
      toast.success("Booking created! Proceeding to payment...");
      
      // Create payment order
      try {
        const paymentResponse = await axios.post(`${API}/payments/create-order`, {
          booking_id: response.data.booking_id,
        });

        // Load Razorpay
        const options = {
          key: paymentResponse.data.key_id,
          amount: paymentResponse.data.amount,
          currency: "INR",
          order_id: paymentResponse.data.order_id,
          name: "Travaholic Stays",
          description: `Booking for ${villa.name}`,
          handler: async function (response) {
            try {
              await axios.post(`${API}/payments/verify`, {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              });
              toast.success("Payment successful! Booking confirmed.");
              setShowBookingModal(false);
              fetchVilla(); // Refresh availability
            } catch (error) {
              toast.error("Payment verification failed");
            }
          },
          prefill: {
            name: guestInfo.name,
            email: guestInfo.email,
            contact: guestInfo.phone,
          },
          theme: {
            color: "#C6A87C",
          },
        };

        const razorpay = new window.Razorpay(options);
        razorpay.open();
      } catch (paymentError) {
        toast.info("Booking created! Payment gateway not configured yet. Our team will contact you.");
      }
    } catch (error) {
      console.error("Booking error:", error);
      toast.error(error.response?.data?.detail || "Failed to create booking");
    } finally {
      setBookingLoading(false);
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(price);
  };

  if (loading) {
    return (
      <div className="pt-24 min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!villa) {
    return (
      <div className="pt-24 min-h-screen flex flex-col items-center justify-center">
        <p className="text-xl mb-4">Villa not found</p>
        <Link to="/villas">
          <Button>Browse Villas</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="pt-24 min-h-screen bg-background" data-testid="villa-detail-page">
      {/* Breadcrumb */}
      <div className="container-luxury py-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link to="/" className="hover:text-foreground">Home</Link>
          <span>/</span>
          <Link to="/villas" className="hover:text-foreground">Villas</Link>
          <span>/</span>
          <span className="text-foreground">{villa.name}</span>
        </div>
      </div>

      {/* Image Gallery */}
      <section className="container-luxury">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Main Image */}
          <div className="relative aspect-[4/3] overflow-hidden group">
            <img
              src={villa.images?.[selectedImageIndex] || villa.thumbnail}
              alt={villa.name}
              className="w-full h-full object-cover"
            />
            {villa.images?.length > 1 && (
              <>
                <button
                  onClick={() => setSelectedImageIndex((prev) => prev === 0 ? villa.images.length - 1 : prev - 1)}
                  className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-background/80 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  data-testid="prev-image-btn"
                >
                  <ChevronLeft size={24} />
                </button>
                <button
                  onClick={() => setSelectedImageIndex((prev) => prev === villa.images.length - 1 ? 0 : prev + 1)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-background/80 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  data-testid="next-image-btn"
                >
                  <ChevronRight size={24} />
                </button>
              </>
            )}
          </div>

          {/* Thumbnail Grid */}
          <div className="grid grid-cols-2 gap-4">
            {villa.images?.slice(0, 4).map((img, index) => (
              <div
                key={index}
                className={`aspect-[4/3] overflow-hidden cursor-pointer ${
                  index === selectedImageIndex ? "ring-2 ring-accent" : ""
                }`}
                onClick={() => setSelectedImageIndex(index)}
              >
                <img src={img} alt={`${villa.name} ${index + 1}`} className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="container-luxury section-spacing">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Left - Details */}
          <div className="lg:col-span-7">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-4">
              <MapPin size={16} />
              <span>{villa.location}, {villa.region}</span>
            </div>

            <h1 className="font-heading text-4xl md:text-5xl mb-6">{villa.name}</h1>

            {/* Features */}
            <div className="flex flex-wrap gap-6 py-6 border-y border-border">
              <div className="flex items-center gap-2">
                <Users size={20} className="text-accent" />
                <span>{villa.max_guests} Guests</span>
              </div>
              <div className="flex items-center gap-2">
                <Bed size={20} className="text-accent" />
                <span>{villa.bedrooms} Bedrooms</span>
              </div>
              <div className="flex items-center gap-2">
                <Bath size={20} className="text-accent" />
                <span>{villa.bathrooms} Bathrooms</span>
              </div>
              {villa.has_pool && (
                <div className="flex items-center gap-2">
                  <span className="text-xl">🏊</span>
                  <span>Private Pool</span>
                </div>
              )}
            </div>

            {/* Description */}
            <div className="py-8">
              <h2 className="font-heading text-2xl mb-4">About this villa</h2>
              <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                {villa.description}
              </p>
            </div>

            {/* Amenities */}
            <div className="py-8 border-t border-border">
              <h2 className="font-heading text-2xl mb-6">Amenities</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {villa.amenities?.map((amenity, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <Check size={16} className="text-accent" />
                    <span>{amenity}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* House Rules & Policies */}
            <div className="py-8 border-t border-border" data-testid="house-rules-section">
              <h2 className="font-heading text-2xl mb-6">House Rules & Policies</h2>
              
              {/* Cancellation Policy */}
              <div className="mb-8">
                <h3 className="font-medium text-lg mb-4 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-accent rounded-full"></span>
                  Cancellation Policy
                </h3>
                <ul className="space-y-3 text-muted-foreground">
                  <li className="flex items-start gap-3">
                    <span className="text-green-600 font-medium min-w-[100px]">100% refund</span>
                    <span>if cancellation is made 30 days or more before check-in date</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-amber-600 font-medium min-w-[100px]">50% refund</span>
                    <span>if cancellation is made between 15 to 30 days before check-in date</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-red-600 font-medium min-w-[100px]">No refund</span>
                    <span>if cancellation is made within 15 days of check-in date</span>
                  </li>
                </ul>
              </div>

              {/* House Rules */}
              <div className="mb-8">
                <h3 className="font-medium text-lg mb-4 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-accent rounded-full"></span>
                  House Rules
                </h3>
                <ul className="space-y-4 text-muted-foreground">
                  <li className="flex items-start gap-3">
                    <span className="text-accent mt-1">•</span>
                    <span><strong>No Drugs & Smoking Policy:</strong> Drugs are strictly prohibited on the premises. Smoking is allowed only on balconies and outdoor areas. A cleaning fee of ₹10,000 per room will be charged if smoking is found inside the property to cover costs of deodorising drapes and upholstery.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-accent mt-1">•</span>
                    <span><strong>Guest Registration:</strong> Please provide accurate details about all guests staying at the time of booking and in the check-in form (number of people, composition of the group). We maintain a strict "no visitor" policy and cannot provide access to guests who are not part of the reservation.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-accent mt-1">•</span>
                    <span><strong>Peaceful Community:</strong> Our properties are part of peaceful residential communities. Loud music and parties are not permitted in outdoor areas.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-accent mt-1">•</span>
                    <span><strong>Occupancy & Charges:</strong> Base rates are for up to 6 guests. An additional charge of ₹2,000 per person applies for extra guests. Maximum occupancy is 8 guests.</span>
                  </li>
                </ul>
              </div>

              {/* Check-in/Check-out */}
              <div className="bg-muted/50 p-6 border border-border">
                <h3 className="font-medium text-lg mb-4 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-accent rounded-full"></span>
                  Check-in & Check-out
                </h3>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Check-in Time</p>
                    <p className="font-heading text-xl">2:00 PM</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Check-out Time</p>
                    <p className="font-heading text-xl">11:00 AM</p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mt-4">
                  Early check-in and late check-out are subject to availability. Please contact us in advance to request.
                </p>
              </div>
            </div>
          </div>

          {/* Right - Booking Card */}
          <div className="lg:col-span-5">
            <div className="sticky top-28 bg-card border border-border p-8">
              {/* Long-Stay Discount Banner */}
              <div className="bg-accent/10 border border-accent/30 p-4 mb-6 text-sm" data-testid="long-stay-discount-banner">
                <p className="font-medium text-accent mb-2">Planning a longer stay?</p>
                <p className="text-muted-foreground leading-relaxed">
                  Enjoy up to <span className="font-semibold text-foreground">40% off</span> for stays of 28 days and more, and up to <span className="font-semibold text-foreground">20% off</span> for 7 nights or longer. Select your dates to view tailored options and unlock exclusive long-stay savings.
                </p>
              </div>

              <div className="flex items-baseline justify-between mb-6">
                <div>
                  <span className="text-xs text-muted-foreground uppercase tracking-wider">From</span>
                  <p className="font-heading text-3xl">
                    {formatPrice(villa.base_price)}
                    <span className="text-base font-body text-muted-foreground">/night</span>
                  </p>
                </div>
                {villa.weekend_price && villa.weekend_price !== villa.base_price && (
                  <div className="text-right">
                    <span className="text-xs text-muted-foreground uppercase tracking-wider">Weekend</span>
                    <p className="font-heading text-xl text-muted-foreground">
                      {formatPrice(villa.weekend_price)}
                    </p>
                  </div>
                )}
              </div>

              {/* Date Selection */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="justify-start text-left font-normal" data-testid="checkin-btn">
                      <Calendar size={16} className="mr-2" />
                      {checkIn ? format(checkIn, "MMM dd") : "Check-in"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={checkIn}
                      onSelect={(date) => {
                        setCheckIn(date);
                        if (checkOut && !isAfter(checkOut, date)) {
                          setCheckOut(addDays(date, villa.minimum_nights || 1));
                        }
                      }}
                      disabled={(date) => isBefore(date, new Date()) || isDateBlocked(date)}
                    />
                  </PopoverContent>
                </Popover>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="justify-start text-left font-normal" data-testid="checkout-btn">
                      <Calendar size={16} className="mr-2" />
                      {checkOut ? format(checkOut, "MMM dd") : "Check-out"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={checkOut}
                      onSelect={setCheckOut}
                      disabled={(date) => !checkIn || isBefore(date, addDays(checkIn, villa.minimum_nights || 1)) || isDateBlocked(date)}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Guests */}
              <div className="flex items-center justify-between py-4 border-y border-border mb-4">
                <span className="text-sm">Guests</span>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setNumGuests(Math.max(1, numGuests - 1))}
                    className="p-1 border border-border rounded"
                    data-testid="decrease-guests-btn"
                  >
                    <Minus size={16} />
                  </button>
                  <span className="w-8 text-center">{numGuests}</span>
                  <button
                    onClick={() => setNumGuests(Math.min(villa.max_guests, numGuests + 1))}
                    className="p-1 border border-border rounded"
                    data-testid="increase-guests-btn"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>

              {/* Pricing Summary */}
              {pricing && (
                <div className="space-y-3 mb-6 text-sm">
                  <div className="flex justify-between">
                    <span>{formatPrice(villa.base_price)} x {pricing.num_nights} nights</span>
                    <span>{formatPrice(pricing.base_amount)}</span>
                  </div>
                  {pricing.addons_total > 0 && (
                    <div className="flex justify-between">
                      <span>Add-ons</span>
                      <span>{formatPrice(pricing.addons_total)}</span>
                    </div>
                  )}
                  {pricing.security_deposit > 0 && (
                    <div className="flex justify-between text-muted-foreground">
                      <span>Security Deposit (refundable)</span>
                      <span>{formatPrice(pricing.security_deposit)}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-3 border-t border-border font-medium text-base">
                    <span>Total</span>
                    <span>{formatPrice(pricing.total_amount)}</span>
                  </div>
                </div>
              )}

              <Button
                className="w-full btn-luxury mb-4"
                onClick={() => setShowBookingModal(true)}
                disabled={!checkIn || !checkOut}
                data-testid="book-now-btn"
              >
                {checkIn && checkOut ? "Book Now" : "Select Dates"}
              </Button>

              <div className="flex gap-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setCallbackOpen(true)}
                  data-testid="request-callback-villa-btn"
                >
                  <Phone size={16} className="mr-2" />
                  Callback
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  asChild
                >
                  <a
                    href={`https://wa.me/919876543210?text=Hi, I'm interested in ${villa.name}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-testid="whatsapp-btn"
                  >
                    <MessageCircle size={16} className="mr-2" />
                    WhatsApp
                  </a>
                </Button>
              </div>

              <p className="text-xs text-muted-foreground text-center mt-4">
                Minimum {villa.minimum_nights} night{villa.minimum_nights > 1 ? "s" : ""} stay
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Booking Modal */}
      <AnimatePresence>
        {showBookingModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
            data-testid="booking-modal"
          >
            <div className="absolute inset-0 bg-foreground/60 backdrop-blur-sm" onClick={() => setShowBookingModal(false)} />

            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-card w-full max-w-2xl p-8 my-8 max-h-[90vh] overflow-y-auto"
            >
              <button
                onClick={() => setShowBookingModal(false)}
                className="absolute top-4 right-4 p-2 text-muted-foreground hover:text-foreground"
                data-testid="close-booking-modal"
              >
                <X size={20} />
              </button>

              <h3 className="font-heading text-2xl mb-2">Complete Your Booking</h3>
              <p className="text-muted-foreground mb-6">{villa.name}</p>

              {/* Booking Summary */}
              <div className="bg-muted/50 p-4 mb-6">
                <div className="flex justify-between mb-2">
                  <span>Check-in</span>
                  <span className="font-medium">{checkIn ? format(checkIn, "MMM dd, yyyy") : "-"}</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span>Check-out</span>
                  <span className="font-medium">{checkOut ? format(checkOut, "MMM dd, yyyy") : "-"}</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span>Guests</span>
                  <span className="font-medium">{numGuests}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-border">
                  <span className="font-medium">Total</span>
                  <span className="font-medium">{pricing ? formatPrice(pricing.total_amount) : "-"}</span>
                </div>
              </div>

              {/* Add-ons Selection */}
              <div className="mb-6">
                <h4 className="font-medium mb-4">Enhance Your Stay</h4>
                
                {/* Chef Service - Variable pricing based on villa bedrooms */}
                <div className="space-y-3 mb-4">
                  <div
                    className={`p-4 border ${selectedAddons.find(a => a.addon_id === 'chef-service') ? "border-accent bg-accent/5" : "border-border"} cursor-pointer`}
                    onClick={() => {
                      const chefAddon = {
                        addon_id: 'chef-service',
                        name: 'Chef Cooked Meal',
                        description: `Enjoy a freshly prepared meal by our professional chef (${villa.bedrooms} BHK rate)`,
                        price: villa.bedrooms === 2 ? 1770 : villa.bedrooms === 3 ? 2360 : villa.bedrooms >= 4 ? 3540 : 2360,
                        is_per_day: false
                      };
                      handleAddonToggle(chefAddon);
                    }}
                    data-testid="chef-service-addon"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <Checkbox checked={!!selectedAddons.find(a => a.addon_id === 'chef-service')} />
                        <div>
                          <p className="font-medium">Chef Cooked Meal</p>
                          <p className="text-sm text-muted-foreground">Enjoy a freshly prepared meal by our professional chef</p>
                          <div className="text-xs text-muted-foreground mt-1">
                            <span className="block">2 BHK: ₹1,500 + GST (₹1,770)</span>
                            <span className="block">3 BHK: ₹2,000 + GST (₹2,360)</span>
                            <span className="block">4 BHK: ₹3,000 + GST (₹3,540)</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">
                          ₹{villa.bedrooms === 2 ? '1,770' : villa.bedrooms === 3 ? '2,360' : villa.bedrooms >= 4 ? '3,540' : '2,360'}
                        </p>
                        <p className="text-xs text-muted-foreground">/meal</p>
                      </div>
                    </div>
                    {selectedAddons.find(a => a.addon_id === 'chef-service') && (
                      <div className="flex items-center justify-end gap-4 mt-3 pt-3 border-t border-border">
                        <span className="text-sm">No. of meals:</span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleAddonQuantity('chef-service', -1); }}
                            className="p-1 border border-border rounded"
                          >
                            <Minus size={14} />
                          </button>
                          <span className="w-8 text-center">{selectedAddons.find(a => a.addon_id === 'chef-service')?.quantity || 1}</span>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleAddonQuantity('chef-service', 1); }}
                            className="p-1 border border-border rounded"
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Available on Request Section */}
                <div className="mt-6 p-4 bg-muted/50 border border-border">
                  <p className="font-medium mb-2">Available on Request</p>
                  <p className="text-sm text-muted-foreground">
                    The following services can be arranged upon request. Please contact us for pricing and availability:
                  </p>
                  <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-accent rounded-full"></span>
                      Spa Session
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-accent rounded-full"></span>
                      BBQ Night
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-accent rounded-full"></span>
                      Decoration Package
                    </li>
                  </ul>
                </div>
              </div>

              {/* Guest Details Form */}
              <div className="space-y-4 mb-6">
                <h4 className="font-medium">Guest Details</h4>
                <Input
                  placeholder="Full Name *"
                  value={guestInfo.name}
                  onChange={(e) => setGuestInfo({ ...guestInfo, name: e.target.value })}
                  className="input-luxury"
                  data-testid="guest-name-input"
                />
                <Input
                  type="email"
                  placeholder="Email Address *"
                  value={guestInfo.email}
                  onChange={(e) => setGuestInfo({ ...guestInfo, email: e.target.value })}
                  className="input-luxury"
                  data-testid="guest-email-input"
                />
                <Input
                  type="tel"
                  placeholder="Phone Number *"
                  value={guestInfo.phone}
                  onChange={(e) => setGuestInfo({ ...guestInfo, phone: e.target.value })}
                  className="input-luxury"
                  data-testid="guest-phone-input"
                />
                <Textarea
                  placeholder="Special Requests (Optional)"
                  value={guestInfo.specialRequests}
                  onChange={(e) => setGuestInfo({ ...guestInfo, specialRequests: e.target.value })}
                  className="input-luxury min-h-[100px]"
                  data-testid="guest-requests-input"
                />
              </div>

              {/* Updated Total */}
              {pricing && (
                <div className="bg-accent/10 p-4 mb-6">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Total Amount</span>
                    <span className="font-heading text-2xl">{formatPrice(pricing.total_amount)}</span>
                  </div>
                </div>
              )}

              <Button
                className="w-full btn-luxury"
                onClick={handleBooking}
                disabled={bookingLoading}
                data-testid="confirm-booking-btn"
              >
                {bookingLoading ? "Processing..." : "Confirm & Pay"}
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Callback Modal */}
      <CallbackModal
        isOpen={callbackOpen}
        onClose={() => setCallbackOpen(false)}
        villaId={villa?.villa_id}
        villaName={villa?.name}
      />
    </div>
  );
};

export default VillaDetailPage;
