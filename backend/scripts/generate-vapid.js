const webpush = require('web-push');
const fs = require('fs');
const path = require('path');

const vapidKeys = webpush.generateVAPIDKeys();

console.log('VAPID Public Key:');
console.log(vapidKeys.publicKey);
console.log('\nVAPID Private Key:');
console.log(vapidKeys.privateKey);

const envPath = path.join(__dirname, '../.env');

if (fs.existsSync(envPath)) {
  let envConfig = fs.readFileSync(envPath, 'utf8');
  
  const publicFound = envConfig.includes('VAPID_PUBLIC_KEY=');
  const privateFound = envConfig.includes('VAPID_PRIVATE_KEY=');

  if (publicFound || privateFound) {
    console.log('\n⚠️  VAPID keys already exist in .env. Skipping update to avoid overwriting.');
  } else {
    envConfig += `\n# Web Push VAPID Keys\nVAPID_PUBLIC_KEY=${vapidKeys.publicKey}\nVAPID_PRIVATE_KEY=${vapidKeys.privateKey}\n`;
    fs.writeFileSync(envPath, envConfig);
    console.log('\n✅ VAPID keys appended to .env');
  }
} else {
  const envContent = `VAPID_PUBLIC_KEY=${vapidKeys.publicKey}\nVAPID_PRIVATE_KEY=${vapidKeys.privateKey}\n`;
  fs.writeFileSync(envPath, envContent);
  console.log('\n✅ Created new .env with VAPID keys');
}
