// generate_wav_stubs.js
// Creates 12 short silent WAV files (1s) for vendor_week1..vendor_week12.wav

const fs = require('fs');
const path = require('path');

const outDir = path.join(__dirname, '..', 'data', 'uploads');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

function writeSilenceWav(filePath, seconds = 1, sampleRate = 16000){
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = sampleRate * numChannels * bitsPerSample / 8;
  const blockAlign = numChannels * bitsPerSample / 8;
  const numSamples = seconds * sampleRate;
  const dataSize = numSamples * numChannels * bitsPerSample / 8;
  const chunkSize = 36 + dataSize;

  const buffer = Buffer.alloc(44 + dataSize);
  let offset = 0;
  // RIFF header
  buffer.write('RIFF', offset); offset += 4;
  buffer.writeUInt32LE(chunkSize, offset); offset += 4;
  buffer.write('WAVE', offset); offset += 4;
  // fmt subchunk
  buffer.write('fmt ', offset); offset += 4;
  buffer.writeUInt32LE(16, offset); offset += 4; // subchunk1Size
  buffer.writeUInt16LE(1, offset); offset += 2; // PCM format
  buffer.writeUInt16LE(numChannels, offset); offset += 2;
  buffer.writeUInt32LE(sampleRate, offset); offset += 4;
  buffer.writeUInt32LE(byteRate, offset); offset += 4;
  buffer.writeUInt16LE(blockAlign, offset); offset += 2;
  buffer.writeUInt16LE(bitsPerSample, offset); offset += 2;
  // data subchunk
  buffer.write('data', offset); offset += 4;
  buffer.writeUInt32LE(dataSize, offset); offset += 4;
  // silence: leave as zeros

  fs.writeFileSync(filePath, buffer);
}

for (let i=1;i<=12;i++){
  const name = `vendor_week${i}.wav`;
  const p = path.join(outDir, name);
  writeSilenceWav(p, 1, 16000);
  console.log('Wrote', p);
}

console.log('Done generating wav stubs');
