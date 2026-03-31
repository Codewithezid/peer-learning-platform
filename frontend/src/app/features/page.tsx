import ModulePage from '@/components/common/ModulePage';

export default function FeaturesPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <ModulePage
        title="Platform Features"
        description="Feature map aligned to the complete architecture draft from your idea document."
        architecturePoints={[
          'Role-based employee, mentor, and admin user journeys',
          'Knowledge repository with search and AI assistance',
          'Peer matching, real-time chat, and video sessions',
          'Feedback, ratings, and contribution analytics',
          'Modular backend APIs and scalable service boundaries',
        ]}
      />
    </div>
  );
}
