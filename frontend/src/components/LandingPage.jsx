import React from 'react';
import Navbar from './Navbar';
import Hero from './Hero';
import ArchitectureSection from './ArchitectureSection';
import SimulatorSection from './SimulatorSection';
import SecuritySection from './SecuritySection';
import CtaBanner from './CtaBanner';
import Footer from './Footer';

export default function LandingPage({ onNavigate, onSelectPreset }) {
  return (
    <div className="min-h-screen bg-transparent text-[#1F2937] dark:text-[#CBD5E1] selection:bg-[#3B6BF0]/20 selection:text-[#0B1220] dark:selection:text-[#F8FAFC]">
      <Navbar onNavigate={onNavigate} />
      <main>
        <Hero onNavigate={onNavigate} />
        <ArchitectureSection />
        <SimulatorSection onSelectPreset={onSelectPreset} />
        <SecuritySection />
        <CtaBanner onNavigate={onNavigate} />
      </main>
      <Footer />
    </div>
  );
}
