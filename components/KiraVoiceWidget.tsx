// components/KiraVoiceWidget.tsx
// PubGuard's voice agent — now a thin adapter over the canonical portfolio VoiceWidget
// (@caistech/elevenlabs-convai/react). It maps PubGuard's props (userType, auto-speak summary,
// scan client tools) onto the shared widget so PubGuard consumes the Morgan surface instead of a
// bespoke raw-@elevenlabs/react fork. The scan page's usage is unchanged.

'use client';

import { VoiceWidget } from '@caistech/elevenlabs-convai/react';
import { voiceAgents } from '@/voice.config';

type UserType = 'writer' | 'developer' | 'user' | 'analyst';

interface KiraVoiceWidgetProps {
  userType: UserType;
  userId?: string;
  sessionId?: string;
  agentId?: string;
  onConversationStart?: (conversationId: string) => void;
  onConversationEnd?: () => void;
  onScanComplete?: (result: any) => void;
  position?: 'bottom-right' | 'bottom-left' | 'inline';
  theme?: 'dark' | 'light';
  // Auto-speak props
  autoSpeak?: boolean;
  autoSpeakMessage?: string;
  onAutoSpeakComplete?: () => void;
}

// The PubGuard persona is tailored per user type via a session prompt override (the agent must have
// overrides enabled at provision time; unchanged from the previous implementation).
const BASE_PROMPT = `You are speaking with a {userType}. Tailor your responses accordingly:
- writer: Focus on liability, disclosures, reader safety
- developer: Focus on actionable fixes, security checklist
- user: Keep it simple, focus on "is it safe?"
- analyst: Full technical details, CVEs, IOCs`;

export default function KiraVoiceWidget({
  userType,
  userId,
  sessionId,
  agentId = voiceAgents.pubguard.agentId,
  onConversationStart,
  onConversationEnd,
  onScanComplete,
  position = 'bottom-right',
  autoSpeak = false,
  autoSpeakMessage,
  onAutoSpeakComplete,
}: KiraVoiceWidgetProps) {
  const basePrompt = BASE_PROMPT.replace('{userType}', userType);
  const prompt =
    autoSpeak && autoSpeakMessage
      ? `${basePrompt}\n\nIMPORTANT: Start the conversation by saying this summary: "${autoSpeakMessage}"`
      : basePrompt;

  // Client tools Kira can invoke during the call (same contract as before).
  const clientTools: Record<string, (params: Record<string, unknown>) => Promise<string>> = {
    displayScanResult: async (params) => {
      onScanComplete?.((params as { result: unknown }).result);
      return 'Result displayed to user';
    },
    getUserType: async () =>
      `userType:${userType},userId:${userId || 'anonymous'},sessionId:${sessionId || 'none'}`,
  };

  return (
    <VoiceWidget
      agentId={agentId}
      placement={position === 'inline' ? 'inline' : 'floating'}
      mode="greeting"
      avatarUrl="/female_avatar.jpeg"
      coachName="Kira"
      overrides={{
        agent: {
          prompt: { prompt },
          firstMessage: autoSpeak && autoSpeakMessage ? autoSpeakMessage : undefined,
        },
      }}
      clientTools={clientTools}
      // autoSpeak = open the panel, connect (requests mic), and speak the summary as the first message.
      autoConnect={autoSpeak}
      onConnect={(conversationId) => {
        onConversationStart?.(conversationId);
        if (autoSpeak) onAutoSpeakComplete?.();
      }}
      onDisconnect={() => onConversationEnd?.()}
    />
  );
}

// Inline variant retained for existing call sites.
export function KiraInlineVoice({ userType, ...props }: Omit<KiraVoiceWidgetProps, 'position'>) {
  return <KiraVoiceWidget userType={userType} position="inline" {...props} />;
}
