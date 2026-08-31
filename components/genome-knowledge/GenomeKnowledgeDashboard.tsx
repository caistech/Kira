// components/genome-knowledge/GenomeKnowledgeDashboard.tsx
//
// THE GENOME KNOWLEDGE DASHBOARD — the main projection of the Business Genome.
//
// This component fetches the genome data and displays:
//   - Overall quality score
//   - Per-area coverage (populated / sparse / absent)
//   - Conflicts needing resolution
//   - Gaps in knowledge
//   - Next questions Kira should ask

'use client';

import { useState, useEffect } from 'react';
import { AreaCoverageCard } from './AreaCoverageCard';
import { QualityScore } from './QualityScore';
import { ConflictList } from './ConflictList';
import { GapList } from './GapList';
import { NextQuestions } from './NextQuestions';

interface GenomeKnowledgeDashboardProps {
  userId: string;
}

interface GenomeData {
  coverage: {
    populated: string[];
    sparse: string[];
    absent: string[];
    total_entities: number;
    total_facts: number;
    per_area: Record<string, {
      entities: number;
      facts: number;
      coverage_level: 'populated' | 'sparse' | 'absent';
    }>;
  };
  quality: {
    overall_score: number;
    per_area_score: Record<string, number>;
    breakdown: {
      average_provenance: number;
      average_confidence: number;
      confirmed_rate: number;
      candidate_rate: number;
    };
  };
  conflicts: {
    total: number;
    unresolved: Array<{
      area_key: string;
      subject: string;
      predicate: string;
      values: string[];
    }>;
  };
  gaps: {
    missing_knowledge: Array<{
      area_key: string;
      area_name: string;
      reason: string;
    }>;
    weak_knowledge: Array<{
      area_key: string;
      area_name: string;
      reason: string;
    }>;
  };
  next_questions: Array<{
    area_key: string;
    concept: string;
    priority: number;
    reason: string;
  }>;
}

export function GenomeKnowledgeDashboard({ userId }: GenomeKnowledgeDashboardProps) {
  const [data, setData] = useState<GenomeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch('/api/genome/query?assessment=full');
        if (!response.ok) {
          throw new Error('Failed to fetch genome data');
        }
        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [userId]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse bg-[var(--bg-secondary)] rounded-lg h-32" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse bg-[var(--bg-secondary)] rounded-lg h-24" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Error loading genome: {error}</p>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="space-y-8">
      {/* Overall Quality Score */}
      <QualityScore
        score={data.quality.overall_score}
        breakdown={data.quality.breakdown}
      />

      {/* Coverage Summary */}
      <div className="bg-[var(--bg-secondary)] rounded-lg p-6">
        <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-4">
          Knowledge Coverage
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {data.coverage.populated.length}
            </div>
            <div className="text-sm text-[var(--text-secondary)]">Well Covered</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">
              {data.coverage.sparse.length}
            </div>
            <div className="text-sm text-[var(--text-secondary)]">Sparse</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">
              {data.coverage.absent.length}
            </div>
            <div className="text-sm text-[var(--text-secondary)]">Absent</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-[var(--text-primary)]">
              {data.coverage.total_entities + data.coverage.total_facts}
            </div>
            <div className="text-sm text-[var(--text-secondary)]">Total Items</div>
          </div>
        </div>
      </div>

      {/* Per-Area Coverage */}
      <div>
        <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-4">
          Area Coverage
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Object.entries(data.coverage.per_area).map(([areaKey, area]) => (
            <AreaCoverageCard
              key={areaKey}
              areaKey={areaKey}
              entities={area.entities}
              facts={area.facts}
              level={area.coverage_level}
              score={data.quality.per_area_score[areaKey] ?? 0}
            />
          ))}
        </div>
      </div>

      {/* Conflicts */}
      {data.conflicts.unresolved.length > 0 && (
        <ConflictList conflicts={data.conflicts.unresolved} />
      )}

      {/* Gaps */}
      {(data.gaps.missing_knowledge.length > 0 || data.gaps.weak_knowledge.length > 0) && (
        <GapList
          missing={data.gaps.missing_knowledge}
          weak={data.gaps.weak_knowledge}
        />
      )}

      {/* Next Questions */}
      {data.next_questions.length > 0 && (
        <NextQuestions questions={data.next_questions} />
      )}
    </div>
  );
}
