'use client';

import Link from 'next/link';
import {
  Brain,
  Users,
  BookOpen,
  Library,
  Sparkles,
  MessageCircle,
  BarChart3,
  ArrowRight,
  ChevronDown,
} from 'lucide-react';
import Footer from '@/components/layout/Footer';

const features = [
  {
    icon: Users,
    title: 'Skill Sharing',
    description: 'Connect with peers to teach and learn new skills',
    href: '/skills',
  },
  {
    icon: BookOpen,
    title: 'Learning Hub',
    description: 'Access curated courses with video resources',
    href: '/learning',
  },
  {
    icon: Library,
    title: 'Knowledge Base',
    description: 'Share and discover articles and documentation',
    href: '/knowledge',
  },
  {
    icon: Sparkles,
    title: 'AI-Powered',
    description: 'Smart recommendations, quizzes, and summaries',
    href: '/ai-assistant',
  },
  {
    icon: MessageCircle,
    title: 'Real-time Chat',
    description: 'Instant messaging for effective collaboration',
    href: '/chat',
  },
  {
    icon: BarChart3,
    title: 'Track Progress',
    description: 'Monitor your growth with detailed analytics',
    href: '/analytics',
  },
];

const steps = [
  {
    number: 1,
    title: 'Create Your Profile',
    description: 'Create your profile and add your skills',
  },
  {
    number: 2,
    title: 'Discover Resources',
    description: 'Discover peers and learning resources',
  },
  {
    number: 3,
    title: 'Learn & Grow',
    description: 'Collaborate, learn, and track progress',
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* ───────── Navbar ───────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Brain className="h-8 w-8 text-blue-500" />
            <span className="text-xl font-bold text-slate-900">
              Peer Connect
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 transition"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-lg transition"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* ───────── Hero ───────── */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-tight">
            Connect. Learn.{' '}
            <span className="text-blue-500">Grow Together.</span>
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
            An intelligent platform for peer-to-peer skill sharing, learning,
            and real-time collaboration.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 px-8 py-3.5 text-base font-semibold text-white bg-blue-500 hover:bg-blue-600 active:bg-blue-700 rounded-xl shadow-lg shadow-blue-500/25 transition"
            >
              Get Started
              <ArrowRight size={18} />
            </Link>
            <a
              href="#features"
              className="inline-flex items-center gap-2 px-8 py-3.5 text-base font-semibold text-slate-700 border border-slate-200 hover:bg-white rounded-xl transition"
            >
              Learn More
              <ChevronDown size={18} />
            </a>
          </div>
        </div>
      </section>

      {/* ───────── Features ───────── */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">
              Everything you need to learn effectively
            </h2>
            <p className="mt-4 text-lg text-slate-600 max-w-2xl mx-auto">
              Powerful features designed to connect learners and accelerate growth
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <Link
                  key={feature.title}
                  href={feature.href}
                  className="bg-white rounded-xl p-6 border border-slate-200 hover:shadow-lg hover:-translate-y-0.5 transition group block"
                >
                  <div className="bg-blue-50 rounded-lg p-3 w-fit text-blue-500 mb-4 group-hover:bg-blue-100 transition">
                    <Icon size={24} />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-slate-600 text-sm leading-relaxed">
                    {feature.description}
                  </p>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ───────── How It Works ───────── */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">
              How it works
            </h2>
            <p className="mt-4 text-lg text-slate-600">
              Get started in three simple steps
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {steps.map((step) => (
              <div key={step.number} className="text-center">
                <div className="mx-auto flex items-center justify-center w-14 h-14 rounded-full bg-blue-500 text-white text-xl font-bold mb-5 shadow-lg shadow-blue-500/25">
                  {step.number}
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                  {step.title}
                </h3>
                <p className="text-slate-600 text-sm leading-relaxed">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───────── CTA ───────── */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center bg-blue-500 rounded-2xl p-10 sm:p-14 shadow-xl shadow-blue-500/20">
          <h2 className="text-3xl sm:text-4xl font-bold text-white">
            Ready to start learning?
          </h2>
          <p className="mt-4 text-blue-100 text-lg">
            Join a growing community of learners and mentors today.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 mt-8 px-8 py-3.5 text-base font-semibold text-blue-600 bg-white hover:bg-blue-50 rounded-xl transition"
          >
            Get Started for Free
            <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      {/* ───────── Footer ───────── */}
      <Footer />
    </div>
  );
}
