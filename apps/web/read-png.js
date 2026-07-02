const fs = require('fs');
const zlib = require('zlib');

const data = fs.readFileSync('temp-logo.png');
const idatIdx = data.indexOf('IDAT');
if (idatIdx !== -1) {
  const length = data.readUInt32BE(idatIdx - 4);
  const idat = data.slice(idatIdx + 4, idatIdx + 4 + length);
  const unzipped = zlib.unzipSync(idat);
  console.log('First 5 bytes of decompressed IDAT:', unzipped.slice(0, 5));
} else {
  console.log('IDAT not found');
}
