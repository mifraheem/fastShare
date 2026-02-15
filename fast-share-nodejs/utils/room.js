/**
 * Generate a random human-friendly room name (2-3 words).
 */

const adjectives = [
  'quick', 'silent', 'bright', 'calm', 'brave', 'fresh', 'cool', 'smart', 'lucky', 'wild',
  'mellow', 'gentle', 'rapid', 'steady', 'bold', 'neat', 'clear', 'gold', 'nova', 'happy'
];

const nouns = [
  'river', 'forest', 'cloud', 'stone', 'bridge', 'signal', 'comet', 'shadow', 'ember', 'ocean',
  'eagle', 'tiger', 'lantern', 'window', 'island', 'valley', 'rocket', 'circle', 'pulse', 'spark'
];

function title(s) {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

function generateRoomName() {
  const words = Math.random() < 0.3 ? 3 : 2;
  const a = adjectives[Math.floor(Math.random() * adjectives.length)];
  const n = nouns[Math.floor(Math.random() * nouns.length)];

  if (words === 2) {
    return title(a) + ' ' + title(n);
  }
  const a2 = adjectives[Math.floor(Math.random() * adjectives.length)];
  return title(a) + ' ' + title(a2) + ' ' + title(n);
}

module.exports = { generateRoomName };
