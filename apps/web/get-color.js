const fs = require('fs');
const svg = fs.readFileSync('c:\\Users\\Lucky Bhoir\\interview-platform\\apps\\web\\public\\branding\\logo-full.svg', 'utf8');
const match = svg.match(/data:image\/png;base64,([^"]+)/);
if (match) {
  const base64 = match[1];
  const buffer = Buffer.from(base64, 'base64');
  fs.writeFileSync('temp-logo.png', buffer);
  console.log('Saved temp-logo.png');
} else {
  console.log('No base64 found');
}
