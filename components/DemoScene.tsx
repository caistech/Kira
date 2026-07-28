// Placeholder illustrations, so the viewer can see himself in the room.
//
// PLACEHOLDERS ON PURPOSE — real photography of a tradesman in a ute or on site will land far
// harder with this audience than any drawing, and should replace these once it is licensed. These
// exist so the demo is not a wall of text while that is sourced, and they are deliberately simple:
// a bad illustration is more distracting than none.
//
// Drawn rather than sourced because a stock photo needs a licence and an AI-generated "photo" of a
// person would be a fabricated human being presented as a customer, which is not something to put
// on a page whose entire argument is that we tell you the truth.
//
// No faces. The viewer is meant to see HIMSELF here, and a drawn face is always somebody else.

type SceneKey = 'ute' | 'site' | 'office' | 'kitchen-table' | 'handshake' | 'document' | 'phone';

const warm = { sky: '#fef3c7', ground: '#fde68a', ink: '#57534e', accent: '#fb7185', violet: '#a78bfa' };

export function DemoScene({ scene, className = '' }: { scene?: string; className?: string }) {
  if (!scene) return null;
  const S = SCENES[scene as SceneKey];
  if (!S) return null;
  return (
    <div className={`w-full overflow-hidden rounded-2xl border border-amber-200 bg-amber-50 ${className}`}>
      <svg viewBox="0 0 400 180" role="img" aria-label={S.alt} className="w-full h-auto block">
        <title>{S.alt}</title>
        {S.body}
      </svg>
    </div>
  );
}

