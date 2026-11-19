import React, { useState, useEffect } from 'react';
import LandingPage from './components/LandingPage';
import CommandCenter from './components/CommandCenter';
import AutonomousFleetBackground from './components/AutonomousFleetBackground';
import { ThemeProvider } from './context/ThemeContext';

function MainApp() {
  const [currentView, setCurrentView] = useState(() => {
    return window.location.hash === "#app" ? "workspace" : "landing";
  });
  const [selectedPreset, setSelectedPreset] = useState(null);

  // Sync with browser hash and scroll
  const navigateTo = (view) => {
    setCurrentView(view);
    window.location.hash = view === "workspace" ? "app" : "";
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSelectPreset = (preset) => {
    setSelectedPreset(preset);
    navigateTo("workspace");
  };

  // Listen for hash change in browser history
  useEffect(() => {
    const handleHashChange = () => {
      setCurrentView(window.location.hash === "#app" ? "workspace" : "landing");
    };
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  return (
    <div className="relative min-h-screen w-full bg-white dark:bg-[#0B0F17] text-[#1F2937] dark:text-[#CBD5E1] transition-colors overflow-x-hidden">
      {/* Stageshow Autonomous Fleet Background Layer */}
      <AutonomousFleetBackground />

      {/* Main Interactive App Content */}
      <div className="relative z-10">
        {currentView === "workspace" ? (
          <CommandCenter 
            onNavigate={navigateTo} 
            selectedPreset={selectedPreset} 
          />
        ) : (
          <LandingPage 
            onNavigate={navigateTo} 
            onSelectPreset={handleSelectPreset} 
          />
        )}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <MainApp />
    </ThemeProvider>
  );
}
