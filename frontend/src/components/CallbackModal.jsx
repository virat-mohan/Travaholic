import { useState } from "react";
import { X, Phone, Clock, Home } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { toast } from "sonner";
import axios from "axios";
import { API } from "../App";
import { motion, AnimatePresence } from "framer-motion";

const CallbackModal = ({ isOpen, onClose, villaId = null, villaName = null }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    preferredTime: "",
    message: "",
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await axios.post(`${API}/leads`, {
        name: formData.name,
        phone: formData.phone,
        preferred_time: formData.preferredTime,
        message: formData.message,
        villa_id: villaId,
        lead_type: "guest",
      });

      toast.success("Request submitted successfully! We'll call you back soon.");
      setFormData({ name: "", phone: "", preferredTime: "", message: "" });
      onClose();
    } catch (error) {
      console.error("Error submitting lead:", error);
      toast.error("Failed to submit request. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          data-testid="callback-modal"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-foreground/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="relative bg-card w-full max-w-md p-8 shadow-2xl"
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 text-muted-foreground hover:text-foreground transition-colors"
              data-testid="close-callback-modal"
            >
              <X size={20} />
            </button>

            <div className="mb-6">
              <h3 className="font-heading text-2xl mb-2">Request a Callback</h3>
              <p className="text-muted-foreground">
                {villaName
                  ? `Interested in ${villaName}? We'll call you back.`
                  : "We'll call you back at your preferred time."}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <Input
                  placeholder="Your Name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                  className="input-luxury"
                  data-testid="callback-name-input"
                />
              </div>

              <div>
                <Input
                  type="tel"
                  placeholder="Phone Number"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  required
                  className="input-luxury"
                  data-testid="callback-phone-input"
                />
              </div>

              <div>
                <Select
                  value={formData.preferredTime}
                  onValueChange={(value) =>
                    setFormData({ ...formData, preferredTime: value })
                  }
                >
                  <SelectTrigger className="input-luxury" data-testid="callback-time-select">
                    <SelectValue placeholder="Preferred time to call" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="morning">Morning (9 AM - 12 PM)</SelectItem>
                    <SelectItem value="afternoon">Afternoon (12 PM - 5 PM)</SelectItem>
                    <SelectItem value="evening">Evening (5 PM - 8 PM)</SelectItem>
                    <SelectItem value="anytime">Anytime</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Textarea
                  placeholder="Any specific requirements? (Optional)"
                  value={formData.message}
                  onChange={(e) =>
                    setFormData({ ...formData, message: e.target.value })
                  }
                  className="input-luxury min-h-[100px]"
                  data-testid="callback-message-input"
                />
              </div>

              <Button
                type="submit"
                className="w-full btn-luxury"
                disabled={loading}
                data-testid="submit-callback-btn"
              >
                {loading ? "Submitting..." : "Request Callback"}
              </Button>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CallbackModal;