const SCENES: Record<SceneKey, { alt: string; body: React.ReactNode }> = {
  // A ute at the kerb, toolboxes on the tray — where most of these conversations actually happen.
  ute: {
    alt: 'A work ute parked at the kerb with a toolbox on the tray',
    body: (
      <>
        <rect width="400" height="180" fill={warm.sky} />
        <rect y="140" width="400" height="40" fill={warm.ground} />
        <rect x="70" y="88" width="120" height="42" rx="6" fill="#fff" stroke={warm.ink} strokeWidth="2.5" />
        <path d="M190 130 L190 96 L250 96 L285 118 L285 130 Z" fill="#fff" stroke={warm.ink} strokeWidth="2.5" />
        <rect x="196" y="102" width="34" height="18" rx="3" fill={warm.sky} stroke={warm.ink} strokeWidth="2" />
        <rect x="86" y="74" width="42" height="18" rx="3" fill={warm.accent} opacity="0.85" />
        <rect x="136" y="74" width="42" height="18" rx="3" fill={warm.accent} opacity="0.5" />
        <circle cx="112" cy="136" r="15" fill="#fff" stroke={warm.ink} strokeWidth="3" />
        <circle cx="252" cy="136" r="15" fill="#fff" stroke={warm.ink} strokeWidth="3" />
        <line x1="0" y1="140" x2="400" y2="140" stroke={warm.ink} strokeWidth="2" opacity="0.4" />
      </>
    ),
  },
  // A half-built frame — the job, mid-flight.
  site: {
    alt: 'A partly framed building on a work site',
    body: (
      <>
        <rect width="400" height="180" fill={warm.sky} />
        <rect y="146" width="400" height="34" fill={warm.ground} />
        <path d="M120 146 L120 60 L200 30 L280 60 L280 146" fill="none" stroke={warm.ink} strokeWidth="3" />
        <line x1="120" y1="88" x2="280" y2="88" stroke={warm.ink} strokeWidth="2.5" />
        <line x1="120" y1="118" x2="280" y2="118" stroke={warm.ink} strokeWidth="2.5" />
        <line x1="160" y1="60" x2="160" y2="146" stroke={warm.ink} strokeWidth="2.5" />
        <line x1="200" y1="45" x2="200" y2="146" stroke={warm.ink} strokeWidth="2.5" />
        <line x1="240" y1="60" x2="240" y2="146" stroke={warm.ink} strokeWidth="2.5" />
        <rect x="300" y="106" width="26" height="40" fill={warm.accent} opacity="0.7" />
        <rect x="66" y="120" width="34" height="26" fill={warm.violet} opacity="0.55" />
      </>
    ),
  },
  // The back office nobody enjoys — paperwork, a lamp, a late evening.
  office: {
    alt: 'A desk with paperwork stacked beside a lamp',
    body: (
      <>
        <rect width="400" height="180" fill={warm.sky} />
        <rect y="132" width="400" height="48" fill={warm.ground} />
        <rect x="60" y="126" width="280" height="8" rx="3" fill={warm.ink} opacity="0.75" />
        <rect x="96" y="86" width="58" height="40" fill="#fff" stroke={warm.ink} strokeWidth="2.5" />
        <rect x="104" y="76" width="58" height="40" fill="#fff" stroke={warm.ink} strokeWidth="2.5" />
        <rect x="112" y="66" width="58" height="40" fill="#fff" stroke={warm.ink} strokeWidth="2.5" />
        <path d="M262 126 L262 92" stroke={warm.ink} strokeWidth="3" />
        <path d="M244 92 L280 92 L272 70 L252 70 Z" fill={warm.accent} opacity="0.8" stroke={warm.ink} strokeWidth="2" />
        <circle cx="262" cy="104" r="16" fill="#fff" opacity="0.55" />
      </>
    ),
  },
  // Two chairs at a table — the conversation he has not had yet.
  'kitchen-table': {
    alt: 'Two chairs at a kitchen table with two mugs',
    body: (
      <>
        <rect width="400" height="180" fill={warm.sky} />
        <rect y="140" width="400" height="40" fill={warm.ground} />
        <rect x="110" y="96" width="180" height="8" rx="3" fill={warm.ink} opacity="0.8" />
        <line x1="130" y1="104" x2="130" y2="140" stroke={warm.ink} strokeWidth="3" />
        <line x1="270" y1="104" x2="270" y2="140" stroke={warm.ink} strokeWidth="3" />
        <rect x="150" y="80" width="20" height="16" rx="3" fill="#fff" stroke={warm.ink} strokeWidth="2" />
        <rect x="230" y="80" width="20" height="16" rx="3" fill="#fff" stroke={warm.ink} strokeWidth="2" />
        <path d="M86 140 L86 100 L104 100 L104 140" fill="none" stroke={warm.ink} strokeWidth="3" />
        <path d="M296 140 L296 100 L314 100 L314 140" fill="none" stroke={warm.ink} strokeWidth="3" />
      </>
    ),
  },
  // The handover — the moment the business changes hands.
  handshake: {
    alt: 'Two hands meeting over a document',
    body: (
      <>
        <rect width="400" height="180" fill={warm.sky} />
        <rect x="130" y="96" width="140" height="60" rx="4" fill="#fff" stroke={warm.ink} strokeWidth="2.5" />
        <line x1="146" y1="114" x2="254" y2="114" stroke={warm.ink} strokeWidth="2" opacity="0.5" />
        <line x1="146" y1="128" x2="230" y2="128" stroke={warm.ink} strokeWidth="2" opacity="0.5" />
        <path d="M120 70 L180 84 L200 78" fill="none" stroke={warm.ink} strokeWidth="4" strokeLinecap="round" />
        <path d="M280 70 L220 84 L200 78" fill="none" stroke={warm.accent} strokeWidth="4" strokeLinecap="round" />
        <circle cx="200" cy="78" r="7" fill={warm.violet} />
      </>
    ),
  },
  // The document itself — what a buyer's advisor reads.
  document: {
    alt: 'A bound document with sections and a seal',
    body: (
      <>
        <rect width="400" height="180" fill={warm.sky} />
        <rect x="128" y="28" width="144" height="128" rx="5" fill="#fff" stroke={warm.ink} strokeWidth="2.5" />
        <rect x="128" y="28" width="16" height="128" fill={warm.violet} opacity="0.7" />
        <line x1="160" y1="56" x2="252" y2="56" stroke={warm.ink} strokeWidth="3" />
        <line x1="160" y1="76" x2="252" y2="76" stroke={warm.ink} strokeWidth="2" opacity="0.45" />
        <line x1="160" y1="90" x2="236" y2="90" stroke={warm.ink} strokeWidth="2" opacity="0.45" />
        <line x1="160" y1="110" x2="252" y2="110" stroke={warm.ink} strokeWidth="2" opacity="0.45" />
        <line x1="160" y1="124" x2="220" y2="124" stroke={warm.ink} strokeWidth="2" opacity="0.45" />
        <circle cx="246" cy="140" r="12" fill={warm.accent} opacity="0.85" />
      </>
    ),
  },
  // A phone on the passenger seat — how the conversation actually starts.
  phone: {
    alt: 'A phone resting on a seat, mid-conversation',
    body: (
      <>
        <rect width="400" height="180" fill={warm.sky} />
        <rect x="164" y="34" width="72" height="120" rx="12" fill="#fff" stroke={warm.ink} strokeWidth="2.5" />
        <rect x="176" y="56" width="48" height="10" rx="5" fill={warm.violet} opacity="0.6" />
        <rect x="176" y="74" width="36" height="10" rx="5" fill={warm.accent} opacity="0.6" />
        <rect x="176" y="92" width="44" height="10" rx="5" fill={warm.violet} opacity="0.4" />
        <circle cx="200" cy="132" r="10" fill={warm.accent} />
        <path d="M110 94 q-14 -18 0 -36" fill="none" stroke={warm.ink} strokeWidth="2.5" opacity="0.5" />
        <path d="M128 88 q-8 -12 0 -24" fill="none" stroke={warm.ink} strokeWidth="2.5" opacity="0.7" />
        <path d="M290 94 q14 -18 0 -36" fill="none" stroke={warm.ink} strokeWidth="2.5" opacity="0.5" />
        <path d="M272 88 q8 -12 0 -24" fill="none" stroke={warm.ink} strokeWidth="2.5" opacity="0.7" />
      </>
    ),
  },
};
