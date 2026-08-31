// components/genome-knowledge/NextQuestions.tsx
//
// NEXT QUESTIONS — shows what Kira should ask next to improve the genome.

'use client';

interface Question {
  area_key: string;
  concept: string;
  priority: number;
  reason: string;
}

interface NextQuestionsProps {
  questions: Question[];
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

export function NextQuestions({ questions }: NextQuestionsProps) {
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
      <h2 className="text-xl font-semibold text-blue-800 mb-4">
        What Kira Should Ask Next
      </h2>
      <p className="text-sm text-blue-700 mb-4">
        These are the most valuable questions to improve your Operating Manual.
      </p>

      <div className="space-y-3">
        {questions.map((question, index) => (
          <div key={index} className="bg-white border border-blue-200 rounded p-3">
            <div className="flex items-start justify-between">
              <div>
                <div className="font-medium text-[var(--text-primary)]">
                  {AREA_NAMES[question.area_key] ?? question.area_key}
                </div>
                <div className="text-sm text-[var(--text-secondary)] mt-1">
                  {question.concept.replace(/_/g, ' ')}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium text-blue-600">
                  Priority: {question.priority}
                </div>
              </div>
            </div>
            <div className="text-sm text-[var(--text-secondary)] mt-2">
              {question.reason}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
