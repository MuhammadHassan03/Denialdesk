import type { Metadata } from "next";
import { ChecksSection } from "@/components/landing/checks-section";
import { CostSection } from "@/components/landing/cost-section";
import { HowItWorks } from "@/components/landing/how-it-works";
import { LandingFooter } from "@/components/landing/landing-footer";
import { LandingHeader } from "@/components/landing/landing-header";
import { LandingHero } from "@/components/landing/landing-hero";
import { PilotOffer } from "@/components/landing/pilot-offer";

export const metadata: Metadata = {
  title: "Denialdesk: work every denial before its deadline",
  description:
    "Denialdesk ranks your denials by dollars and days left and drafts the appeal with the payer's own policy quoted. You approve every word.",
};

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-canvas">
      <LandingHeader />
      <main>
        <LandingHero />
        <CostSection />
        <HowItWorks />
        <ChecksSection />
        <PilotOffer />
      </main>
      <LandingFooter />
    </div>
  );
}
