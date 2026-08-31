// components/genome-knowledge/AreaKnowledgeDetail.tsx
//
// AREA KNOWLEDGE DETAIL — shows detailed knowledge for a specific area.
//
// Shows:
//   - Entities in this area
//   - Facts in this area
//   - Quality metrics
//   - Gaps and what to ask next

'use client';

import { useState, useEffect } from 'react';

interface AreaKnowledgeDetailProps {
  userId: string;
  areaKey: string;
}

interface AreaData {
  area_key: string;
  area_name: string;
  entity_count: number;
  fact_count: number;
  confidence_stats: {
    mean: number;
    min: number;
    max: number;
  };
  status_breakdown: {
    candidate: number;
    confirmed: number;
  };
  contradictions: Array<{
    subject: string;
    predicate: string;
    values: string[];
  }>;
  entities: Array<{
    id: string;
    name: string;
    entity_type: string;
    confidence: number;
    status: string;
  }>;
  facts: Array<{
    id: string;
    subject: string;
    predicate: string;
    value: string | null;
    confidence: number;
    status: string;
  }>;
}

export function AreaKnowledgeDetail({ userId, areaKey }: AreaKnowledgeDetailProps) {
  const [data, setData] = useState<AreaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch(`/api/genome/query/${areaKey}`);
        if (!response.ok) {
          throw new Error('Failed to fetch area data');
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
  }, [areaKey]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse bg-[var(--bg-secondary)] rounded-lg h-24" />
        <div className="animate-pulse bg-[var(--bg-secondary)] rounded-lg h-48" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Error: {error}</p>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="bg-[var(--bg-secondary)] rounded-lg p-6">
        <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-4">
          Summary
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <div className="text-2xl font-bold text-[var(--text-primary)]">
              {data.entity_count}
            </div>
            <div className="text-sm text-[var(--text-secondary)]">Entities</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-[var(--text-primary)]">
              {data.fact_count}
            </div>
            <div className="text-sm text-[var(--text-secondary)]">Facts</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-600">
              {data.status_breakdown.confirmed}
            </div>
            <div className="text-sm text-[var(--text-secondary)]">Confirmed</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-yellow-600">
              {data.status_breakdown.candidate}
            </div>
            <div className="text-sm text-[var(--text-secondary)]">Candidate</div>
          </div>
        </div>
      </div>

      {/* Entities */}
      {data.entities.length > 0 && (
        <div className="bg-[var(--bg-secondary)] rounded-lg p-6">
          <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-4">
            Entities
          </h2>
          <div className="space-y-2">
            {data.entities.map((entity) => (
              <div key={entity.id} className="bg-white border border-[var(--border-color)] rounded p-3">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-medium text-[var(--text-primary)]">
                      {entity.name}
                    </div>
                    <div className="text-sm text-[var(--text-secondary)]">
                      {entity.entity_type}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-[var(--text-secondary)]">
                      {(entity.confidence * 100).toFixed(0)}%
                    </div>
                    <div className={`text-xs ${entity.status === 'confirmed' ? 'text-green-600' : 'text-yellow-600'}`}>
                      {entity.status}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Facts */}
      {data.facts.length > 0 && (
        <div className="bg-[var(--bg-secondary)] rounded-lg p-6">
          <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-4">
            Facts
          </h2>
          <div className="space-y-2">
            {data.facts.map((fact) => (
              <div key={fact.id} className="bg-white border border-[var(--border-color)] rounded p-3">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-medium text-[var(--text-primary)]">
                      {fact.subject} {fact.predicate} {fact.value}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-[var(--text-secondary)]">
                      {(fact.confidence * 100).toFixed(0)}%
                    </div>
                    <div className={`text-xs ${fact.status === 'confirmed' ? 'text-green-600' : 'text-yellow-600'}`}>
                      {fact.status}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Contradictions */}
      {data.contradictions.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-red-800 mb-4">
            Contradictions
          </h2>
          <div className="space-y-2">
            {data.contradictions.map((contradiction, index) => (
              <div key={index} className="bg-white border border-red-200 rounded p-3">
                <div className="font-medium text-[var(--text-primary)]">
                  {contradiction.subject} {contradiction.predicate}
                </div>
                <div className="text-sm text-red-600">
                  Conflicting: {contradiction.values.join(' vs ')}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
