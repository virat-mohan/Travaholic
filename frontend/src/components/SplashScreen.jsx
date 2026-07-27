import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";

// A cinematic once-per-session intro: five real property photos crossfade
// in sequence like a title sequence, with the wordmark and tagline
// breathing in over them, before dissolving into the homepage.
const SPLASH_IMAGES = [
  "/villas/la-selva-6/Villa%20facade.jpeg",
  "/villas/dream-villa/Pool%20side.jpg",
  "/villas/clouds-nest/Cottage%20view.jpg",
  "/villas/villa-serene/Pool%20area.jpeg",
  "/villas/la-morena-4/Pool%20view.jpg",
];

const IMAGE_DURATION = 900; // ms each image is held
const SESSION_KEY = "travaholic_splash_seen";

const SplashScreen = ({ onComplete }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const finishedRef = useRef(false);

  const finish = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    sessionStorage.setItem(SESSION_KEY, "1");
    setVisible(false);
    setTimeout(onComplete, 700);
  };

  useEffect(() => {
    const advance = setInterval(() => {
      setActiveIndex((prev) => {
        if (prev >= SPLASH_IMAGES.length - 1) {
          clearInterval(advance);
          setTimeout(finish, IMAGE_DURATION);
          return prev;
        }
        return prev + 1;
      });
    }, IMAGE_DURATION);
    return () => clearInterval(advance);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <motion.div
      className="fixed inset-0 z-[200] bg-black cursor-pointer overflow-hidden"
      animate={{ opacity: visible ? 1 : 0, scale: visible ? 1 : 1.03 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      onClick={finish}
      data-testid="splash-screen"
      style={{ pointerEvents: visible ? "auto" : "none" }}
    >
      {/* Image stack - all mounted, only opacity/scale animate per slide */}
      {SPLASH_IMAGES.map((src, i) => (
        <div
          key={src}
          className="absolute inset-0 transition-opacity duration-[900ms] ease-in-out"
          style={{ opacity: i === activeIndex ? 1 : 0 }}
        >
          <img
            src={src}
            alt=""
            className="w-full h-full object-cover transition-transform duration-[3500ms] ease-linear"
            style={{ transform: i === activeIndex ? "scale(1.08)" : "scale(1)" }}
          />
        </div>
      ))}

      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-black/60" />

      {/* Wordmark + tagline */}
      <div className="relative z-10 h-full flex flex-col items-center justify-center text-center px-6">
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="font-heading text-3xl md:text-5xl text-white uppercase tracking-[0.35em]"
        >
          Travaholic
        </motion.p>
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.2 }}
          className="mt-4 text-xs md:text-sm uppercase tracking-[0.3em] text-white/70"
        >
          Ultra-Luxury Villas in Goa &amp; Beyond
        </motion.p>
      </div>

      {/* Progress segments */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex gap-2">
        {SPLASH_IMAGES.map((_, i) => (
          <div key={i} className="w-10 h-[2px] bg-white/25 overflow-hidden rounded-full">
            <div
              className="h-full bg-white origin-left transition-transform ease-linear"
              style={{
                transform: `scaleX(${i < activeIndex ? 1 : i === activeIndex ? 1 : 0})`,
                transitionDuration: i === activeIndex ? `${IMAGE_DURATION}ms` : "0ms",
              }}
            />
          </div>
        ))}
      </div>

      {/* Skip hint */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.6 }}
        transition={{ duration: 0.6, delay: 1 }}
        className="absolute bottom-8 right-6 md:right-10 z-10 text-[10px] uppercase tracking-[0.2em] text-white"
      >
        Skip
      </motion.p>
    </motion.div>
  );
};

export const shouldShowSplash = () => {
  if (typeof window === "undefined") return false;
  return !sessionStorage.getItem(SESSION_KEY);
};

export default SplashScreen;
