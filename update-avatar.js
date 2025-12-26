const https = require('https');
const fs = require('fs');
const crypto = require('crypto');

const email = process.argv[2];
const password = process.argv[3];
const imagePath = process.argv[4];

if (!email || !password || !imagePath) {
  console.error('Usage: node update-avatar.js <email> <password> <image-path>');
  console.error('注意：密码是你 Gravatar/WordPress.com 的密码。');
  process.exit(1);
}

if (!fs.existsSync(imagePath)) {
  console.error(`Error: Image file not found at ${imagePath}`);
  process.exit(1);
}

const emailHash = crypto.createHash('md5').update(email.trim().toLowerCase()).digest('hex');
const imageBuffer = fs.readFileSync(imagePath);
const imageBase64 = imageBuffer.toString('base64');

// XML-RPC payload for gravatar.saveData
// Docs: https://gravatar.com/site/implement/xmlrpc/
const xmlPayload = `
<methodCall>
  <methodName>gravatar.saveData</methodName>
  <params>
    <param><value><struct>
      <member><name>data</name><value><base64>${imageBase64}</base64></value></member>
      <member><name>rating</name><value><int>0</int></value></member>
      <member><name>password</name><value><string>${password}</string></value></member>
      <member><name>email</name><value><string>${email}</string></value></member>
    </struct></value></param>
  </params>
</methodCall>`;

const options = {
  hostname: 'secure.gravatar.com',
  port: 443,
  path: '/xmlrpc?user=' + emailHash,
  method: 'POST',
  headers: {
    'Content-Type': 'text/xml',
    'Content-Length': Buffer.byteLength(xmlPayload)
  }
};

console.log('Connecting to secure.gravatar.com...');

const req = https.request(options, (res) => {
  console.log(`Status Code: ${res.statusCode}`);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    if (res.statusCode === 200 && !data.includes('faultCode')) {
      console.log('Success! Avatar uploaded. It may take a few minutes to appear.');
      // The response usually contains the userimage URL or ID
      console.log('Response:', data);
    } else {
      console.error('Failed to upload avatar.');
      console.error('Response:', data);
    }
  });
});

req.on('error', (e) => {
  console.error(`Problem with request: ${e.message}`);
  if (e.message.includes('ETIMEDOUT') || e.message.includes('ECONNREFUSED')) {
    console.error('这可能是因为网络连接被阻断。尝试使用 VPN 或代理。');
  }
});

req.write(xmlPayload);
req.end();
