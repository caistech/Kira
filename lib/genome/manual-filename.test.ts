// The filename and the audience gate — the two decisions in the manual route that are not layout.
//
// Both exist for the same moment: he is attaching a file to an email for his broker. The banner
// inside the document is not on screen then; a filename in a Downloads folder is.

import { describe, expect, it } from 'vitest';
import { filenameFor, parseAudience } from '@/app/api/genome/manual/route';

describe('the audience gate', () => {
  it('has NO default — the choice is required', () => {
    // Whichever way a default falls it is wrong in a way that matters: default to owner and a man
    // meaning to send the buyer's copy attaches one carrying his position; default to buyer and he
    // believes his own record is thinner than it is.
    expect(parseAudience(null)).toBeNull();
    expect(parseAudience('')).toBeNull();
    expect(parseAudience('both')).toBeNull();
    expect(parseAudience('OWNER')).toBeNull();
  });

  it('accepts exactly the two', () => {
    expect(parseAudience('owner')).toBe('owner');
    expect(parseAudience('buyer')).toBe('buyer');
  });
});

describe('the filename', () => {
  it('makes the two unmistakable side by side in a folder', () => {
    const own = filenameFor('Factory2Key', 'owner', '2026-08-05');
    const buy = filenameFor('Factory2Key', 'buyer', '2026-08-05');
    expect(own).toContain('YOUR-COPY-private');
    expect(buy).toContain('for-buyer');
    // The failure this guards: two files an hour apart, one safe to send and one not,
    // distinguishable only by their timestamp.
    expect(own).not.toBe(buy);
  });

  it('produces a safe filename from an awkward business name', () => {
    const name = filenameFor('O\'Brien & Sons (WA) Pty/Ltd', 'buyer', '2026-08-05');
    expect(name).toMatch(/^[a-z0-9-]+-operating-manual-for-buyer-2026-08-05\.html$/);
    // A quote or a slash in a Content-Disposition filename is how a header stops meaning what it says.
    expect(name).not.toMatch(/["'\\/]/);
  });

  it('falls back rather than producing a nameless file', () => {
    expect(filenameFor('', 'owner', '2026-08-05')).toMatch(/^business-operating-manual-/);
    expect(filenameFor('!!!', 'buyer', '2026-08-05')).toMatch(/^business-operating-manual-/);
  });

  it('does not run away with a very long trading name', () => {
    const name = filenameFor('A'.repeat(200), 'buyer', '2026-08-05');
    expect(name.length).toBeLessThan(90);
  });
});
