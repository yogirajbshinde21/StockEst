import React, { useState, useRef, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CanvasRevealEffect } from './ui/canvas-reveal-effect';

const VideoCardWithEffect = ({ videoId, title, description, icon, height = '300px' }) => {
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [hovered, setHovered] = useState(false);
  const videoRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isVideoLoaded) {
          setIsVisible(true);
          setTimeout(() => {
            setIsVideoLoaded(true);
          }, 500);
        }
      },
      { threshold: 0.1 }
    );

    if (videoRef.current) {
      observer.observe(videoRef.current);
    }
    return () => observer.disconnect();
  }, [isVideoLoaded]);

  return (
    <div className="feature-video">
      <div 
        className="video-container-with-effect"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{ position: 'relative', borderRadius: '1rem', overflow: 'hidden' }}
      >
        {/* Video Content */}
        <div ref={videoRef} style={{ width: '100%', height, borderRadius: '1rem', overflow: 'hidden', position: 'relative', zIndex: 10 }}>
          {!isVideoLoaded ? (
            <div
              style={{
                width: '100%',
                height: '100%',
                backgroundImage: `url(https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg)`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                borderRadius: '1rem',
                transition: 'opacity 0.3s ease'
              }}
            >
              {isVisible && (
                <div style={{
                  width: '60px',
                  height: '60px',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '20px',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
                  animation: 'pulse 1.5s infinite'
                }}>
                  ▶
                </div>
              )}
            </div>
          ) : (
            <iframe
              src={`https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&loop=1&controls=0&showinfo=0&rel=0&modestbranding=1&playsinline=1&playlist=${videoId}&enablejsapi=1&iv_load_policy=3&fs=0&disablekb=1&cc_load_policy=0&autohide=1&wmode=opaque&origin=${window.location.origin}`}
              width="100%"
              height="100%"
              frameBorder="0"
              allow="autoplay; encrypted-media"
              allowFullScreen={false}
              title={title}
              style={{ 
                borderRadius: '1rem',
                pointerEvents: 'none',
                border: 'none',
                outline: 'none'
              }}
            />
          )}
        </div>

        {/* Canvas Reveal Effect Overlay */}
        <AnimatePresence>
          {hovered && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0"
              style={{ borderRadius: '1rem', overflow: 'hidden' }}
            >
              <CanvasRevealEffect
                animationSpeed={5}
                containerClassName="bg-transparent"
                colors={[
                  [34, 197, 94], // Green
                  [225, 65, 65], // Red
                  [59, 130, 246], // Blue
                ]}
                opacities={[0.1, 0.2, 0.2, 0.2, 0.2, 0.3, 0.3, 0.3, 0.4, 0.7]}
                dotSize={2}
                showGradient={false}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Subtle overlay for better text visibility when hovered */}
        <AnimatePresence>
          {hovered && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/20 flex items-center justify-center"
              style={{ borderRadius: '1rem', zIndex: 20 }}
            >
              <div className="text-white text-center p-4">
                <div className="text-2xl mb-2">{icon}</div>
                <h4 className="text-lg font-semibold mb-2">{title}</h4>
                <p className="text-sm opacity-90">{description}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default VideoCardWithEffect;
