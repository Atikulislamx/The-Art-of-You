// Personalize this file. Scene code does not need to change.
export const config = {
  recipient: '',                      // e.g. 'Sam'; blank keeps the keepsake anonymous
  birthdayDate: '',                   // optional ISO date, e.g. '2027-08-24'
  birthdayTitle: 'Happy Birthday',
  wishSubtitle: 'to someone worth celebrating',   // {name} works here and in the letter
  letter: {
    greeting: 'Dear {name},',
    paragraphs: [
      'If I could wrap up a wish for you, it would be this: a year with room for the things that make you feel most like yourself.',
      'I hope it brings good company, small adventures, and the kind of laughter that makes you forget what you were saying. I hope there’s room to rest, too, without feeling that you have to earn it.',
      'I’m glad there’s a day to celebrate you. Take it at your own pace and make a little time for something you love.',
    ],
    closing: 'With warm wishes,',
    signature: 'Someone cheering you on',
  },
  secret: 'May this be the year the quiet things you hope for find their way to you.',
  finale: {
    firstLine: 'Today is yours.',
    accentLine: 'Make it beautiful.',
    birthday: 'Happy Birthday.',
  },
  theme: {
    ivory: '#FFF8F1', peach: '#F4D8CD', 'dusty-rose': '#E5A5B0',
    crimson: '#B83A52', burgundy: '#702F43', gold: '#D6B779', white: '#FFFFFF',
  },
  timing: {
    sceneOut: 240, sceneIn: 640, heartBurst: 925,
    wish: { start: 170, title: 760, rule: 1200, copy: 1400, action: 1690 },
    treeGrowth: 3700,
  },
  animation: {
    maxDpr: 2, heartFloat: 7.5, heartParticles: 105, treePetals: 17,
    treeSeed: 1948,
  },
  audio: {
    enabled: true,
    startOnFirstRelease: true,        // false = only start from the Sound button
    source: './assets/audio/background.mp3',
    volume: 0.56, fadeIn: 1500, fadeOut: 550, loop: true, soundEffects: true,
  },
  features: { share: true, ambientParticles: true },
};
