import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faTimes, faExpand, faCompress, faVolumeUp, faVolumeMute,
  faPlay, faPause, faForward, faBackward
} from '@fortawesome/free-solid-svg-icons';
import { extractVideoId } from '../../utils/youtube';
import toast from 'react-hot-toast';

interface PlyrPlayerProps {
  videoUrl: string;
  title: string;
  onClose: () => void;
}

export const PlyrPlayer: React.FC<PlyrPlayerProps> = ({ videoUrl, title, onClose }) => {
  const playerRef = useRef<HTMLDivElement>(null);
  const plyrInstanceRef = useRef<any>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [plyrLoaded, setPlyrLoaded] = useState(false);

  const videoId = extractVideoId(videoUrl);

  // Disable developer tools and protect content
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Disable developer tools shortcuts
      if ((e.ctrlKey && e.shiftKey && e.key === 'I') || 
          (e.key === 'F12') || 
          (e.ctrlKey && e.shiftKey && e.key === 'C') ||
          (e.ctrlKey && e.key === 'U') ||
          (e.ctrlKey && e.shiftKey && e.key === 'J') ||
          (e.ctrlKey && e.shiftKey && e.key === 'K')) {
        e.preventDefault();
        e.stopPropagation();
        toast.error('Developer tools are not available on this website');
        // Close the video player when developer tools are attempted
        onClose();
        return false;
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      toast.error('Right-click is disabled on this website');
      return false;
    };

    // Disable text selection
    const handleSelectStart = (e: Event) => {
      e.preventDefault();
      return false;
    };

    // Disable drag
    const handleDragStart = (e: DragEvent) => {
      e.preventDefault();
      return false;
    };

    // Detect developer tools opening
    const detectDevTools = () => {
      const threshold = 160;
      if (window.outerHeight - window.innerHeight > threshold || 
          window.outerWidth - window.innerWidth > threshold) {
        toast.error('Developer tools detected. Video player will close.');
        onClose();
      }
    };

    // Check for developer tools every 500ms
    const devToolsInterval = setInterval(detectDevTools, 500);
    document.addEventListener('keydown', handleKeyDown, true);
    document.addEventListener('contextmenu', handleContextMenu, true);
    document.addEventListener('selectstart', handleSelectStart, true);
    document.addEventListener('dragstart', handleDragStart, true);

    // Hide video URL in developer tools
    const style = document.createElement('style');
    style.textContent = `
      iframe[src*="youtube.com"] {
        pointer-events: none !important;
      }
      .plyr__video-embed iframe {
        pointer-events: none !important;
      }
    `;
    document.head.appendChild(style);

    return () => {
      clearInterval(devToolsInterval);
      document.removeEventListener('keydown', handleKeyDown, true);
      document.removeEventListener('contextmenu', handleContextMenu, true);
      document.removeEventListener('selectstart', handleSelectStart, true);
      document.removeEventListener('dragstart', handleDragStart, true);
      document.head.removeChild(style);
    };
  }, []);

  // Load Plyr CSS and JS
  useEffect(() => {
    const loadPlyr = async () => {
      try {
        if (!document.querySelector('link[href*="plyr.css"]')) {
          const cssLink = document.createElement('link');
          cssLink.rel = 'stylesheet';
          cssLink.href = 'https://cdn.plyr.io/3.7.8/plyr.css';
          document.head.appendChild(cssLink);
        }

        if (!window.Plyr) {
          const script = document.createElement('script');
          script.src = 'https://cdn.plyr.io/3.7.8/plyr.polyfilled.js';
          script.onload = () => setPlyrLoaded(true);
          script.onerror = () => setError('Failed to load Plyr player');
          document.head.appendChild(script);
        } else {
          setPlyrLoaded(true);
        }
      } catch (error) {
        console.error('Error loading Plyr:', error);
        setError('Failed to load video player');
      }
    };

    loadPlyr();
  }, []);

  // Initialize Plyr player with enhanced controls
  useEffect(() => {
    if (!plyrLoaded || !videoId || !playerRef.current) return;

    const initializePlayer = () => {
      try {
        const playerElement = playerRef.current?.querySelector('#plyr-player');
        if (!playerElement) return;

        const plyrPlayer = new (window as any).Plyr('#plyr-player', {
          youtube: {
            noCookie: false,
            rel: 0,
            showinfo: 0,
            iv_load_policy: 3,
            modestbranding: 1,
            controls: 0,
            disablekb: 0
          },
          controls: [
            'play-large', 'rewind', 'play', 'fast-forward', 
            'progress', 'current-time', 'duration', 'mute', 'volume',
            'captions', 'settings', 'pip', 'airplay', 'fullscreen', 'quality'
          ],
          settings: ['captions', 'quality', 'speed'],
          quality: {
            default: 720,
            options: [144, 240, 360, 480, 720, 1080, 1440, 2160],
            forced: true,
          },
          speed: {
            selected: 1,
            options: [0.75, 1, 1.25, 1.5, 1.75]
          },
          clickToPlay: true,
          hideControls: false,
          keyboard: {
            focused: true,
            global: false
          }
        });

        plyrInstanceRef.current = plyrPlayer;

        // Enhanced event listeners for better control visibility
        plyrPlayer.on('ready', () => {
          setIsLoading(false);
          setError(null);
          
          // Force controls to be always visible
          const controlsElement = playerRef.current?.querySelector('.plyr__controls');
          if (controlsElement) {
            controlsElement.style.opacity = '1';
            controlsElement.style.visibility = 'visible';
            controlsElement.style.transform = 'translateY(0)';
            controlsElement.style.display = 'flex';
          }
        });

        // Enhanced fullscreen handling
        plyrPlayer.on('enterfullscreen', () => {
          setIsFullscreen(true);
          // Force controls visibility in fullscreen
          setTimeout(() => {
            const controlsElement = playerRef.current?.querySelector('.plyr__controls');
            if (controlsElement) {
              controlsElement.style.opacity = '1 !important';
              controlsElement.style.visibility = 'visible !important';
              controlsElement.style.transform = 'translateY(0) !important';
              controlsElement.style.display = 'flex !important';
            }
          }, 100);
        });

        plyrPlayer.on('exitfullscreen', () => {
          setIsFullscreen(false);
        });

        // Prevent controls from hiding
        plyrPlayer.on('controlshidden', () => {
          const controlsElement = playerRef.current?.querySelector('.plyr__controls');
          if (controlsElement) {
            controlsElement.style.opacity = '1';
            controlsElement.style.visibility = 'visible';
            controlsElement.style.transform = 'translateY(0)';
          }
        });

        // Keep controls always visible
        const keepControlsVisible = () => {
          const controlsElement = playerRef.current?.querySelector('.plyr__controls');
          if (controlsElement) {
            controlsElement.style.opacity = '1';
            controlsElement.style.visibility = 'visible';
            controlsElement.style.transform = 'translateY(0)';
            controlsElement.style.display = 'flex';
          }
        };

        // Set interval to keep controls visible
        const controlsInterval = setInterval(keepControlsVisible, 1000);

        // Cleanup interval on component unmount
        return () => clearInterval(controlsInterval);

      } catch (error) {
        console.error('Error initializing Plyr player:', error);
        setError('Failed to initialize video player');
        setIsLoading(false);
      }
    };

    setTimeout(initializePlayer, 100);

    return () => {
      if (plyrInstanceRef.current) {
        try {
          plyrInstanceRef.current.destroy();
        } catch (error) {
          console.error('Error destroying Plyr player:', error);
        }
      }
    };
  }, [plyrLoaded, videoId]);

  // Enhanced keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const targetTagName = (e.target as HTMLElement).tagName.toLowerCase();
      if (targetTagName === 'input' || targetTagName === 'textarea') {
        return;
      }
      
      if (!plyrInstanceRef.current) return;

      switch(e.key.toLowerCase()) {
        case ' ':
        case 'k':
          e.preventDefault();
          plyrInstanceRef.current.togglePlay();
          break;
          
        case 'f':
          e.preventDefault();
          plyrInstanceRef.current.fullscreen.toggle();
          break;
          
        case 'm':
          e.preventDefault();
          plyrInstanceRef.current.muted = !plyrInstanceRef.current.muted;
          break;
          
        case 'arrowleft':
          e.preventDefault();
          plyrInstanceRef.current.rewind(10);
          break;
          
        case 'arrowright':
          e.preventDefault();
          plyrInstanceRef.current.forward(10);
          break;

        case 'escape':
          if (isFullscreen) {
            exitFullscreen();
          } else {
            onClose();
          }
          break;
      }
    };

    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
      
      // Ensure controls remain visible after fullscreen change
      setTimeout(() => {
        const controlsElement = playerRef.current?.querySelector('.plyr__controls');
        if (controlsElement) {
          controlsElement.style.opacity = '1';
          controlsElement.style.visibility = 'visible';
          controlsElement.style.transform = 'translateY(0)';
          controlsElement.style.display = 'flex';
        }
      }, 200);
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [isFullscreen, onClose]);

  const toggleFullscreen = async () => {
    if (!playerRef.current) return;

    try {
      if (!document.fullscreenElement) {
        await playerRef.current.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (error) {
      console.error('Error toggling fullscreen:', error);
    }
  };

  const exitFullscreen = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      }
    } catch (error) {
      console.error('Error exiting fullscreen:', error);
    }
  };

  if (!videoId) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/90 flex items-center justify-center z-50"
      >
        <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 text-center">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Invalid Video</h3>
          <p className="text-gray-600 mb-6">The video URL is not valid or supported.</p>
          <button
            onClick={onClose}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Close
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/90 flex items-center justify-center z-50"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isFullscreen) {
          onClose();
        }
      }}
    >
      <div
        ref={playerRef}
        className={`relative bg-black rounded-lg overflow-hidden shadow-2xl ${
          isFullscreen ? 'w-full h-full' : 'w-full max-w-6xl mx-4 aspect-video'
        }`}
        style={{
          fontFamily: 'Arial, sans-serif',
        }}
      >
        {/* Enhanced Header Controls */}
        <AnimatePresence>
          {!isFullscreen && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/80 to-transparent z-10 p-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-white font-semibold text-lg truncate pr-4">
                  {title}
                </h3>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={onClose}
                    className="text-white/80 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/10"
                    title="Close"
                  >
                    <FontAwesomeIcon icon={faTimes} className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Enhanced Fullscreen Controls */}
        <AnimatePresence>
          {isFullscreen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute top-4 right-4 z-10"
            >
              <div className="flex items-center space-x-2">
                <button
                  onClick={toggleFullscreen}
                  className="text-white/80 hover:text-white transition-colors p-3 rounded-lg hover:bg-white/10 bg-black/50"
                  title="Exit Fullscreen"
                >
                  <FontAwesomeIcon icon={faCompress} className="w-5 h-5" />
                </button>
                <button
                  onClick={onClose}
                  className="text-white/80 hover:text-white transition-colors p-3 rounded-lg hover:bg-white/10 bg-black/50"
                  title="Close"
                >
                  <FontAwesomeIcon icon={faTimes} className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Loading State */}
        <AnimatePresence>
          {isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center bg-black"
            >
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mb-4"></div>
                <p className="text-white">Loading video player...</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error State */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center bg-black"
            >
              <div className="text-center text-white">
                <FontAwesomeIcon icon={faTimes} className="w-12 h-12 mb-4 text-red-500" />
                <h3 className="text-lg font-semibold mb-2">Video Error</h3>
                <p className="text-gray-300 mb-4">{error}</p>
                <button
                  onClick={onClose}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Close
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Enhanced Plyr Video Player */}
        {!error && (
          <div className="w-full h-full relative">
            <style jsx>{`
              .container {
                position: relative;
                overflow: hidden;
                border-radius: 10px;
                width: 100%;
                height: 100%;
              }
              .player-wrapper {
                position: relative;
                width: 100%;
                height: 100%;
              }
              iframe {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                border: 0;
                z-index: 0;
                pointer-events: none !important;
              }
              .plyr__controls {
                z-index: 10 !important;
                pointer-events: all !important;
                opacity: 1 !important;
                transform: translateY(0) !important;
                visibility: visible !important;
                display: flex !important;
                position: absolute !important;
                bottom: 0 !important;
                left: 0 !important;
                right: 0 !important;
                background: linear-gradient(transparent, rgba(0, 0, 0, 0.75)) !important;
                padding: 10px 15px !important;
              }
              .plyr__controls--hidden {
                opacity: 1 !important;
                transform: translateY(0) !important;
                visibility: visible !important;
                display: flex !important;
              }
              .plyr__controls--shown {
                opacity: 1 !important;
                transform: translateY(0) !important;
                visibility: visible !important;
                display: flex !important;
              }
              .plyr__control {
                pointer-events: all !important;
                opacity: 1 !important;
              }
              .plyr__menu {
                z-index: 15 !important;
                pointer-events: all !important;
              }
              .plyr--video .plyr__controls {
                background: linear-gradient(transparent, rgba(0, 0, 0, 0.75)) !important;
                border-radius: 0 !important;
                color: #fff !important;
                left: 0 !important;
                bottom: 0 !important;
                right: 0 !important;
                padding: 10px 15px !important;
                position: absolute !important;
                z-index: 10 !important;
                opacity: 1 !important;
                visibility: visible !important;
                display: flex !important;
                transform: translateY(0) !important;
              }
              .plyr--fullscreen-active .plyr__controls {
                opacity: 1 !important;
                visibility: visible !important;
                display: flex !important;
                transform: translateY(0) !important;
              }
              .plyr--fullscreen-active .plyr__control {
                opacity: 1 !important;
              }
            `}</style>
            
            <div className="container">
              <div className="player-wrapper">
                <div className="plyr__video-embed" id="plyr-player">
                  <iframe
                    src={`https://www.youtube.com/embed/${videoId}?autoplay=0&rel=0&modestbranding=1&controls=1&disablekb=0&enablejsapi=1`}
                    allowFullScreen
                    allow="autoplay"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

