import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";

const Section = ({ title, children }) => (
  <div className="mb-10">
    <h2 className="font-heading text-2xl mb-4">{title}</h2>
    <div className="text-muted-foreground leading-relaxed space-y-4">{children}</div>
  </div>
);

const TermsOfServicePage = () => {
  return (
    <div className="pt-24 min-h-screen bg-background" data-testid="terms-of-service-page">
      <Helmet>
        <title>Terms of Service | Travaholic Stays</title>
        <meta name="description" content="The terms and conditions governing bookings and use of the Travaholic Stays website." />
        <meta name="robots" content="noindex, follow" />
        <link rel="canonical" href="https://travaholicstays.com/terms" />
      </Helmet>

      <section className="container-luxury py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <p className="caption-text mb-4">Legal</p>
          <h1 className="font-heading text-4xl md:text-5xl mb-4">Terms of Service</h1>
          <p className="text-muted-foreground">Last updated: July 2026</p>
        </motion.div>
      </section>

      <section className="container-luxury pb-24 max-w-3xl">
        <Section title="1. Acceptance of Terms">
          <p>
            By accessing or using travaholicstays.com (the "Service"), or by making a
            booking through Travaholic Stays, you agree to be bound by these Terms of
            Service. If you do not agree to these terms, please do not use the Service.
          </p>
        </Section>

        <Section title="2. Bookings and Payments">
          <ul className="list-disc pl-6 space-y-2">
            <li>All bookings made through the Service are subject to availability and confirmation by Travaholic Stays.</li>
            <li>A booking is only confirmed once the required payment (full amount or advance, as communicated at the time of booking) has been received.</li>
            <li>Prices are quoted in Indian Rupees (INR) and are subject to change until a booking is confirmed.</li>
            <li>Payments may be made via our payment partner (Razorpay) or bank transfer, as offered at checkout.</li>
          </ul>
        </Section>

        <Section title="3. Security Deposit">
          <p>
            A refundable security deposit (typically ₹20,000, unless otherwise specified
            for a particular villa) is payable separately from the booking amount. The
            deposit is refunded after check-out, subject to no damage, missing items, or
            violation of house rules during the stay.
          </p>
        </Section>

        <Section title="4. Cancellation and Refund Policy">
          <p>Unless a different policy is stated for a specific villa at the time of booking, the following standard policy applies:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong className="text-foreground">100% refund</strong> if cancellation is made 30 days or more before the check-in date.</li>
            <li><strong className="text-foreground">50% refund</strong> if cancellation is made between 15 and 30 days before the check-in date.</li>
            <li><strong className="text-foreground">No refund</strong> if cancellation is made within 15 days of the check-in date.</li>
          </ul>
          <p>Refunds, where applicable, are processed to the original mode of payment within a reasonable timeframe.</p>
        </Section>

        <Section title="5. Guest Conduct and House Rules">
          <p>
            Guests are expected to comply with the house rules and ID requirements
            provided for each villa. Travaholic Stays and villa owners reserve the right
            to refuse entry, end a stay early, or withhold part or all of the security
            deposit in cases of damage, disturbance, exceeding the agreed number of
            guests, or violation of house rules, without obligation to refund the
            booking amount.
          </p>
        </Section>

        <Section title="6. Villa Listings">
          <p>
            Villa descriptions, photographs, and amenities are provided for guidance and
            are believed to be accurate at the time of listing, but minor variations may
            occur. Property owners submitting a villa via "List Your Villa" confirm they
            have the right to list the property and that the information provided is
            accurate.
          </p>
        </Section>

        <Section title="7. Intellectual Property">
          <p>
            All content on this website, including text, graphics, logos, and images
            (excluding guest-submitted content and property owner photographs), is the
            property of Travaholic Stays and may not be reproduced without permission.
          </p>
        </Section>

        <Section title="8. Limitation of Liability">
          <p>
            Travaholic Stays acts as an intermediary connecting guests with independently
            owned and operated villas. While we carefully vet our property partners, we
            are not liable for any loss, injury, or damage arising from your stay,
            except where required by applicable law. Your use of the Service is at your
            own risk.
          </p>
        </Section>

        <Section title="9. Indemnification">
          <p>
            You agree to indemnify and hold Travaholic Stays harmless from any claims,
            damages, or expenses arising from your violation of these Terms or misuse of
            the Service.
          </p>
        </Section>

        <Section title="10. Governing Law">
          <p>
            These Terms are governed by the laws of India. Any disputes arising from
            these Terms or your use of the Service shall be subject to the exclusive
            jurisdiction of the courts of Goa, India.
          </p>
        </Section>

        <Section title="11. Changes to These Terms">
          <p>
            We may update these Terms from time to time. Continued use of the Service
            after changes are posted constitutes acceptance of the revised Terms.
          </p>
        </Section>

        <Section title="12. Contact Us">
          <p>
            For questions about these Terms, please contact us at{" "}
            <a href="mailto:Travaholicstays@gmail.com" className="text-accent hover:underline">
              Travaholicstays@gmail.com
            </a>{" "}
            or{" "}
            <a href="tel:+919958871283" className="text-accent hover:underline">
              +91 99588 71283
            </a>
            .
          </p>
        </Section>
      </section>
    </div>
  );
};

export default TermsOfServicePage;
