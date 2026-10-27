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
    <div>
      <Navbar onNavigate={onNavigate} />
      <main className="landing-wrapper">
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
