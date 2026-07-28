import { useState, useRef, useEffect } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { motion } from "framer-motion";

const BackgroundAudio = () => {
  const [isMuted, setIsMuted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef(null);

  const audioUrl = "/travaholic-background.mp3";
  const VOLUME = 0.015; // ambient background level, not full blast

  useEffect(() => {
    // Sound is on by default, so try to autoplay unmuted right away. Every
    // major browser blocks unmuted autoplay without a prior user gesture,
    // so this will usually be rejected on a first-ever visit - the
    // first-interaction fallback below (unmuted, unlike before) covers
    // that case instead of silently staying muted forever.
    if (audioRef.current) {
      audioRef.current.volume = VOLUME;
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }

    const handleFirstInteraction = () => {
      if (audioRef.current) {
        audioRef.current.muted = false;
        audioRef.current.volume = VOLUME;
        audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
      }
      document.removeEventListener('click', handleFirstInteraction);
      document.removeEventListener('touchstart', handleFirstInteraction);
    };

    document.addEventListener('click', handleFirstInteraction);
    document.addEventListener('touchstart', handleFirstInteraction);

    return () => {
      document.removeEventListener('click', handleFirstInteraction);
      document.removeEventListener('touchstart', handleFirstInteraction);
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
        preload="auto"
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
