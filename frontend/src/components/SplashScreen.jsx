import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";

// A cinematic once-per-session intro: a small 3x3 collage centered on
// screen, with the colorful round logo + wordmark sitting in the middle
// cell and 8 real property photos revealing around it in a diagonal wave.
// Nothing fills the rest of the screen - just black - so this stays quick
// to load and doesn't compete with the branding for attention.
const COLS = 3;
const ROWS = 3;
const CENTER_INDEX = 4;

// Small, pre-compressed copies (~70-90KB each vs. multi-MB camera
// originals) - the splash preloads all 8 upfront and won't proceed until
// they're done, so keeping these light is what makes it feel fast.
// Source images + regeneration: see frontend/public/splash-thumbs.
const GRID_IMAGES = [
  "/splash-thumbs/la-sierra-11.jpg",
  "/splash-thumbs/la-sierra-12.jpg",
  "/splash-thumbs/dream-villa.jpg",
  "/splash-thumbs/la-selva-6.jpg",
  "/splash-thumbs/la-morena-4.jpg",
  "/splash-thumbs/villa-serene.jpg",
  "/splash-thumbs/clouds-nest.jpg",
  "/splash-thumbs/eagle-nest.jpg",
];

// The 9 grid positions minus the center, in reading order - GRID_IMAGES[i]
// lands in IMAGE_POSITIONS[i].
const IMAGE_POSITIONS = [0, 1, 2, 3, 5, 6, 7, 8];

const CELL_DURATION = 550; // ms each square takes to reveal
const REVEAL_SPAN = 900; // ms across which the wave sweeps the collage
const HOLD_MS = 5000; // pause once fully filled, before dissolving to the site
const SESSION_KEY = "travaholic_splash_seen";

const diagonalOf = (i) => Math.floor(i / COLS) + (i % COLS);
const MAX_DIAGONAL = Math.max(...IMAGE_POSITIONS.map(diagonalOf));
const cellDelay = (gridPosition) => (diagonalOf(gridPosition) / MAX_DIAGONAL) * REVEAL_SPAN;

const TOTAL_BOARD_MS = REVEAL_SPAN + CELL_DURATION;

const SplashScreen = ({ onComplete }) => {
  const [imagesReady, setImagesReady] = useState(false);
  const [filled, setFilled] = useState(false);
  const [visible, setVisible] = useState(true);
  const finishedRef = useRef(false);

  const finish = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    sessionStorage.setItem(SESSION_KEY, "1");
    setVisible(false);
    setTimeout(onComplete, 700);
  };

  // Preload every grid photo before starting the reveal, and never move on
  // to the site until all of them have actually settled (loaded or
  // errored) - no arbitrary timeout that could let the site through with
  // photos still missing.
  useEffect(() => {
    let loadedCount = 0;

    const images = GRID_IMAGES.map((src) => {
      const img = new Image();
      img.onload = img.onerror = () => {
        loadedCount += 1;
        if (loadedCount >= GRID_IMAGES.length) setImagesReady(true);
      };
      img.src = src;
      return img;
    });

    return () => {
      images.forEach((img) => {
        img.onload = null;
        img.onerror = null;
      });
    };
  }, []);

  useEffect(() => {
    if (!imagesReady) return;
    const raf = requestAnimationFrame(() => setFilled(true));
    const finishTimer = setTimeout(finish, TOTAL_BOARD_MS + HOLD_MS);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(finishTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imagesReady]);

  return (
    <motion.div
      className="fixed inset-0 z-[200] bg-black cursor-pointer overflow-hidden flex flex-col items-center justify-center"
      animate={{ opacity: visible ? 1 : 0, scale: visible ? 1 : 1.03 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      onClick={finish}
      data-testid="splash-screen"
      style={{ pointerEvents: visible ? "auto" : "none" }}
    >
      {/* 3x3 collage - 8 real photos around the logo, nothing else on screen.
          The logo is deliberately sized larger than a single grid cell and
          overlaid on top (not placed inside the center cell) so the
          "TRAVAHOLIC" wordmark inside it stays legible on small screens
          instead of shrinking down to the size of one collage tile. */}
      <div
        className="relative grid gap-[3px] w-[95vmin] h-[95vmin] max-w-[760px] max-h-[760px]"
        style={{
          gridTemplateColumns: `repeat(${COLS}, 1fr)`,
          gridTemplateRows: `repeat(${ROWS}, 1fr)`,
        }}
      >
        {Array.from({ length: COLS * ROWS }, (_, position) => {
          if (position === CENTER_INDEX) {
            return <div key="center" className="bg-black" />;
          }

          const imgIndex = IMAGE_POSITIONS.indexOf(position);
          const src = GRID_IMAGES[imgIndex];
          return (
            <div key={src} className="relative overflow-hidden bg-neutral-900">
              <img
                src={src}
                alt=""
                className="absolute inset-0 w-full h-full object-cover ease-out"
                style={{
                  transitionProperty: "opacity, transform",
                  transitionDuration: `${CELL_DURATION}ms`,
                  transitionDelay: `${cellDelay(position)}ms`,
                  opacity: filled ? 1 : 0,
                  transform: filled ? "scale(1)" : "scale(1.2)",
                }}
              />
            </div>
          );
        })}

        {/* Logo, overlaid larger than a single collage tile so the wordmark
            reads clearly on mobile */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <img
            src="/Travaholic_color_logo_splash.png"
            alt="Travaholic"
            className="w-[52%] max-w-[300px] h-auto object-contain bg-transparent drop-shadow-[0_0_24px_rgba(0,0,0,0.6)]"
          />
        </div>
      </div>

      {/* Tagline */}
      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.5 }}
        className="mt-6 font-accent text-sm md:text-base uppercase tracking-[0.3em] text-white/70 text-center px-6"
      >
        Ultra-Luxury Villas in Goa &amp; Beyond
      </motion.p>

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
