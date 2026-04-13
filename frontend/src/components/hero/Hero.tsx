"use client";

import { useState, useRef, useEffect, useCallback, JSX } from "react";
import { gsap } from "gsap";
import { Observer } from "gsap/all";
import HeroBackground from "./HeroBackground";
import HeroText from "./HeroText";

gsap.registerPlugin(Observer);

type Slide = {
  url: string;
  title: string;
  sub: string;
};

const slides: Slide[] = [
  {
    url: "/video1.mp4",
    title: "Turning Small Actions Into Big Environmental Impact",
    sub: "Government Impact Faster action & response from government bodiesThe platform creates real time visibility of waste is sues, making it easier for authorities to identify problem areas quickly.",
  },
  {
    url: "/video2.mp4",
    title: "Where Good Work Get Seen",
    sub: "True democracy requires more than voting — it demands continuous dialogue, transparency, and active participation.",
  },
];

export default function Hero(): JSX.Element {
  const [index, setIndex] = useState<number>(0);
  const isAnimating = useRef<boolean>(false);
  const autoPlayRef = useRef<NodeJS.Timeout | null>(null);

  const changeSlide = useCallback((dir: number) => {
    if (isAnimating.current) return;
    isAnimating.current = true;
    setIndex((prev) => (prev + dir + slides.length) % slides.length);
    gsap.delayedCall(1.2, () => {
      isAnimating.current = false;
    });
  }, []);

  const startAutoPlay = useCallback(() => {
    if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    autoPlayRef.current = setInterval(() => changeSlide(1), 5000);
  }, [changeSlide]);

  useEffect(() => {
    startAutoPlay();

    const obs = Observer.create({
      target: window,
      type: "wheel,touch",
      onDown: () => { changeSlide(1); startAutoPlay(); },
      onUp: () => { changeSlide(-1); startAutoPlay(); },
      tolerance: 20,
      preventDefault: false,
    });

    return () => {
      obs.kill();
      if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    };
  }, [changeSlide, startAutoPlay]);

  return (
    <main className="relative w-full h-screen overflow-hidden touch-none bg-black">
      <HeroBackground slides={slides} activeIndex={index} />
      <HeroText slides={slides} activeIndex={index} />
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-50 flex gap-3">
        {slides.map((_, i) => (
          <div
            key={i}
            className={`h-0.5 w-8 transition-all duration-500 ${
              i === index ? "bg-white" : "bg-white/20"
            }`}
          />
        ))}
      </div>
    </main>
  );
}
