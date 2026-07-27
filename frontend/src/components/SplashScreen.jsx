import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";

// A cinematic once-per-session intro: a chessboard of real property photos
// fills in square by square in a diagonal wave, holds as a finished mosaic
// with the wordmark breathing in over it, then dissolves into the homepage.
const COLS = 5;
const ROWS = 4;

const GRID_IMAGES = [
  "/villas/la-sierra-11/Villa facade.jpg",
  "/villas/la-sierra-12/Pool area.jpeg",
  "/villas/dream-villa/Villa facade.jpg",
  "/villas/dream-villa/Pool side.jpg",
  "/villas/la-selva-6/Villa facade.jpeg",
  "/villas/la-selva-6/Pool side.jpeg",
  "/villas/la-morena-4/Villa facade.jpg",
  "/villas/la-morena-4/Pool view.jpg",
  "/villas/villa-serene/Villa facade.jpeg",
  "/villas/villa-serene/Pool area.jpeg",
  "/villas/la-sierra-15/Pool Area.jpg",
  "/villas/la-sierra-14/Pool side.jpg",
  "/villas/la-maroma-2/Exterior Look.jpg",
  "/villas/la-maroma-2/swimming pool.jpg",
  "/villas/clouds-nest/Cottage view.jpg",
  "/villas/eagle-nest/garden view 2.JPG",
  "/villas/la-selva-3/External Look.jpg",
  "/villas/la-selva-3/Swimming Pool 1.B.jpg",
  "/villas/la-sierra-12/Living Room - Aerial View.jpeg",
  "/villas/breezedale-mashobra/Living Room 1 (1).jpg",
];

const CELL_COUNT = COLS * ROWS;
const CELL_DURATION = 650; // ms each square takes to reveal
const REVEAL_SPAN = 1500; // ms across which the wave sweeps the whole board
const HOLD_MS = 700; // pause once fully filled, before dissolving to the site
const SESSION_KEY = "travaholic_splash_seen";

// Diagonal fill order (top-left to bottom-right wave), with a slight
// column-based offset so each diagonal doesn't pop in as one flat beat.
const REVEAL_DELAYS = Array.from({ length: CELL_COUNT }, (_, i) => {
  const row = Math.floor(i / COLS);
  const col = i % COLS;
  return row + col;
});
const MAX_DIAGONAL = Math.max(...REVEAL_DELAYS);
const cellDelay = (i) => (REVEAL_DELAYS[i] / MAX_DIAGONAL) * REVEAL_SPAN;

const TOTAL_BOARD_MS = REVEAL_SPAN + CELL_DURATION;

const SplashScreen = ({ onComplete }) => {
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

  useEffect(() => {
    const raf = requestAnimationFrame(() => setFilled(true));
    const finishTimer = setTimeout(finish, TOTAL_BOARD_MS + HOLD_MS);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(finishTimer);
    };
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
      {/* Chessboard grid - every square holds a different real property photo */}
      <div
        className="absolute inset-0 grid gap-[2px] bg-black"
        style={{
          gridTemplateColumns: `repeat(${COLS}, 1fr)`,
          gridTemplateRows: `repeat(${ROWS}, 1fr)`,
        }}
      >
        {GRID_IMAGES.map((src, i) => (
          <div key={src} className="relative overflow-hidden bg-neutral-900">
            <img
              src={src}
              alt=""
              className="absolute inset-0 w-full h-full object-cover ease-out"
              style={{
                transitionProperty: "opacity, transform",
                transitionDuration: `${CELL_DURATION}ms`,
                transitionDelay: `${cellDelay(i)}ms`,
                opacity: filled ? 1 : 0,
                transform: filled ? "scale(1)" : "scale(1.2)",
              }}
            />
          </div>
        ))}
      </div>

      {/* Scrim for wordmark legibility, fades in once the board is nearly full */}
      <div
        className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/25 to-black/60 ease-out"
        style={{
          transitionProperty: "opacity",
          transitionDuration: "600ms",
          transitionDelay: `${REVEAL_SPAN * 0.55}ms`,
          opacity: filled ? 1 : 0,
        }}
      />

      {/* Wordmark + tagline */}
      <div className="relative z-10 h-full flex flex-col items-center justify-center text-center px-6">
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: "easeOut", delay: (REVEAL_SPAN * 0.7) / 1000 }}
          className="font-heading text-3xl md:text-5xl text-white uppercase tracking-[0.35em]"
        >
          Travaholic
        </motion.p>
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: (REVEAL_SPAN * 0.85) / 1000 }}
          className="mt-4 text-xs md:text-sm uppercase tracking-[0.3em] text-white/70"
        >
          Ultra-Luxury Villas in Goa &amp; Beyond
        </motion.p>
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
