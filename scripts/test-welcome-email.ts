// Test the updated Kira Ready email
import { sendKiraReadyEmail } from '../lib/email/resend';

const email = process.argv[2] || 'mcmdennis+denniskiratest@gmail.com';

sendKiraReadyEmail({
  userName: 'Dennis McMahon',
  userEmail: email,
  agentId: 'test-agent-123',
  journeyType: 'business',
})
  .then(() => {
    console.log('✅ Test email sent to:', email);
    console.log('Check your inbox (including Spam folder)');
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
