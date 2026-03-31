'use client';

import Link from 'next/link';
import { Brain } from 'lucide-react';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-white border-t border-slate-200 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center gap-4">
          {/* Logo and tagline */}
          <Link href="/" className="flex items-center gap-2">
            <Brain className="h-6 w-6 text-blue-600" />
            <span className="font-bold text-lg text-blue-600">Peer Connect</span>
          </Link>
          <p className="text-sm text-slate-500 text-center max-w-md">
            Learn together, grow together. A peer-to-peer knowledge-sharing platform
            that connects learners and mentors through AI-powered matching.
          </p>

          {/* Copyright */}
          <p className="text-xs text-slate-400">
            &copy; {currentYear} Peer Connect. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
