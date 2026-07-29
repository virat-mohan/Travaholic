import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";

const Section = ({ title, children }) => (
  <div className="mb-10">
    <h2 className="font-heading text-2xl mb-4">{title}</h2>
    <div className="text-muted-foreground leading-relaxed space-y-4">{children}</div>
  </div>
);

const PrivacyPolicyPage = () => {
  return (
    <div className="pt-24 min-h-screen bg-background" data-testid="privacy-policy-page">
      <Helmet>
        <title>Privacy Policy | Travaholic Stays</title>
        <meta name="description" content="How Travaholic Stays collects, uses, and protects your personal information." />
        <meta name="robots" content="noindex, follow" />
        <link rel="canonical" href="https://travaholicstays.com/privacy" />
      </Helmet>

      <section className="container-luxury py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <p className="caption-text mb-4">Legal</p>
          <h1 className="font-heading text-4xl md:text-5xl mb-4">Privacy Policy</h1>
          <p className="text-muted-foreground">Last updated: July 2026</p>
        </motion.div>
      </section>

      <section className="container-luxury pb-24 max-w-3xl">
        <Section title="1. Introduction">
          <p>
            Travaholic Stays ("Travaholic Stays," "we," "us," or "our") operates the
            travaholicstays.com website and related booking services (the "Service").
            This Privacy Policy explains what personal information we collect, how we
            use it, and the choices you have. By using the Service, you agree to the
            collection and use of information in accordance with this policy.
          </p>
        </Section>

        <Section title="2. Information We Collect">
          <p>We collect information you provide directly to us, including:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Name, phone number, and email address when you submit an enquiry, request a callback, or make a booking.</li>
            <li>Booking details such as check-in/check-out dates, number of guests, and villa preferences.</li>
            <li>Payment-related information processed through our payment partner (Razorpay) or shared for bank transfer confirmation - we do not store your full card or bank account details ourselves.</li>
            <li>Information you submit through the "List Your Villa" form if you are a property owner, including property details and photographs.</li>
          </ul>
          <p>
            We also automatically collect certain information when you visit our site, such as
            IP address, browser type, pages viewed, and time spent on pages, via cookies and
            analytics tools (see Section 5).
          </p>
        </Section>

        <Section title="3. How We Use Your Information">
          <ul className="list-disc pl-6 space-y-2">
            <li>To process and confirm your villa bookings, including sharing necessary details with the villa owner or property manager.</li>
            <li>To communicate with you about your enquiry or booking via email, WhatsApp, or phone.</li>
            <li>To send booking confirmations, payment receipts, and related documents.</li>
            <li>To improve our website, services, and guest experience.</li>
            <li>To comply with legal obligations and resolve disputes.</li>
          </ul>
        </Section>

        <Section title="4. Sharing of Information">
          <p>We do not sell your personal information. We may share it with:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Villa owners and property managers, solely to fulfil your booking.</li>
            <li>Payment processors (such as Razorpay) to process transactions securely.</li>
            <li>Service providers who help us operate the website, send emails, or provide customer support, under confidentiality obligations.</li>
            <li>Government authorities, where required by law.</li>
          </ul>
        </Section>

        <Section title="5. Cookies and Tracking">
          <p>
            We use cookies and similar technologies, including analytics tools such as
            PostHog, to understand how visitors use our site and to improve it over time.
            You can control cookies through your browser settings, though disabling them
            may affect some site functionality.
          </p>
        </Section>

        <Section title="6. Data Security">
          <p>
            We take reasonable technical and organizational measures to protect your
            personal information from unauthorized access, alteration, disclosure, or
            destruction. However, no method of transmission over the internet is 100%
            secure, and we cannot guarantee absolute security.
          </p>
        </Section>

        <Section title="7. Data Retention">
          <p>
            We retain your personal information for as long as necessary to fulfil the
            purposes described in this policy, including to maintain booking records,
            comply with legal obligations, and resolve disputes.
          </p>
        </Section>

        <Section title="8. Your Rights">
          <p>
            You may request access to, correction of, or deletion of your personal
            information at any time by contacting us using the details below. We will
            respond to reasonable requests within a reasonable timeframe.
          </p>
        </Section>

        <Section title="9. Third-Party Links">
          <p>
            Our website may contain links to third-party sites (such as Instagram or
            Google Maps). We are not responsible for the privacy practices of those
            third-party sites and encourage you to review their policies.
          </p>
        </Section>

        <Section title="10. Children's Privacy">
          <p>
            Our Service is not directed at children under 18. We do not knowingly
            collect personal information from children.
          </p>
        </Section>

        <Section title="11. Changes to This Policy">
          <p>
            We may update this Privacy Policy from time to time. Changes will be posted
            on this page with an updated "Last updated" date.
          </p>
        </Section>

        <Section title="12. Contact Us">
          <p>
            If you have questions about this Privacy Policy, please contact us at{" "}
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

export default PrivacyPolicyPage;
