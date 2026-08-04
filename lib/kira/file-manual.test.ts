// The file_manual tool: the guards that stop it writing into someone's account by accident.
//
// This is the first thing Kira does that CREATES files in a customer's own storage. Everything else
// she does is reversible inside our own database.

import { describe, expect, it } from 'vitest';
import { kiraFileManualToolDef } from './file-manual-tool-def.mjs';
import { UID_TOOL_NAMES, isUidToolUrl } from './uid-tools.mjs';
import { toolDefsFor } from './tool-manifest.mjs';

const def = () => kiraFileManualToolDef('https://example.test') as {
  name: string;
  description: string;
  webhook: { url: string };
  parameters: { properties: Record<string, { enum?: string[] }>; required: string[] };
};

describe('the tool definition', () => {
  it('requires BOTH the audience and the approval', () => {
    // An optional audience is a default by another name, and a default that guessed "owner" would
    // file his position and his plans into a folder he then shares. An optional approval is no
    // approval at all.
    expect(def().parameters.required.sort()).toEqual(['approved', 'audience']);
  });

  it('constrains the audience to the two, so there is no third state to interpret', () => {
    expect(def().parameters.properties.audience.enum).toEqual(['owner', 'buyer']);
  });

  it('tells her to ask rather than to guess', () => {
    const d = def().description;
    expect(d).toMatch(/there is no default and you must not guess/i);
    expect(d).toMatch(/cannot be undone/i);
  });

  it('tells her a partial result is not "filed"', () => {
    // She reads the result out. "I've filed that" when two sections failed is the claim the owner
    // acts on — he sends someone to the folder.
    expect(def().description).toMatch(/do not describe it as done/i);
  });

  it('says re-running updates rather than duplicates, because that is how he keeps it current', () => {
    expect(def().description).toMatch(/UPDATES the documents already there/i);
  });
});

describe('identity', () => {
  it('is a uid tool — omitted from that list it would be provisioned unable to work', () => {
    // The regression the uid-tools note describes: no `?uid`, so the route finds no identity and
    // refuses every call. A tool that exists, is attached, and can never work.
    expect(UID_TOOL_NAMES).toContain('file_manual');
    expect(isUidToolUrl(def().webhook.url)).toBe(true);
  });
});

describe('journey scoping', () => {
  it('is attached to the business journey and NOT to personal', () => {
    // A personal-journey coach has no operating manual to file, and a tool that writes into
    // someone's document store is not one to hand out by default.
    const names = (journey: 'business' | 'personal') =>
      (toolDefsFor(journey, 'https://example.test') as { name?: string }[]).map((t) => t.name);
    expect(names('business')).toContain('file_manual');
    expect(names('personal')).not.toContain('file_manual');
  });
});
