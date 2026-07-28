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

const GRID_IMAGES = [
  "/villas/la-sierra-11/Villa facade.jpg",
  "/villas/la-sierra-12/Pool area.jpeg",
  "/villas/dream-villa/Pool side.jpg",
  "/villas/la-selva-6/Villa facade.jpeg",
  "/villas/la-morena-4/Pool view.jpg",
  "/villas/villa-serene/Pool area.jpeg",
  "/villas/clouds-nest/Cottage view.jpg",
  "/villas/eagle-nest/garden view 2.JPG",
];

// The 9 grid positions minus the center, in reading order - GRID_IMAGES[i]
// lands in IMAGE_POSITIONS[i].
const IMAGE_POSITIONS = [0, 1, 2, 3, 5, 6, 7, 8];

const CELL_DURATION = 550; // ms each square takes to reveal
const REVEAL_SPAN = 900; // ms across which the wave sweeps the collage
const HOLD_MS = 600; // pause once fully filled, before dissolving to the site
const SESSION_KEY = "travaholic_splash_seen";

const diagonalOf = (i) => Math.floor(i / COLS) + (i % COLS);
const MAX_DIAGONAL = Math.max(...IMAGE_POSITIONS.map(diagonalOf));
const cellDelay = (gridPosition) => (diagonalOf(gridPosition) / MAX_DIAGONAL) * REVEAL_SPAN;

const TOTAL_BOARD_MS = REVEAL_SPAN + CELL_DURATION;
const MAX_LOAD_WAIT_MS = 4000; // safety cap - never trap a visitor on a black screen

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

  // Preload the (small) set of grid photos before starting the reveal -
  // only 8 images now, so this settles quickly even on a real network.
  useEffect(() => {
    let loadedCount = 0;
    let settled = false;
    const markReady = () => {
      if (settled) return;
      settled = true;
      setImagesReady(true);
    };

    const images = GRID_IMAGES.map((src) => {
      const img = new Image();
      img.onload = img.onerror = () => {
        loadedCount += 1;
        if (loadedCount >= GRID_IMAGES.length) markReady();
      };
      img.src = src;
      return img;
    });

    const safetyTimer = setTimeout(markReady, MAX_LOAD_WAIT_MS);

    return () => {
      clearTimeout(safetyTimer);
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
      {/* 3x3 collage - 8 real photos around the logo, nothing else on screen */}
      <div
        className="grid gap-[3px] w-[92vmin] h-[92vmin] max-w-[680px] max-h-[680px]"
        style={{
          gridTemplateColumns: `repeat(${COLS}, 1fr)`,
          gridTemplateRows: `repeat(${ROWS}, 1fr)`,
        }}
      >
        {Array.from({ length: COLS * ROWS }, (_, position) => {
          if (position === CENTER_INDEX) {
            return (
              <div
                key="center"
                className="flex flex-col items-center justify-center bg-black px-2"
              >
                <img
                  src="/Travaholic_color_logo-removebg-preview.png"
                  alt="Travaholic"
                  className="w-[65%] h-auto object-contain"
                />
              </div>
            );
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
      </div>

      {/* Tagline */}
      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.5 }}
        className="mt-6 text-xs md:text-sm italic uppercase tracking-[0.3em] text-white/70 text-center px-6"
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
