// components/genome-knowledge/ConflictList.tsx
//
// CONFLICT LIST — shows unresolved contradictions in the genome.

'use client';

interface Conflict {
  area_key: string;
  subject: string;
  predicate: string;
  values: string[];
}

interface ConflictListProps {
  conflicts: Conflict[];
}

export function ConflictList({ conflicts }: ConflictListProps) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-6">
      <h2 className="text-xl font-semibold text-red-800 mb-4">
        Unresolved Contradictions
      </h2>
      <p className="text-sm text-red-700 mb-4">
        Kira found conflicting information that needs clarification.
      </p>

      <div className="space-y-3">
        {conflicts.map((conflict, index) => (
          <div key={index} className="bg-white border border-red-200 rounded p-3">
            <div className="font-medium text-[var(--text-primary)]">
              {conflict.subject} {conflict.predicate}
            </div>
            <div className="text-sm text-red-600 mt-1">
              Conflicting values: {conflict.values.join(' vs ')}
            </div>
            <div className="text-xs text-[var(--text-secondary)] mt-1">
              Area: {conflict.area_key}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
