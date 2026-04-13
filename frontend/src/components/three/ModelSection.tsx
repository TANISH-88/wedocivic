"use client";

import { useEffect, useRef, Suspense } from "react";
import dynamic from "next/dynamic";
import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { features } from "./features";

gsap.registerPlugin(ScrollTrigger);

const Earth = dynamic(() => import("./Earth"), { ssr: false });

const SCROLL_PER_FEATURE = 1000;
const IMPACT_SCROLL = 1500;
const TOTAL_SCROLL = features.length * SCROLL_PER_FEATURE + IMPACT_SCROLL;

export default function ModelSection() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const featuresPanelRef = useRef<HTMLDivElement>(null);
  const impactTextRef = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);
  const textRefs = useRef<(HTMLDivElement | null)[]>(
    new Array(features.length).fill(null)
  );

  useEffect(() => {
    if (!wrapperRef.current || !stickyRef.current) return;
    const total = features.length;

    gsap.set(canvasRef.current, { x: -180, scale: 0.85 });
    gsap.set(textRefs.current, { opacity: 0, y: 40 });
    gsap.set(impactTextRef.current, { opacity: 0, y: 50 });
    gsap.set(subtitleRef.current, { opacity: 0 });

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: wrapperRef.current,
          start: "top top",
          end: `+=${TOTAL_SCROLL}`,
          scrub: 1,
          pin: stickyRef.current,
        },
      });

      features.forEach((_, i) => {
        const progress = (i + 1) / total;
        const xVal = -180 + progress * 180;
        const scaleVal = 0.85 + progress * 0.1;

        tl.to(textRefs.current[i], { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" });
        tl.to(canvasRef.current, { x: xVal, scale: scaleVal, duration: 0.8, ease: "power2.inOut" }, "<");

        if (i < total - 1) {
          tl.to(textRefs.current[i], { opacity: 0, y: -35, duration: 0.4 }, "+=0.4");
        }
      });

      tl.to(featuresPanelRef.current, { opacity: 0, duration: 0.6 }, "+=0.4");
      tl.to(canvasRef.current, { x: 0, scale: 1.0, duration: 1.5, ease: "power1.inOut" }, "<");

      tl.to(impactTextRef.current, { opacity: 1, y: 0, duration: 1.2, ease: "power2.out" }, "<0.5");
      tl.to(subtitleRef.current, { opacity: 1, duration: 0.8, ease: "power2.out" }, "<0.3");
    });

    return () => ctx.revert();
  }, []);

  return (
    <div ref={wrapperRef} style={{ height: `${TOTAL_SCROLL + 800}px`, background: "#080c10" }}>
      <div
        ref={stickyRef}
        style={{
          height: "100vh",
          background: "#080c10",
          color: "white",
          position: "relative",
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          ref={canvasRef}
          style={{ width: "750px", height: "750px", flexShrink: 0, zIndex: 1 }}
        >
          <Canvas
            frameloop="always"
            dpr={[1, 1.5]}
            gl={{ antialias: true, powerPreference: "high-performance",
              toneMapping: THREE.ReinhardToneMapping, toneMappingExposure: 0.9 }}
            camera={{ position: [0, 0, 5], fov: 45 }}
          >
            <Suspense fallback={null}>
              <Earth />
            </Suspense>
          </Canvas>
        </div>

        <h1
          ref={impactTextRef}
          style={{
            position: "absolute", inset: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "clamp(3rem, 10vw, 11rem)",
            fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.1em",
            opacity: 0, color: "white", zIndex: 10,
            margin: 0, pointerEvents: "none", textAlign: "center",
            width: "100%",
          }}
        >
          CIVIC IMPACT
        </h1>

        <div
          ref={featuresPanelRef}
          style={{
            position: "absolute", right: "6rem", top: "50%",
            transform: "translateY(-50%)",
            width: "360px", height: "280px", zIndex: 10,
          }}
        >
          {features.map((f, i) => (
            <div
              key={i}
              ref={(el) => { textRefs.current[i] = el; }}
              style={{
                position: "absolute", top: "50%", left: 0,
                transform: "translateY(-50%)", width: "100%", opacity: 0,
              }}
            >
              <div style={{ height: "2px", width: "40px", background: "#34d399", marginBottom: "16px" }} />
              <h2 style={{ fontSize: "2.2rem", fontWeight: 700, marginBottom: "14px", lineHeight: 1.2, color: "white" }}>
                {f.title}
              </h2>
              <p style={{ color: "rgba(255,255,255,0.55)", fontSize: "1rem", lineHeight: 1.75, maxWidth: "360px" }}>
                {f.desc}
              </p>
            </div>
          ))}
        </div>

        <p
          ref={subtitleRef}
          style={{
            position: "absolute", bottom: "8vh", left: "50%",
            transform: "translateX(-50%)",
            fontSize: "0.8rem", color: "rgba(255,255,255,0.4)",
            letterSpacing: "0.2em", textTransform: "uppercase",
            opacity: 0, whiteSpace: "nowrap", zIndex: 10,
            font:"bold"
          }}
        >
                  By Team HackArk.
        </p>
      </div>
    </div>
  );
}
