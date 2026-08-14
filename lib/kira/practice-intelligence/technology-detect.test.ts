// Technology detection is a LOOKUP, and these tests exist to keep it one.
//
// ⚠️ WHAT THESE FIXTURES ARE, STATED PLAINLY. They are SYNTHETIC markup written to carry the vendor
// domains documented in SIGNATURES. They are NOT captured from live practice websites — capturing
// real samples needs live fetches, which are out of scope for this phase. So these tests prove the
// MATCHER behaves correctly given a signature; they do NOT prove the signature list matches what
// Healthengine or HotDoc actually emit in the wild. That second question is open, it is named in the
// limitations, and it is settled by one live capture run — not by adding more invented fixtures.

import { describe, expect, it } from 'vitest';
import { detectTechnology, extractUrls, type PageSource } from './technology-detect';

const page = (html: string, url = 'https://examplepractice.com.au/'): PageSource => ({ url, html });

const SHELL = (body: string) => `<!doctype html><html><head>
<meta charset="utf-8"><title>Example Medical Centre</title>
<script src="https://www.googletagmanager.com/gtag/js?id=G-1"></script>
</head><body>${body}
<a href="https://www.facebook.com/examplepractice">Facebook</a>
<a href="https://maps.app.goo.gl/abc">Find us</a>
</body></html>`;

describe('booking provider detection', () => {
  it('detects Healthengine from a booking link', () => {
    const html = SHELL(
      `<a class="cta" href="https://healthengine.com.au/appointment/example-medical-centre">Book online</a>`,
    );
    const result = detectTechnology([page(html)]);

    expect(result.booking).toBe('healthengine');
    expect(result.inspected).toBe(true);
    const he = result.detected.find((d) => d.provider === 'healthengine');
    expect(he?.confidence).toBe(1);
    expect(he?.evidence[0].where).toBe('url-reference');
    expect(he?.evidence[0].match).toContain('healthengine.com.au/appointment');
  });

  it('detects Healthengine on a subdomain', () => {
    const html = SHELL(`<iframe src="https://book.healthengine.com.au/widget/123"></iframe>`);
    expect(detectTechnology([page(html)]).booking).toBe('healthengine');
  });

  it('detects HotDoc from a script tag', () => {
    const html = SHELL(`<script src="https://cdn.hotdoc.com.au/widget/v2/widget.js"></script>`);
    const result = detectTechnology([page(html)]);

    expect(result.booking).toBe('hotdoc');
    expect(result.detected.find((d) => d.provider === 'hotdoc')?.confidence).toBe(1);
  });

  it('prefers Healthengine when both are present, and still reports HotDoc as evidence', () => {
    // Routing hangs on Healthengine, so it must win the status — but a practice mid-migration is
    // real, and losing the HotDoc evidence would hide it from the person reading the write-up.
    const html = SHELL(
      `<a href="https://healthengine.com.au/appointment/x">Book</a>
       <a href="https://www.hotdoc.com.au/medical-centres/x">Or here</a>`,
    );
    const result = detectTechnology([page(html)]);

    expect(result.booking).toBe('healthengine');
    expect(result.detected.map((d) => d.provider)).toContain('hotdoc');
  });

  it('classifies a recognised non-headline vendor as other_online_booking', () => {
    const html = SHELL(`<a href="https://example.cliniko.com/bookings?business=1">Book</a>`);
    const result = detectTechnology([page(html)]);

    expect(result.booking).toBe('other_online_booking');
    expect(result.detected.find((d) => d.provider === 'cliniko')?.confidence).toBe(1);
  });

  it('reports an UNRECOGNISED third-party booking host rather than calling it "no booking"', () => {
    // The failure this prevents: a vendor missing from the seed list silently becoming
    // "no visible online booking", which is the single most commercially misleading answer here.
    const html = SHELL(`<a href="https://bookings.some-new-vendor.com.au/example">Book an appointment</a>`);
    const result = detectTechnology([page(html)]);

    expect(result.booking).toBe('other_online_booking');
    const unknown = result.detected.find((d) => d.provider.startsWith('unrecognised:'));
    expect(unknown?.provider).toBe('unrecognised:bookings.some-new-vendor.com.au');
    expect(unknown?.evidence[0].match).toContain('some-new-vendor');
  });
});

