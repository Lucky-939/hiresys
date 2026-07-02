async function run() {
  const { Jimp } = require('jimp');
  try {
    const image = await Jimp.read('temp-logo.png');
    console.log('Size:', image.bitmap.width, 'x', image.bitmap.height);
    // Let's sample a few pixels to find the background color
    const p1 = image.getPixelColor(0, 0);
    const p2 = image.getPixelColor(10, 10);
    const p3 = image.getPixelColor(50, 50);
    
    // We need to pad to 8 chars to see it as RRGGBBAA
    const toHex = (num) => num.toString(16).padStart(8, '0');
    
    console.log('Pixel 0,0:', toHex(p1));
    console.log('Pixel 10,10:', toHex(p2));
    console.log('Pixel 50,50:', toHex(p3));
  } catch (err) {
    console.error(err);
  }
}
run();
