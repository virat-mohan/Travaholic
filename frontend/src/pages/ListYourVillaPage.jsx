import { useState } from "react";
import { Check, ArrowRight } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Checkbox } from "../components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { toast } from "sonner";
import axios from "axios";
import { API } from "../App";
import { motion } from "framer-motion";

const ListYourVillaPage = () => {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    ownerName: "",
    ownerEmail: "",
    ownerPhone: "",
    villaName: "",
    villaLocation: "",
    bedrooms: "",
    bathrooms: "",
    hasPool: false,
    amenities: [],
    description: "",
  });

  const amenitiesList = [
    "WiFi",
    "Air Conditioning",
    "Kitchen",
    "Parking",
    "BBQ",
    "Garden",
    "Housekeeping",
    "Caretaker",
    "TV",
    "Bonfire",
    "Breakfast",
    "Gym",
  ];

  const handleAmenityToggle = (amenity) => {
    if (formData.amenities.includes(amenity)) {
      setFormData({
        ...formData,
        amenities: formData.amenities.filter((a) => a !== amenity),
      });
    } else {
      setFormData({
        ...formData,
        amenities: [...formData.amenities, amenity],
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await axios.post(`${API}/list-villa`, {
        owner_name: formData.ownerName,
        owner_email: formData.ownerEmail,
        owner_phone: formData.ownerPhone,
        villa_name: formData.villaName,
        villa_location: formData.villaLocation,
        bedrooms: parseInt(formData.bedrooms),
        bathrooms: parseInt(formData.bathrooms),
        has_pool: formData.hasPool,
        amenities: formData.amenities,
        description: formData.description,
      });
      toast.success("Application submitted! Our team will contact you soon.");
      setStep(3);
    } catch (error) {
      toast.error("Failed to submit. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const benefits = [
    "Professional photography & marketing",
    "Complete guest management",
    "Dynamic pricing optimization",
    "24/7 guest support",
    "Transparent commission structure",
    "Dedicated property manager",
    "Regular maintenance coordination",
    "Monthly financial reports",
  ];

  return (
    <div className="pt-24 min-h-screen bg-background" data-testid="list-villa-page">
      {/* Hero */}
      <section className="relative h-[50vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="https://customer-assets.emergentagent.com/job_46fdf40d-d471-4ebc-8342-5064df045175/artifacts/sbw61yzf_List%20your%20villa.png"
            alt="List Your Villa"
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
            For Property Owners
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="font-heading text-5xl md:text-7xl"
          >
            List Your Villa
          </motion.h1>
        </div>
      </section>

      <section className="section-spacing">
        <div className="container-luxury">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
            {/* Benefits */}
            <div>
              <p className="caption-text mb-4">Why Partner With Us</p>
              <h2 className="font-heading text-4xl mb-8">
                Maximize Your
                <br />
                <span className="italic">Property's Potential</span>
              </h2>
              <p className="text-muted-foreground text-lg mb-8">
                Join our exclusive collection of luxury villas and let us handle
                everything from marketing to guest management. Focus on your
                property while we maximize your returns.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {benefits.map((benefit, index) => (
                  <motion.div
                    key={benefit}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    viewport={{ once: true }}
                    className="flex items-center gap-3"
                  >
                    <Check size={16} className="text-accent flex-shrink-0" />
                    <span className="text-sm">{benefit}</span>
                  </motion.div>
                ))}
              </div>

              <div className="mt-12 p-6 bg-accent text-accent-foreground">
                <p className="text-3xl font-heading mb-2">30%</p>
                <p className="text-sm uppercase tracking-wider opacity-80">
                  Average Commission Rate
                </p>
                <p className="mt-4 text-sm opacity-80">
                  Competitive commission with no hidden fees. You receive 70% of
                  all booking revenue.
                </p>
              </div>
            </div>

            {/* Form */}
            <div className="bg-card border border-border p-8 lg:p-12">
              {step === 3 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-accent/20 text-accent rounded-full flex items-center justify-center mx-auto mb-6">
                    <Check size={32} />
                  </div>
                  <h3 className="font-heading text-2xl mb-4">
                    Application Submitted!
                  </h3>
                  <p className="text-muted-foreground mb-8">
                    Thank you for your interest. Our team will review your
                    application and contact you within 48 hours.
                  </p>
                  <Button
                    onClick={() => {
                      setStep(1);
                      setFormData({
                        ownerName: "",
                        ownerEmail: "",
                        ownerPhone: "",
                        villaName: "",
                        villaLocation: "",
                        bedrooms: "",
                        bathrooms: "",
                        hasPool: false,
                        amenities: [],
                        description: "",
                      });
                    }}
                    variant="outline"
                    className="btn-luxury-outline"
                  >
                    Submit Another Property
                  </Button>
                </div>
              ) : (
                <>
                  {/* Progress */}
                  <div className="flex items-center gap-4 mb-8">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                        step >= 1 ? "bg-accent text-accent-foreground" : "bg-muted"
                      }`}
                    >
                      1
                    </div>
                    <div
                      className={`flex-1 h-1 ${step >= 2 ? "bg-accent" : "bg-muted"}`}
                    />
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                        step >= 2 ? "bg-accent text-accent-foreground" : "bg-muted"
                      }`}
                    >
                      2
                    </div>
                  </div>

                  <form onSubmit={handleSubmit}>
                    {step === 1 && (
                      <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="space-y-6"
                      >
                        <h3 className="font-heading text-2xl mb-2">
                          Owner Information
                        </h3>
                        <p className="text-muted-foreground mb-6">
                          Tell us about yourself
                        </p>

                        <Input
                          placeholder="Full Name *"
                          value={formData.ownerName}
                          onChange={(e) =>
                            setFormData({ ...formData, ownerName: e.target.value })
                          }
                          required
                          className="input-luxury"
                          data-testid="owner-name-input"
                        />

                        <Input
                          type="email"
                          placeholder="Email Address *"
                          value={formData.ownerEmail}
                          onChange={(e) =>
                            setFormData({ ...formData, ownerEmail: e.target.value })
                          }
                          required
                          className="input-luxury"
                          data-testid="owner-email-input"
                        />

                        <Input
                          type="tel"
                          placeholder="Phone Number *"
                          value={formData.ownerPhone}
                          onChange={(e) =>
                            setFormData({ ...formData, ownerPhone: e.target.value })
                          }
                          required
                          className="input-luxury"
                          data-testid="owner-phone-input"
                        />

                        <Button
                          type="button"
                          className="w-full btn-luxury"
                          onClick={() => {
                            if (
                              formData.ownerName &&
                              formData.ownerEmail &&
                              formData.ownerPhone
                            ) {
                              setStep(2);
                            } else {
                              toast.error("Please fill all required fields");
                            }
                          }}
                          data-testid="next-step-btn"
                        >
                          Next Step
                          <ArrowRight size={16} className="ml-2" />
                        </Button>
                      </motion.div>
                    )}

                    {step === 2 && (
                      <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="space-y-6"
                      >
                        <h3 className="font-heading text-2xl mb-2">
                          Property Details
                        </h3>
                        <p className="text-muted-foreground mb-6">
                          Tell us about your villa
                        </p>

                        <Input
                          placeholder="Villa Name *"
                          value={formData.villaName}
                          onChange={(e) =>
                            setFormData({ ...formData, villaName: e.target.value })
                          }
                          required
                          className="input-luxury"
                          data-testid="villa-name-input"
                        />

                        <Select
                          value={formData.villaLocation}
                          onValueChange={(value) =>
                            setFormData({ ...formData, villaLocation: value })
                          }
                        >
                          <SelectTrigger className="input-luxury" data-testid="villa-location-select">
                            <SelectValue placeholder="Location *" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Anjuna, Goa">Anjuna, Goa</SelectItem>
                            <SelectItem value="Vagator, Goa">Vagator, Goa</SelectItem>
                            <SelectItem value="Morjim, Goa">Morjim, Goa</SelectItem>
                            <SelectItem value="Mussoorie">Mussoorie</SelectItem>
                            <SelectItem value="Himachal Pradesh">
                              Himachal Pradesh
                            </SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                        </Select>

                        <div className="grid grid-cols-2 gap-4">
                          <Select
                            value={formData.bedrooms}
                            onValueChange={(value) =>
                              setFormData({ ...formData, bedrooms: value })
                            }
                          >
                            <SelectTrigger className="input-luxury" data-testid="bedrooms-select">
                              <SelectValue placeholder="Bedrooms *" />
                            </SelectTrigger>
                            <SelectContent>
                              {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => (
                                <SelectItem key={num} value={num.toString()}>
                                  {num} Bedroom{num > 1 ? "s" : ""}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          <Select
                            value={formData.bathrooms}
                            onValueChange={(value) =>
                              setFormData({ ...formData, bathrooms: value })
                            }
                          >
                            <SelectTrigger className="input-luxury" data-testid="bathrooms-select">
                              <SelectValue placeholder="Bathrooms *" />
                            </SelectTrigger>
                            <SelectContent>
                              {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => (
                                <SelectItem key={num} value={num.toString()}>
                                  {num} Bathroom{num > 1 ? "s" : ""}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="flex items-center gap-3">
                          <Checkbox
                            id="hasPool"
                            checked={formData.hasPool}
                            onCheckedChange={(checked) =>
                              setFormData({ ...formData, hasPool: checked })
                            }
                            data-testid="has-pool-checkbox"
                          />
                          <label htmlFor="hasPool">Property has a private pool</label>
                        </div>

                        <div>
                          <p className="text-sm text-muted-foreground mb-3">
                            Select Amenities
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {amenitiesList.map((amenity) => (
                              <button
                                key={amenity}
                                type="button"
                                onClick={() => handleAmenityToggle(amenity)}
                                className={`px-3 py-1 text-sm border transition-colors ${
                                  formData.amenities.includes(amenity)
                                    ? "bg-accent text-accent-foreground border-accent"
                                    : "border-border hover:border-accent"
                                }`}
                              >
                                {amenity}
                              </button>
                            ))}
                          </div>
                        </div>

                        <Textarea
                          placeholder="Tell us more about your property (optional)"
                          value={formData.description}
                          onChange={(e) =>
                            setFormData({ ...formData, description: e.target.value })
                          }
                          className="input-luxury min-h-[100px]"
                          data-testid="villa-description-input"
                        />

                        <div className="flex gap-4">
                          <Button
                            type="button"
                            variant="outline"
                            className="flex-1"
                            onClick={() => setStep(1)}
                          >
                            Back
                          </Button>
                          <Button
                            type="submit"
                            className="flex-1 btn-luxury"
                            disabled={loading}
                            data-testid="submit-listing-btn"
                          >
                            {loading ? "Submitting..." : "Submit Application"}
                          </Button>
                        </div>
                      </motion.div>
                    )}
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default ListYourVillaPage;
