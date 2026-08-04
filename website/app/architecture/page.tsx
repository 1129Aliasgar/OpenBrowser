import { Metadata } from "next";
import ArchitectureHero from "@/components/architecture/hero";
import ArchitectureIntro from "@/components/architecture/intro";
import HighLevelDiagram from "@/components/architecture/high-level-diagram";
import CoreComponents from "@/components/architecture/core-components";
import StreamingPipeline from "@/components/architecture/streaming-pipeline";
import ResponseProcessing from "@/components/architecture/response-processing";
import RequestLifecycle from "@/components/architecture/request-lifecycle";
import ArchitecturalPrinciples from "@/components/architecture/principles";
import RepoStructure from "@/components/architecture/repo-structure";
import CTABanner from "@/components/cta-banner";

export const metadata: Metadata = {
  title: "OpenBrowser Architecture — Fastify, SSE & Chrome Extension Specs",
  description: "Technical architecture deep dive into OpenBrowser's Fastify bridge server, Server-Sent Events, MV3 Chrome extension, and local operation executor.",
};

export default function ArchitecturePage() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <ArchitectureHero />
      <ArchitectureIntro />
      <HighLevelDiagram />
      <CoreComponents />
      <StreamingPipeline />
      <ResponseProcessing />
      <RequestLifecycle />
      <ArchitecturalPrinciples />
      <RepoStructure />
      <CTABanner />
    </div>
  );
}
