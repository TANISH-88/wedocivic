"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";

type Slide = {
  url: string;
  title: string;
  sub: string;
};

type Props = {
  slides: Slide[];
  activeIndex: number;
};

export default function HeroBackground({ slides, activeIndex }: Props) {
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);

  useEffect(() => {
    videoRefs.current.forEach((video, i) => {
      if (!video) return;

      const isActive = i === activeIndex;

      if (isActive) {
        video.currentTime = 0;
        video.play().catch(() => {});
      } else {
        video.pause();
      }

      gsap.to(video, {
        opacity: isActive ? 1 : 0,
        duration: 1,
      });
    });
  }, [activeIndex]);

  return (
    <div className="absolute inset-0 z-0">
      {slides.map((slide, i) => (
        <video
          key={i}
          ref={(el) => (videoRefs.current[i] = el)}
          src={slide.url}
          className="absolute inset-0 w-full h-full object-cover opacity-0"
          loop
          muted
          playsInline
          preload="none"
        />
      ))}

      <div className="absolute inset-0 bg-black/50 z-10" />
    </div>
  );
}
