import { useState, useRef, useEffect } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { motion } from "framer-motion";

const BackgroundAudio = () => {
  // Off by default - the previous version auto-started playback on the
  // user's very first click or tap ANYWHERE on the page (nav links,
  // buttons, everything), so music kicked in unexpectedly no matter how
  // quiet it was set. That surprise, not the volume number, was almost
  // certainly what kept reading as "too loud." Now it only plays when
  // someone deliberately clicks this button.
  const [isMuted, setIsMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef(null);

  const audioUrl = "/travaholic-background.mp3";
  const VOLUME = 0.15; // fine to be a normal ambient level now that it's opt-in

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = VOLUME;
    }
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
