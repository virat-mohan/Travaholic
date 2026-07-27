import { useState, useRef, useEffect } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { motion } from "framer-motion";

const BackgroundAudio = () => {
  const [isMuted, setIsMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef(null);

  const audioUrl = "/travaholic-background.mp3";

  useEffect(() => {
    // Try to play on first user interaction
    const handleFirstInteraction = () => {
      if (audioRef.current && !isPlaying) {
        audioRef.current.play().then(() => {
          setIsPlaying(true);
        }).catch(() => {
          // Autoplay blocked, user needs to click
        });
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
  }, [isPlaying]);

  const toggleMute = () => {
    if (audioRef.current) {
      if (isMuted) {
        audioRef.current.muted = false;
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
