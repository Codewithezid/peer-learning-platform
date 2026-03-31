import Link from 'next/link';

interface GithubRef {
  label: string;
  url: string;
}

interface ModulePageProps {
  title: string;
  description: string;
  architecturePoints: string[];
  apiRoutes?: string[];
  githubRefs?: GithubRef[];
}

export default function ModulePage({
  title,
  description,
  architecturePoints,
  apiRoutes = [],
  githubRefs = [],
}: ModulePageProps) {
  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
        <p className="mt-2 text-slate-600">{description}</p>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Architecture Scope</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-slate-700">
          {architecturePoints.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ul>
      </section>

      {apiRoutes.length > 0 && (
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Planned API Routes</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {apiRoutes.map((route) => (
              <code
                key={route}
                className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-800"
              >
                {route}
              </code>
            ))}
          </div>
        </section>
      )}

      {githubRefs.length > 0 && (
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Reference Repos</h2>
          <div className="mt-3 space-y-2">
            {githubRefs.map((item) => (
              <Link
                key={item.url}
                href={item.url}
                target="_blank"
                rel="noreferrer"
                className="block text-sm text-blue-600 hover:text-blue-700 hover:underline"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
