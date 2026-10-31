import { useEffect, useRef } from 'react';
import { useReducedMotion } from 'motion/react';

const source =
  'https://stream.mux.com/T6oQJQ02cQ6N01TR6iHwZkKFkbepS34dkkIc9iukgy400g.m3u8';
export function HeroBackground() {
  const ref = useRef<HTMLVideoElement>(null);
  const reducedMotion = useReducedMotion();
  useEffect(() => {
    const video = ref.current;
    if (!video || reducedMotion) return;
    let disposed = false;
    let destroy: (() => void) | undefined;
    const play = () => {
      void video.play().catch(() => {});
    };
    void import('hls.js')
      .then(({ default: Hls }) => {
        if (disposed) return;
        if (Hls.isSupported()) {
          const hls = new Hls();
          hls.loadSource(source);
          hls.attachMedia(video);
          hls.on(Hls.Events.MANIFEST_PARSED, play);
          hls.on(Hls.Events.ERROR, (_, data) => {
            if (data.fatal) hls.destroy();
          });
          destroy = () => hls.destroy();
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
          video.src = source;
          video.addEventListener('loadedmetadata', play);
          destroy = () => {
            video.removeEventListener('loadedmetadata', play);
            video.pause();
            video.removeAttribute('src');
            video.load();
          };
        }
      })
      .catch(() => {});
    return () => {
      disposed = true;
      destroy?.();
    };
  }, [reducedMotion]);
  return (
    <div className="hero-backdrop" aria-hidden="true">
      <video
        ref={ref}
        muted
        loop
        playsInline
        preload="none"
        poster="https://images.unsplash.com/photo-1647356191320-d7a1f80ca777?auto=format&fit=crop&w=1080&q=80"
      />
      <div className="hero-scrim" />
      <div className="hero-glow" />
      <div className="hero-glow hero-glow-secondary" />
    </div>
  );
}
