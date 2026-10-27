import React, { useState, useEffect } from 'react';
import LandingPage from './components/LandingPage';
import CommandCenter from './components/CommandCenter';

export default function App() {
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

  if (currentView === "workspace") {
    return (
      <CommandCenter 
        onNavigate={navigateTo} 
        selectedPreset={selectedPreset} 
      />
    );
  }

  return (
    <LandingPage 
      onNavigate={navigateTo} 
      onSelectPreset={handleSelectPreset} 
    />
  );
}
