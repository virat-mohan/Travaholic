import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Calendar, Users, MapPin, Clock, CheckCircle, AlertCircle, CreditCard } from "lucide-react";
import { Button } from "../components/ui/button";
import { motion } from "framer-motion";
import axios from "axios";
import { API } from "../App";
import { toast } from "sonner";

const PrivateOfferPage = () => {
  const { offerId } = useParams();
  const [offer, setOffer] = useState(null);
  const [villa, setVilla] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isExpired, setIsExpired] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  useEffect(() => {
    fetchOffer();
  }, [offerId]);

  const fetchOffer = async () => {
    try {
      const response = await axios.get(`${API}/offer/${offerId}`);
      setOffer(response.data.offer);
      setVilla(response.data.villa);
      setIsExpired(response.data.is_expired);
    } catch (error) {
      console.error("Error fetching offer:", error);
      toast.error("Failed to load offer");
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

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric"
    });
  };

  const handlePayment = async () => {
    setProcessing(true);
    try {
      // Create Razorpay order
      const orderResponse = await axios.post(`${API}/payments/create-order`, {
        amount: offer.total_amount,
        offer_id: offerId,
        guest_email: offer.guest_email,
        payment_type: "full"
      });

      const { order_id, key_id, amount } = orderResponse.data;

      if (!key_id) {
        toast.error("Payment gateway not configured. Please contact support.");
        setProcessing(false);
        return;
      }

      // Load Razorpay script if not already loaded
      if (!window.Razorpay) {
        const script = document.createElement("script");
        script.src = "https://checkout.razorpay.com/v1/checkout.js";
        script.async = true;
        document.body.appendChild(script);
        await new Promise(resolve => script.onload = resolve);
      }

      const options = {
        key: key_id,
        amount: amount * 100,
        currency: "INR",
        name: "Travaholic Stays",
        description: `Booking at ${offer.villa_name}`,
        order_id: order_id,
        handler: async function (response) {
          try {
            // Verify payment
            await axios.post(`${API}/payments/verify`, {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              offer_id: offerId,
              payment_type: "full"
            });

            // Accept the offer and create booking
            await axios.post(`${API}/offer/${offerId}/accept`, {
              razorpay_payment_id: response.razorpay_payment_id
            });

            setPaymentSuccess(true);
            toast.success("Payment successful! Your booking is confirmed.");
          } catch (error) {
            toast.error("Payment verification failed. Please contact support.");
          }
        },
        prefill: {
          name: offer.guest_name,
          email: offer.guest_email,
          contact: offer.guest_phone
        },
        theme: {
          color: "#C9A87C"
        },
        modal: {
          ondismiss: function() {
            setProcessing(false);
          }
        }
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (error) {
      console.error("Payment error:", error);
      toast.error(error.response?.data?.detail || "Failed to initiate payment");
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading offer details...</p>
        </div>
      </div>
    );
  }

  if (!offer) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-md mx-auto p-8">
          <AlertCircle className="w-16 h-16 mx-auto text-red-500 mb-4" />
          <h1 className="font-heading text-2xl mb-2">Offer Not Found</h1>
          <p className="text-muted-foreground mb-6">
            This offer link may be invalid or has been removed.
          </p>
          <Link to="/">
            <Button>Return to Home</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (paymentSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-md mx-auto p-8"
        >
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="font-heading text-3xl mb-2">Booking Confirmed!</h1>
          <p className="text-muted-foreground mb-6">
            Thank you for your booking at {offer.villa_name}. 
            A confirmation email has been sent to {offer.guest_email}.
          </p>
          <div className="bg-card border border-border p-6 text-left mb-6">
            <h3 className="font-medium mb-3">Booking Details</h3>
            <div className="space-y-2 text-sm">
              <p><span className="text-muted-foreground">Check-in:</span> {formatDate(offer.check_in)} at 2:00 PM</p>
              <p><span className="text-muted-foreground">Check-out:</span> {formatDate(offer.check_out)} at 11:00 AM</p>
              <p><span className="text-muted-foreground">Guests:</span> {offer.num_guests} pax</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Our team will reach out to you on WhatsApp shortly with more details.
          </p>
          <Link to="/">
            <Button>Return to Home</Button>
          </Link>
        </motion.div>
      </div>
    );
  }

  if (isExpired) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-md mx-auto p-8">
          <Clock className="w-16 h-16 mx-auto text-yellow-500 mb-4" />
          <h1 className="font-heading text-2xl mb-2">Offer Expired</h1>
          <p className="text-muted-foreground mb-6">
            This private offer has expired. Please contact us to request a new quote.
          </p>
          <div className="flex gap-4 justify-center">
            <Link to="/contact">
              <Button>Contact Us</Button>
            </Link>
            <Link to="/">
              <Button variant="outline">Return to Home</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (offer.status !== "pending") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-md mx-auto p-8">
          <CheckCircle className="w-16 h-16 mx-auto text-green-500 mb-4" />
          <h1 className="font-heading text-2xl mb-2">Offer Already {offer.status}</h1>
          <p className="text-muted-foreground mb-6">
            This offer has already been {offer.status}. 
            {offer.status === "accepted" && " Thank you for your booking!"}
          </p>
          <Link to="/">
            <Button>Return to Home</Button>
          </Link>
        </div>
      </div>
    );
  }

  const expiresAt = new Date(offer.expires_at);
  const timeLeft = expiresAt - new Date();
  const hoursLeft = Math.floor(timeLeft / (1000 * 60 * 60));
  const minutesLeft = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));

  return (
    <div className="min-h-screen bg-muted/30 py-12">
      <div className="container-luxury max-w-4xl">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <p className="caption-text mb-2">Private Offer</p>
          <h1 className="font-heading text-3xl md:text-4xl mb-2">{offer.villa_name}</h1>
          {villa?.location && (
            <p className="text-muted-foreground flex items-center justify-center gap-1">
              <MapPin size={16} />
              {villa.location}
            </p>
          )}
        </motion.div>

        {/* Timer Warning */}
        {hoursLeft < 24 && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-yellow-50 border border-yellow-200 p-4 mb-6 flex items-center gap-3"
          >
            <Clock className="w-5 h-5 text-yellow-600 flex-shrink-0" />
            <p className="text-yellow-800 text-sm">
              This offer expires in <strong>{hoursLeft}h {minutesLeft}m</strong>. 
              Complete your payment to secure this booking.
            </p>
          </motion.div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Villa Image & Details */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-2 space-y-6"
          >
            {villa?.images?.[0] && (
              <div className="aspect-[16/9] overflow-hidden">
                <img 
                  src={villa.images[0]} 
                  alt={offer.villa_name}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* Booking Details Card */}
            <div className="bg-card border border-border p-6">
              <h2 className="font-heading text-xl mb-4">Booking Details</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-accent mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Check-in</p>
                    <p className="font-medium">{formatDate(offer.check_in)}</p>
                    <p className="text-xs text-muted-foreground">2:00 PM</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-accent mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Check-out</p>
                    <p className="font-medium">{formatDate(offer.check_out)}</p>
                    <p className="text-xs text-muted-foreground">11:00 AM</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Users className="w-5 h-5 text-accent mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Guests</p>
                    <p className="font-medium">{offer.num_guests} pax</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-accent mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Duration</p>
                    <p className="font-medium">{offer.num_nights} nights</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Guest Info */}
            <div className="bg-card border border-border p-6">
              <h2 className="font-heading text-xl mb-4">Guest Information</h2>
              <div className="space-y-2 text-sm">
                <p><span className="text-muted-foreground">Name:</span> {offer.guest_name}</p>
                <p><span className="text-muted-foreground">Email:</span> {offer.guest_email}</p>
                <p><span className="text-muted-foreground">Phone:</span> {offer.guest_phone}</p>
              </div>
            </div>
          </motion.div>

          {/* Price Breakdown & Pay */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-6"
          >
            <div className="bg-card border border-border p-6 sticky top-6">
              <h2 className="font-heading text-xl mb-4">Price Breakdown</h2>
              
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Base ({offer.num_nights} nights)</span>
                  <span>{formatPrice(offer.base_amount)}</span>
                </div>
                
                {offer.addons_total > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Add-ons</span>
                    <span>{formatPrice(offer.addons_total)}</span>
                  </div>
                )}
                
                {offer.discount_amount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount ({offer.discount_percent}%)</span>
                    <span>-{formatPrice(offer.discount_amount)}</span>
                  </div>
                )}
                
                <div className="flex justify-between pt-2 border-t">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatPrice(offer.subtotal)}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-muted-foreground">GST (18%)</span>
                  <span>{formatPrice(offer.gst_amount)}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Security Deposit</span>
                  <span>{formatPrice(offer.security_deposit)}</span>
                </div>
                
                <div className="flex justify-between pt-3 border-t font-heading text-lg">
                  <span>Total</span>
                  <span>{formatPrice(offer.total_amount)}</span>
                </div>
              </div>

              <p className="text-xs text-muted-foreground mt-4 mb-6">
                Security deposit of {formatPrice(offer.security_deposit)} is refundable after checkout.
              </p>

              <Button 
                className="w-full gap-2" 
                size="lg"
                onClick={handlePayment}
                disabled={processing}
              >
                {processing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CreditCard size={18} />
                    Pay {formatPrice(offer.total_amount)}
                  </>
                )}
              </Button>

              <p className="text-xs text-center text-muted-foreground mt-4">
                Secure payment powered by Razorpay
              </p>
            </div>

            {/* Offer Validity */}
            <div className="bg-accent/10 border border-accent/30 p-4 text-sm">
              <p className="font-medium mb-1">Offer Valid Until</p>
              <p className="text-muted-foreground">
                {expiresAt.toLocaleDateString("en-IN", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                  hour: "numeric",
                  minute: "numeric"
                })}
              </p>
            </div>
          </motion.div>
        </div>

        {/* Contact */}
        <div className="text-center mt-12 pt-8 border-t">
          <p className="text-muted-foreground mb-2">Questions about this offer?</p>
          <p className="text-sm">
            Contact us at{" "}
            <a href="tel:+919958871283" className="text-accent hover:underline">+91 99588 71283</a>
            {" "}or{" "}
            <a href="https://wa.me/919958871283" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
              WhatsApp
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default PrivateOfferPage;
