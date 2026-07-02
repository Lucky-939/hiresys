const fs = require('fs');
const svg = fs.readFileSync('c:\\Users\\Lucky Bhoir\\interview-platform\\apps\\web\\public\\branding\\logo-icon.svg', 'utf8');
const withoutBase64 = svg.replace(/data:image\/png;base64,[^"]+/, 'BASE64_IMAGE');
console.log(withoutBase64);
