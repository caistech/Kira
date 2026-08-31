// components/genome-knowledge/QualityScore.tsx
//
// THE QUALITY SCORE — shows the overall genome quality (0-100) and breakdown.

'use client';

interface QualityScoreProps {
  score: number;
  breakdown: {
    average_provenance: number;
    average_confidence: number;
    confirmed_rate: number;
    candidate_rate: number;
  };
}

function getScoreColor(score: number): string {
  if (score >= 80) return 'text-green-600';
  if (score >= 60) return 'text-yellow-600';
  if (score >= 40) return 'text-orange-600';
  return 'text-red-600';
}

function getScoreLabel(score: number): string {
  if (score >= 80) return 'Strong';
  if (score >= 60) return 'Good';
  if (score >= 40) return 'Developing';
  return 'Early';
}

export function QualityScore({ score, breakdown }: QualityScoreProps) {
  return (
    <div className="bg-[var(--bg-secondary)] rounded-lg p-6">
      <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-4">
        Knowledge Quality
      </h2>

      <div className="flex items-center gap-8">
        {/* Score */}
        <div className="text-center">
          <div className={`text-5xl font-bold ${getScoreColor(score)}`}>
            {score}
          </div>
          <div className="text-sm text-[var(--text-secondary)]">
            {getScoreLabel(score)}
          </div>
        </div>

        {/* Breakdown */}
        <div className="flex-1 grid grid-cols-2 gap-4">
          <div>
            <div className="text-sm text-[var(--text-secondary)]">Source Strength</div>
            <div className="text-lg font-medium text-[var(--text-primary)]">
              {(breakdown.average_provenance * 100).toFixed(0)}%
            </div>
          </div>
          <div>
            <div className="text-sm text-[var(--text-secondary)]">Confidence</div>
            <div className="text-lg font-medium text-[var(--text-primary)]">
              {(breakdown.average_confidence * 100).toFixed(0)}%
            </div>
          </div>
          <div>
            <div className="text-sm text-[var(--text-secondary)]">Confirmed</div>
            <div className="text-lg font-medium text-[var(--text-primary)]">
              {(breakdown.confirmed_rate * 100).toFixed(0)}%
            </div>
          </div>
          <div>
            <div className="text-sm text-[var(--text-secondary)]">Candidate</div>
            <div className="text-lg font-medium text-[var(--text-secondary)]">
              {(breakdown.candidate_rate * 100).toFixed(0)}%
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
