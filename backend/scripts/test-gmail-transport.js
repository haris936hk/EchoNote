

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { getGmailTransport, closeGmailTransport } = require('../src/utils/emailTransport');

async function testTransport() {
  try {
    console.log('🧪 Testing Gmail transport creation...\n');

    
    console.log('1️⃣ Creating Gmail transport...');
    const transport = await getGmailTransport();
    console.log('   ✅ Transport created successfully\n');

    
    console.log('2️⃣ Verifying Gmail connection...');
    const isValid = await transport.verify();
    console.log('   ✅ Gmail connection verified\n');

    // Test 3: Close transport
    console.log('3️⃣ Closing transport...');
    await closeGmailTransport();
    console.log('   ✅ Transport closed\n');

    console.log('✅ All tests passed! Gmail OAuth2 transport is working correctly.\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Transport test failed:\n');
    console.error(`   Error: ${error.message}\n`);

    if (error.message.includes('GMAIL_REFRESH_TOKEN')) {
      console.log('💡 Next steps:');
      console.log('   1. Follow the Gmail OAuth2 setup in the plan');
      console.log('   2. Get refresh token from OAuth Playground');
      console.log('   3. Update GMAIL_REFRESH_TOKEN in .env');
      console.log('   4. Run this test again\n');
    }

    process.exit(1);
  }
}

console.log('═══════════════════════════════════════════════════');
console.log('   Gmail OAuth2 Transport Test');
console.log('═══════════════════════════════════════════════════\n');

testTransport();
