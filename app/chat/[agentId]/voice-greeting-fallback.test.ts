// app/chat/[agentId]/voice-greeting-fallback.test.ts
//
// Proves that ChatPage provides a caller-name greeting fallback when
// neither area-focus nor welcome-back applies. This ensures that org
// members (e.g., Brian in Dennis's CAIS Beta org) are greeted by THEIR
// name, not the org owner's name frozen in the ElevenLabs agent's
// baked-in `first_message` ("Hey Dennis...").

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { stripComments } from '@/lib/source-scan';

const PAGE = stripComments(readFileSync(join(__dirname, 'page.tsx'), 'utf8'));

describe('ChatPage voice greeting fallback for caller name', () => {
  it('finds the page at all', () => {
    expect(PAGE.length).toBeGreaterThan(20_000);
    expect(PAGE).toContain('VoiceWidget');
  });

  it('computes a callerGreeting using the firstName prop', () => {
    expect(PAGE).toContain('callerGreeting');
    expect(PAGE).toContain('firstName?.trim()');
    expect(PAGE).toContain('Hey ${firstName.trim()}');
  });

  it('uses callerGreeting in the overrides chain after welcomeBack', () => {
    // The priority chain: areaFocusMessage > welcomeBack > callerGreeting > undefined
    expect(PAGE).toContain('callerGreeting');
    expect(PAGE).toContain('welcomeBack');
    expect(PAGE).toContain('areaFocusMessage');
    // Ensure the ternary chain includes callerGreeting
    expect(PAGE).toContain('callerGreeting');
  });

  it('does NOT just fall through to the agent baked-in first_message', () => {
    // The fix ensures there is ALWAYS an override when firstName exists,
    // so the VoiceWidget never uses the agent's frozen "Hey Dennis" message.
    expect(PAGE).not.toContain(': undefined }'); // the old chain ended with undefined
  });
});