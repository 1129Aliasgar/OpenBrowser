"use client";

import { useState, useEffect } from "react";
import { m, LazyMotion, domAnimation, AnimatePresence } from "framer-motion";
import { Star, ChevronLeft, ChevronRight, Quote, Github, UserCheck } from "lucide-react";

export default function CommunityCarousel() {
  const reviews = [
    {
      quote: "This replaced my API workflow completely. I use my existing ChatGPT Plus subscription directly in my terminal and save hundreds of dollars each month.",
      author: "Alex Rivera",
      role: "Senior Fullstack Engineer",
      company: "Indie Hacker",
      rating: 5,
      avatar: "AR",
    },
    {
      quote: "No more copy-pasting prompts back and forth between browser tabs and VS Code. OpenBrowser captures responses and applies diffs automatically.",
      author: "Elena Rostova",
      role: "Lead Frontend Architect",
      company: "Dev Studio",
      rating: 5,
      avatar: "ER",
    },
    {
      quote: "The bridge architecture is brilliant. Local Server-Sent Events with Chrome Extension auto-injection gives me local agent power with zero API costs.",
      author: "Marcus Chen",
      role: "DevOps & Infrastructure",
      company: "Cloud Scale Inc",
      rating: 5,
      avatar: "MC",
    },
    {
      quote: "Works perfectly with ChatGPT Plus and Claude Pro. The context scanner reads my local directory files flawlessly without uploading to third parties.",
      author: "Sarah Jenkins",
      role: "Open Source Contributor",
      company: "Rust Enthusiast",
      rating: 5,
      avatar: "SJ",
    },
    {
      quote: "Exactly what local AI should feel like. Snappy CLI, clean diff previews, and zero friction setup. Recommended to my entire engineering team.",
      author: "David Kim",
      role: "Tech Lead",
      company: "NextGen Software",
      rating: 5,
      avatar: "DK",
    },
  ];

  const [currentIndex, setCurrentIndex] = useState(0);

  const nextReview = () => {
    setCurrentIndex((prev) => (prev + 1) % reviews.length);
  };

  const prevReview = () => {
    setCurrentIndex((prev) => (prev - 1 + reviews.length) % reviews.length);
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % reviews.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [reviews.length]);

  return (
    <section className="py-20 bg-background border-t border-border relative overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl space-y-12">
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EE8B50]/10 text-[#EE8B50] border border-[#EE8B50]/20 text-xs font-mono font-semibold">
            <UserCheck className="w-3.5 h-3.5" />
            <span>Developer Reviews</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground font-display">
            Loved by Developers <span className="text-[#EE8B50]">Worldwide</span>
          </h2>
          <p className="text-muted-foreground text-sm sm:text-base">
            See how engineers are streamlining their local workflows without paying for raw API tokens.
          </p>
        </div>

        {/* Carousel Container */}
        <div className="relative max-w-3xl mx-auto">
          <div className="p-8 sm:p-12 rounded-3xl bg-card border border-border shadow-2xl relative min-h-[260px] flex flex-col justify-between">
            <Quote className="w-10 h-10 text-[#EE8B50]/20 absolute top-6 left-6 pointer-events-none" />

            <AnimatePresence mode="wait">
              <LazyMotion features={domAnimation}>
                <m.div
                  key={currentIndex}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.4 }}
                  className="space-y-6 relative z-10"
                >
                <div className="flex items-center gap-1">
                  {[...Array(reviews[currentIndex].rating)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-[#EE8B50] text-[#EE8B50]" />
                  ))}
                </div>

                <p className="text-lg sm:text-2xl font-medium text-foreground leading-relaxed font-display">
                  &ldquo;{reviews[currentIndex].quote}&rdquo;
                </p>

                <div className="flex items-center gap-3 pt-2">
                  <div className="w-10 h-10 rounded-full bg-[#EE8B50] text-foreground font-bold flex items-center justify-center font-mono text-sm shadow-md">
                    {reviews[currentIndex].avatar}
                  </div>
                  <div>
                    <div className="font-bold text-foreground text-sm">{reviews[currentIndex].author}</div>
                    <div className="text-xs text-muted-foreground">
                      {reviews[currentIndex].role} • <span className="text-muted-foreground">{reviews[currentIndex].company}</span>
                    </div>
                  </div>
                </div>
                </m.div>
              </LazyMotion>
            </AnimatePresence>

            {/* Controls */}
            <div className="flex items-center justify-between pt-6 border-t border-border mt-6">
              <div className="flex gap-1.5">
                {reviews.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentIndex(idx)}
                    className={`h-2 rounded-full transition-all ${
                      idx === currentIndex ? "w-6 bg-[#EE8B50]" : "w-2 bg-[#262A33]"
                    }`}
                    aria-label={`Go to slide ${idx + 1}`}
                  />
                ))}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={prevReview}
                  className="p-2 rounded-full bg-popover hover:bg-[#262A33] text-muted-foreground hover:text-foreground border border-border transition-colors"
                  aria-label="Previous review"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={nextReview}
                  className="p-2 rounded-full bg-popover hover:bg-[#262A33] text-muted-foreground hover:text-foreground border border-border transition-colors"
                  aria-label="Next review"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