describe('the wording rule', () => {
  it('does NOT infer online booking from the words "book online"', () => {
    // The explicit directive rule. Every practice site in the country says this, including the ones
    // that mean "telephone us during business hours".
    const html = SHELL(`<h2>Book online today!</h2><p>You can book online or call reception.</p>
      <a href="/appointments">Appointments</a><a href="tel:+61890000000">Call us</a>`);
    const result = detectTechnology([page(html)]);

    expect(result.booking).toBe('no_visible_online_booking');
    expect(result.detected).toEqual([]);
  });

  it('does not treat an internal /book link as a third-party booking system', () => {
    const html = SHELL(`<a href="https://examplepractice.com.au/book-appointment">Book an appointment</a>`);
    expect(detectTechnology([page(html)]).booking).toBe('no_visible_online_booking');
  });

  it('ignores social, maps and CDN hosts even on booking-shaped URLs', () => {
    const html = SHELL(`<a href="https://www.facebook.com/examplepractice/book">Book via Facebook</a>`);
    expect(detectTechnology([page(html)]).booking).toBe('no_visible_online_booking');
  });

  it('does NOT treat an ordinary third-party link as a booking system', () => {
    // Added after a mutation check: removing the booking-shape requirement altogether left every
    // test green, which meant nothing was actually holding that line. A practice site links out to
    // pathology, radiology, health funds and its own web designer — if any outbound link counted,
    // essentially every practice would be reported as having online booking, and the single most
    // commercially important signal in this module would be noise.
    const html = SHELL(`
      <a href="https://somepathology.com.au/patients">Pathology results</a>
      <a href="https://somefund.com.au/members">Health fund</a>
      <a href="https://webdesigner.example/portfolio">Site by Example</a>`);
    const result = detectTechnology([page(html)]);

    expect(result.booking).toBe('no_visible_online_booking');
    expect(result.detected.filter((d) => d.provider.startsWith('unrecognised:'))).toEqual([]);
  });

  it('records a bare domain mention at half confidence WITHOUT setting the status', () => {
    // "We are moving away from HotDoc" is a mention, not adoption.
    const html = SHELL(`<p>We no longer take bookings through hotdoc.com.au — please call us.</p>`);
    const result = detectTechnology([page(html)]);

    expect(result.booking).toBe('no_visible_online_booking');
    expect(result.detected.find((d) => d.provider === 'hotdoc')?.confidence).toBe(0.5);
  });
});

describe('the unknown / not-inspected distinction', () => {
  it('returns unknown and inspected:false when no page could be read', () => {
    // A fetch failure must never read as "this practice has no online booking".
    const result = detectTechnology([]);
    expect(result.booking).toBe('unknown');
    expect(result.inspected).toBe(false);
    expect(result.pagesInspected).toEqual([]);
  });

  it('treats an empty body as not inspectable', () => {
    const result = detectTechnology([page('')]);
    expect(result.booking).toBe('unknown');
    expect(result.inspected).toBe(false);
  });

  it('no_visible_online_booking is only reachable when something WAS inspected', () => {
    const result = detectTechnology([page(SHELL('<p>Phone reception on 08 9000 0000.</p>'))]);
    expect(result.inspected).toBe(true);
    expect(result.booking).toBe('no_visible_online_booking');
  });
});

describe('multi-page merging', () => {
  it('finds the provider when it is on the appointments page and not the homepage', () => {
    // The real shape of the failure: homepage-only inspection misreads a Healthengine practice.
    const home = page(SHELL('<p>Welcome to our practice.</p>'), 'https://examplepractice.com.au/');
    const appts = page(
      SHELL(`<a href="https://healthengine.com.au/appointment/x">Book</a>`),
      'https://examplepractice.com.au/appointments',
    );
    const result = detectTechnology([home, appts]);

    expect(result.booking).toBe('healthengine');
    expect(result.pagesInspected).toHaveLength(2);
    expect(result.detected[0].evidence[0].sourceUrl).toBe('https://examplepractice.com.au/appointments');
  });
});

describe('other categories', () => {
  it('records a PMS reference without it affecting booking status', () => {
    const html = SHELL(`<a href="https://www.bpsoftware.net/">Best Practice</a>`);
    const result = detectTechnology([page(html)]);

    expect(result.detected.find((d) => d.provider === 'best-practice')?.category).toBe('pms');
    expect(result.booking).toBe('no_visible_online_booking');
  });

  it('records an AI receptionist vendor', () => {
    const html = SHELL(`<script src="https://app.slang.ai/embed.js"></script>`);
    const result = detectTechnology([page(html)]);
    expect(result.detected.find((d) => d.provider === 'slang-ai')?.category).toBe('ai_receptionist');
  });
});

describe('determinism and purity', () => {
  it('returns an identical verdict for the same input, every time', () => {
    const html = SHELL(`<a href="https://healthengine.com.au/appointment/x">Book</a>`);
    const runs = Array.from({ length: 5 }, () => JSON.stringify(detectTechnology([page(html)])));
    expect(new Set(runs).size).toBe(1);
  });

  it('is synchronous — it cannot be awaiting a model', () => {
    // Structural guard for "do NOT make the LLM the primary detector": a function that returns a
    // plain object rather than a Promise has no way to call one.
    const result = detectTechnology([page(SHELL('<p>hello</p>'))]) as unknown;
    expect(result).not.toBeInstanceOf(Promise);
  });
});

describe('extractUrls', () => {
  it('pulls URLs out of script, link, iframe and anchor attributes alike', () => {
    const urls = extractUrls(`
      <script src="https://a.example/one.js"></script>
      <link rel="stylesheet" href="https://b.example/two.css">
      <iframe src="https://c.example/three"></iframe>
      <a href="https://d.example/four">x</a>`);
    expect(urls).toHaveLength(4);
    expect(urls).toContain('https://c.example/three');
  });

  it('trims trailing punctuation picked up from prose', () => {
    expect(extractUrls('see https://a.example/page.')).toContain('https://a.example/page');
  });
});
