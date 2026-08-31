// components/genome-knowledge/AreaCoverageCard.tsx
//
// AREA COVERAGE CARD — shows one area's coverage status.

'use client';

import Link from 'next/link';

interface AreaCoverageCardProps {
  areaKey: string;
  entities: number;
  facts: number;
  level: 'populated' | 'sparse' | 'absent';
  score: number;
}

const AREA_NAMES: Record<string, string> = {
  work_sources: 'Work Sources',
  pricing: 'Pricing',
  delivery: 'Delivery',
  money: 'Money',
  customers: 'Customers',
  people: 'People',
  assets: 'Assets',
  compliance_calendar: 'Compliance & Calendar',
  systems_records: 'Systems & Records',
};

const LEVEL_STYLES: Record<string, { bg: string; border: string; text: string }> = {
  populated: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-800' },
  sparse: { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-800' },
  absent: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-800' },
};

export function AreaCoverageCard({ areaKey, entities, facts, level, score }: AreaCoverageCardProps) {
  const styles = LEVEL_STYLES[level];
  const name = AREA_NAMES[areaKey] ?? areaKey;
  const total = entities + facts;

  return (
    <Link href={`/genome-knowledge/${areaKey}`}>
      <div className={`${styles.bg} ${styles.border} border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer`}>
        <div className="flex justify-between items-start mb-2">
          <h3 className={`font-medium ${styles.text}`}>{name}</h3>
          <span className={`text-xs px-2 py-1 rounded ${styles.bg} ${styles.text}`}>
            {level}
          </span>
        </div>

        <div className="space-y-1">
          <div className="text-sm text-[var(--text-secondary)]">
            {entities} {entities === 1 ? 'entity' : 'entities'}
          </div>
          <div className="text-sm text-[var(--text-secondary)]">
            {facts} {facts === 1 ? 'fact' : 'facts'}
          </div>
        </div>

        <div className="mt-3">
          <div className="text-sm text-[var(--text-secondary)]">Quality</div>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
            <div
              className="bg-blue-600 h-2 rounded-full"
              style={{ width: `${score}%` }}
            />
          </div>
          <div className="text-xs text-[var(--text-secondary)] mt-1">{score}/100</div>
        </div>
      </div>
    </Link>
  );
}
