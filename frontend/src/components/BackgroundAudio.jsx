import { useState, useRef, useEffect } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { motion } from "framer-motion";

const BackgroundAudio = () => {
  // On by default, kept at a very low ambient volume so it's felt rather
  // than noticed. Browsers block truly automatic audible playback without
  // a user gesture, so this also attempts to start on the visitor's very
  // first click/tap anywhere on the page if the initial autoplay attempt
  // was blocked - same as before, but now quiet enough that the surprise
  // that used to read as "too loud" shouldn't register at all.
  const [isMuted, setIsMuted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef(null);
  const startedRef = useRef(false);

  const audioUrl = "/travaholic-background.mp3";
  const VOLUME = 0.06;

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = VOLUME;
    }

    const tryStart = () => {
      if (startedRef.current || !audioRef.current) return;
      audioRef.current.volume = VOLUME;
      audioRef.current.muted = false;
      audioRef.current
        .play()
        .then(() => {
          startedRef.current = true;
          setIsPlaying(true);
          window.removeEventListener("click", tryStart);
          window.removeEventListener("touchstart", tryStart);
        })
        .catch(() => {
          // Blocked by the browser's autoplay policy - the click/touch
          // listeners below will retry on the visitor's first interaction.
        });
    };

    tryStart();
    window.addEventListener("click", tryStart);
    window.addEventListener("touchstart", tryStart);
    return () => {
      window.removeEventListener("click", tryStart);
      window.removeEventListener("touchstart", tryStart);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleMute = () => {
    if (audioRef.current) {
      if (isMuted) {
        audioRef.current.muted = false;
        audioRef.current.volume = VOLUME;
        audioRef.current.play().then(() => {
          setIsPlaying(true);
        }).catch(console.error);
      } else {
        audioRef.current.muted = true;
        setIsPlaying(false);
      }
      setIsMuted(!isMuted);
    }
  };

  return (
    <>
      <audio
        ref={audioRef}
        src={audioUrl}
        loop
        muted={isMuted}
        preload="none"
      />
      
      <motion.button
        onClick={toggleMute}
        className="fixed bottom-20 left-6 z-50 bg-foreground/80 hover:bg-foreground text-background rounded-full p-3 shadow-lg hover:shadow-xl transition-all duration-300"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 1.5, type: "spring", stiffness: 200 }}
        data-testid="audio-toggle-btn"
        title={isMuted ? "Unmute background music" : "Mute background music"}
      >
        {isMuted ? (
          <VolumeX size={20} />
        ) : (
          <Volume2 size={20} />
        )}
      </motion.button>
    </>
  );
};

export default BackgroundAudio;
