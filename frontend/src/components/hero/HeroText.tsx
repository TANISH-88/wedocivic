"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

type Slide = { url: string; title: string; sub: string };
type Props = { slides: Slide[]; activeIndex: number };

export default function HeroText({ slides, activeIndex }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const ctx = gsap.context(() => {
      const slideEl = containerRef.current?.children[activeIndex] as HTMLElement;
      if (!slideEl) return;

      const title = slideEl.querySelector("h1");
      const subtitle = slideEl.querySelector(".sub-text");
      const line = slideEl.querySelector(".accent-line");

      gsap.fromTo(title,
        { opacity: 0, y: 50 },
        { opacity: 1, y: 0, duration: 1, ease: "power3.out" }
      );
      gsap.fromTo(subtitle,
        { opacity: 0, filter: "blur(8px)", y: 10 },
        { opacity: 1, filter: "blur(0px)", y: 0, duration: 1.2, delay: 0.3, ease: "power2.out" }
      );
      gsap.fromTo(line,
        { scaleX: 0, opacity: 0 },
        { scaleX: 1, opacity: 1, duration: 0.8, delay: 0.15, ease: "power2.out" }
      );
    }, containerRef);

    return () => ctx.revert();
  }, [activeIndex]);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none"
    >
      {slides.map((slide, i) => (
        <div
          key={i}
          className={`flex flex-col items-center text-center max-w-3xl px-8 ${i === activeIndex ? "block" : "hidden"}`}
        >
          <div className="accent-line h-[2px] w-16 bg-emerald-400 mb-6 mx-auto" />

          <h1 className="text-white text-5xl md:text-6xl lg:text-7xl font-bold leading-tight tracking-tight">
            {slide.title}
          </h1>

          <p className="sub-text text-white/60 mt-5 text-base md:text-lg max-w-xl leading-relaxed">
            {slide.sub}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 mt-8 pointer-events-auto">
            <Link
              href="/register"
              className="px-8 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-xl flex items-center justify-center gap-2 transition-all"
            >
              Join the movement <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/explore"
              className="px-8 py-3.5 border border-white/20 text-white font-bold rounded-xl hover:bg-white/5 flex items-center justify-center gap-2 transition-all"
            >
              Explore <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
}
