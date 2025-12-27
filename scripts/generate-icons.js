// Simple script to create placeholder icons
// In production, you'd use a proper icon generator

import { writeFileSync } from 'fs';

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

// Create a simple SVG for each size
sizes.forEach(size => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#007AFF"/>
      <stop offset="100%" style="stop-color:#AF52DE"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${size * 0.2}" fill="url(#bg)"/>
  <text x="50%" y="55%" font-size="${size * 0.5}" text-anchor="middle" fill="white">📚</text>
</svg>`;
  
  writeFileSync(`public/icons/icon-${size}.svg`, svg);
  console.log(`Created icon-${size}.svg`);
});

console.log('Icons generated! Convert to PNG using an online tool or imagemagick.');