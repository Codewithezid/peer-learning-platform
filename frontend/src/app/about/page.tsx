import ModulePage from '@/components/common/ModulePage';

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <ModulePage
        title="About Peer Connect Architecture"
        description="This platform is designed as a centralized AI-powered employee learning and peer-support web app."
        architecturePoints={[
          'React frontend for employee and admin dashboards',
          'Node.js + Express backend for business modules',
          'PostgreSQL data layer and Socket.IO real-time layer',
          'Python AI service for summary, quiz, search, and recommendations',
          'Jitsi integration for live peer video sessions',
        ]}
        githubRefs={[
          { label: 'React', url: 'https://github.com/facebook/react' },
          { label: 'Express', url: 'https://github.com/expressjs/express' },
          { label: 'PostgreSQL', url: 'https://github.com/postgres/postgres' },
          { label: 'Socket.IO', url: 'https://github.com/socketio/socket.io' },
          { label: 'Jitsi Meet', url: 'https://github.com/jitsi/jitsi-meet' },
        ]}
      />
    </div>
  );
}
