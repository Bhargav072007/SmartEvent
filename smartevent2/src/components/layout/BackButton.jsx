import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';

export default function BackButton() {
  const location = useLocation();
  const navigate = useNavigate();

  if (location.pathname === '/') return null;

  return (
    <button
      onClick={() => navigate(-1)}
      className="flex items-center gap-1 text-primary-foreground/70 hover:text-primary-foreground transition-colors mr-2"
    >
      <ChevronLeft className="w-5 h-5" />
      <span className="text-sm font-medium hidden sm:inline">Back</span>
    </button>
  );
}