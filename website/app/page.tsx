import Hero from "@/components/hero";


import OpenSourceSection from "@/components/open-source-section";
import FeaturesTwoCard from "@/components/features-two-card";
import ProductFeatureShowcase from "@/components/product-feature-showcase";
import HowItWorksFlow from "@/components/how-it-works-flow";

import dynamic from "next/dynamic";
const CommunityCarousel = dynamic(() => import("@/components/community-carousel"));
const FAQAccordion = dynamic(() => import("@/components/faq-accordion"));

export default function HomePage() {
  return (
    <div className="bg-background text-foreground overflow-hidden">
      {/* 1. HERO SECTION & 2. HERO SHOWCASE */}
      <Hero />

      {/* 3. OPEN SOURCE SECTION */}
      <OpenSourceSection />

      {/* 4. FEATURES SECTION (Two Cards) */}
      <FeaturesTwoCard />

      {/* 5. COMMUNITY SECTION (Carousel) */}
      <CommunityCarousel />

      {/* 6. FEATURE SHOWCASE */}
      <ProductFeatureShowcase />

      {/* 7. HOW IT WORKS */}
      <HowItWorksFlow />

      {/* 8. FAQ SECTION */}
      <FAQAccordion />
    </div>
  );
}
