import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import {
  checkVoiceAgentStatus,
  compareUserRoles,
  checkFeatureFlags,
  checkEnvironment,
  checkVoiceAgentConfiguration,
  checkAuthenticationFlow
} from '../lib/voice-agent-checks';

dotenv.config({ path: '.env.local' });

console.log('Environment variables:');
console.log('SUPABASE_URL:', process.env.SUPABASE_URL);
console.log('SUPABASE_SERVICE_KEY:', process.env.SUPABASE_SERVICE_KEY ? '*****' : 'undefined');

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

interface VoiceAgentAnalysis {
  email: string;
  voiceAgentStatus: string | null;
  userRole: string | null;
  featureFlags: any[];
  environment: string | null;
  authenticationFlow: any | null;
  differences: string[];
}

async function analyzeVoiceAgent(email: string): Promise<VoiceAgentAnalysis> {
  const voiceAgentStatus = await checkVoiceAgentStatus(email);
  const userRole = await compareUserRoles(email);
  const featureFlags = await checkFeatureFlags(email);
  const environment = await checkEnvironment(email);
  const authenticationFlow = await checkAuthenticationFlow(email);

  // Compare with your account
  const yourAnalysis = await analyzeVoiceAgent('dennis@factory2key.com.au');

  // Find differences
  const differences = [];

  if (voiceAgentStatus !== yourAnalysis.voiceAgentStatus) {
    differences.push(`Voice agent status differs: ${voiceAgentStatus} vs ${yourAnalysis.voiceAgentStatus}`);
  }

  if (userRole !== yourAnalysis.userRole) {
    differences.push(`User role differs: ${userRole} vs ${yourAnalysis.userRole}`);
  }

  // Compare feature flags
  if (JSON.stringify(featureFlags) !== JSON.stringify(yourAnalysis.featureFlags)) {
    differences.push(`Feature flags differ: ${JSON.stringify(featureFlags)} vs ${JSON.stringify(yourAnalysis.featureFlags)}`);
  }

  if (environment !== yourAnalysis.environment) {
    differences.push(`Environment differs: ${environment} vs ${yourAnalysis.environment}`);
  }

  if (JSON.stringify(authenticationFlow) !== JSON.stringify(yourAnalysis.authenticationFlow)) {
    differences.push(`Authentication flow differs: ${JSON.stringify(authenticationFlow)} vs ${JSON.stringify(yourAnalysis.authenticationFlow)}`);
  }

  return {
    email,
    voiceAgentStatus,
    userRole,
    featureFlags,
    environment,
    authenticationFlow,
    differences
  };
}

async function main() {
  // Read your beta testers list
  const testersPath = path.join(__dirname, '..', 'data', 'beta-testers.json');
  if (!fs.existsSync(testersPath)) {
    console.error(`Error: Beta testers file not found at ${testersPath}`);
    return;
  }

  const testersData = JSON.parse(fs.readFileSync(testersPath, 'utf-8'));

  if (!Array.isArray(testersData)) {
    console.error('Error: Invalid format in beta-testers.json. Expected an array of testers.');
    return;
  }

  const results = [];

  // Analyze your account first
  const yourAnalysis = await analyzeVoiceAgent('dennis@factory2key.com.au');
  results.push(yourAnalysis);

  console.log('Your account analysis:');
  console.log(`- Voice Agent Status: ${yourAnalysis.voiceAgentStatus}`);
  console.log(`- User Role: ${yourAnalysis.userRole}`);
  console.log(`- Environment: ${yourAnalysis.environment}`);
  console.log('');

  for (const tester of testersData) {
    if (!tester.email) {
      console.warn(`Skipping tester with missing email: ${JSON.stringify(tester)}`);
      continue;
    }

    console.log(`\nAnalyzing ${tester.email}...`);
    const analysis = await analyzeVoiceAgent(tester.email);
    results.push(analysis);

    if (analysis.differences.length > 0) {
      console.log(`\nDifferences found for ${tester.email}:`);
      analysis.differences.forEach(diff => console.log(`- ${diff}`));
    } else {
      console.log(`No differences found for ${tester.email}`);
    }
  }

  // Save results
  const outputPath = path.join(__dirname, '..', 'data', 'voice-agent-results.json');
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  console.log(`\nAnalysis complete. Results saved to ${outputPath}`);
}

main().catch(console.error);