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

/**
 * A page shaped like a real one.
 *
 * The prose is not decoration. `detectTechnology` now requires MIN_VISIBLE_TEXT_CHARS of readable
 * text before it will claim to have inspected anything, and the earlier fixtures carried about forty
 * characters — thinner than any real practice homepage, and thin enough that they would have sailed
 * past the very floor these tests exist to prove. A fixture that could not survive the rule it is
 * testing is not a test.
 */
const SHELL = (body: string) => `<!doctype html><html><head>
<meta charset="utf-8"><title>Example Medical Centre</title>
<script src="https://www.googletagmanager.com/gtag/js?id=G-1"></script>
</head><body>
<h1>Example Medical Centre</h1>
<p>We are a family practice in the northern suburbs, caring for patients of all ages since 1998.
Our doctors offer general consultations, chronic disease management, childhood immunisations,
skin checks, travel medicine and minor procedures. We are open six days a week and welcome new
patients. Please phone reception during business hours to discuss your needs.</p>
${body}
<a href="https://www.facebook.com/examplepractice">Facebook</a>
<a href="https://maps.app.goo.gl/abc">Find us</a>
</body></html>`;

/** A JavaScript-rendered site: plenty of markup, no content. Modelled on a real measurement. */
const JS_SHELL = `<!doctype html><html><head><meta charset="utf-8"><title>Example Dental</title>
<script src="https://a1b2c3.edge.sdk.awswaf.com/challenge.js"></script>
<script src="/webpack-runtime-1b985d00.js"></script><script src="/framework-831866eb.js"></script>
<script src="/app-4f2c9a1b.js"></script><link rel="stylesheet" href="/styles.abc123.css">
${'<meta name="pad" content="'.concat('x'.repeat(2000), '">')}
</head><body><div id="___gatsby"></div><div id="gatsby-announcer"></div>
<noscript>You need to enable JavaScript to run this app.</noscript>
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

  it('does NOT match "book" inside "facebook" — the live false positive', () => {
    // FOUND AGAINST REAL SITES, not imagined. Two of ten Australian practice websites were reported
    // as having online booking because the substring `book` occurs inside `facebook`:
    //   https://connect.facebook.net/en_US/fbevents.js
    //   https://static.parastorage.com/…/rb_wixui.thunderbolt[WFacebookLike].a6a92f24.min.css
    // Both should be silent. The direction of the error is what made it expensive: a practice with
    // NO online booking — the strongest direct-prospect signal there is — was reported as having it.
    const html = SHELL(`
      <script src="https://connect.facebook.net/en_US/fbevents.js"></script>
      <link rel="stylesheet" href="https://static.parastorage.com/services/x/rb_wixui.thunderbolt[WFacebookLike].a6a92f24.min.css">`);
    const result = detectTechnology([page(html)]);

    expect(result.booking).toBe('no_visible_online_booking');
    expect(result.detected.filter((d) => d.provider.startsWith('unrecognised:'))).toEqual([]);
  });

  it('still matches a genuine booking host on a word boundary', () => {
    // The boundary must not be so tight that it kills the real signal it was narrowed to protect.
    const html = SHELL(`<a href="https://bookings.some-new-vendor.com.au/example">Reserve</a>`);
    expect(detectTechnology([page(html)]).booking).toBe('other_online_booking');
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
    expect(result.notInspectedReason).toBe('no-pages');
    expect(result.pagesInspected).toEqual([]);
  });

  it('treats an empty body as not inspectable', () => {
    const result = detectTechnology([page('')]);
    expect(result.booking).toBe('unknown');
    expect(result.inspected).toBe(false);
    expect(result.notInspectedReason).toBe('no-pages');
  });

  it('refuses to draw a conclusion from a JavaScript-rendered shell', () => {
    // THE REGRESSION TEST FOR THE WORST FAILURE THIS MODULE HAS HAD. Run against a real target, a
    // Gatsby site behind a WAF returned 33,737 bytes of markup carrying ten characters of visible
    // text — and the detector reported 'no_visible_online_booking' about an organisation that used a
    // booking platform at every one of its locations. Byte length is not evidence of content.
    const result = detectTechnology([page(JS_SHELL)]);

    expect(result.inspected).toBe(false);
    expect(result.booking).toBe('unknown');
    expect(result.booking).not.toBe('no_visible_online_booking');
    // 'no-readable-content' rather than 'no-pages': the fetch SUCCEEDED. Those send a reader to two
    // completely different places — one is our network, the other is their website.
    expect(result.notInspectedReason).toBe('no-readable-content');
    expect(result.unreadablePages).toEqual(['https://examplepractice.com.au/']);
  });

  it('still detects a vendor on a readable page while reporting an unreadable sibling', () => {
    const readable = page(
      SHELL(`<a href="https://healthengine.com.au/appointment/x">Book</a>`),
      'https://examplepractice.com.au/appointments',
    );
    const shell = page(JS_SHELL, 'https://examplepractice.com.au/team');
    const result = detectTechnology([readable, shell]);

    expect(result.booking).toBe('healthengine');
    expect(result.inspected).toBe(true);
    expect(result.pagesInspected).toEqual(['https://examplepractice.com.au/appointments']);
    expect(result.unreadablePages).toEqual(['https://examplepractice.com.au/team']);
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
