// components/genome-knowledge/GapList.tsx
//
// GAP LIST — shows missing and weak knowledge in the genome.

'use client';

interface Gap {
  area_key: string;
  area_name: string;
  reason: string;
}

interface GapListProps {
  missing: Gap[];
  weak: Gap[];
}

export function GapList({ missing, weak }: GapListProps) {
  return (
    <div className="bg-[var(--bg-secondary)] rounded-lg p-6">
      <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-4">
        Knowledge Gaps
      </h2>

      {missing.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-medium text-red-700 mb-2">
            Missing Knowledge
          </h3>
          <p className="text-sm text-[var(--text-secondary)] mb-3">
            Areas with no knowledge captured yet.
          </p>
          <div className="space-y-2">
            {missing.map((gap, index) => (
              <div key={index} className="bg-red-50 border border-red-200 rounded p-3">
                <div className="font-medium text-red-800">{gap.area_name}</div>
                <div className="text-sm text-red-600">{gap.reason}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {weak.length > 0 && (
        <div>
          <h3 className="text-lg font-medium text-yellow-700 mb-2">
            Weak Knowledge
          </h3>
          <p className="text-sm text-[var(--text-secondary)] mb-3">
            Areas with low confidence or unconfirmed information.
          </p>
          <div className="space-y-2">
            {weak.map((gap, index) => (
              <div key={index} className="bg-yellow-50 border border-yellow-200 rounded p-3">
                <div className="font-medium text-yellow-800">{gap.area_name}</div>
                <div className="text-sm text-yellow-600">{gap.reason}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
