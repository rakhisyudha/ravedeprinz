'use client';

import { useEffect, useState } from 'react';

const welcomeMessages = {
  night: {
    openings: [
      'Hey Rakhis, the evening is quiet',
      'Rakhis, the night is soft tonight',
      'Welcome back, Rakhis',
      'Rakhis, the world feels slower today',
      'It is quiet again, Rakhis',
    ],
    middles: [
      'is there something you left unsaid',
      'are you carrying something from today',
      'have you given yourself a moment to rest',
      'what has been on your mind',
      'are you listening to the quiet',
    ],
    endings: [
      'let it be enough for tonight.',
      'some things can wait until morning.',
      'you do not have to hurry.',
      'stay a little. Breathe.',
      'leave the rest for tomorrow.',
    ],
  },
  memory: {
    openings: [
      'Rakhis, some days feel strangely familiar',
      'Welcome back, Rakhis. Time has a way of circling back',
      'Rakhis, there are things the years never quite take',
      'Some things still feel close, Rakhis',
      'Rakhis, the past has a quiet way of returning',
    ],
    middles: [
      'do you remember what brought you here',
      'is there something you still carry',
      'what remains when everything else moves on',
      'do you remember how this once felt',
      'is there something you have not quite let go of',
    ],
    endings: [
      'some things are better left remembered.',
      'not everything needs to be forgotten.',
      'you can keep it, even if you let it go.',
      'some memories can simply stay.',
      'let the past rest where it belongs.',
    ],
  },
  rain: {
    openings: [
      'Rakhis, the rain has been here for a while',
      'The rain makes everything a little quieter, Rakhis',
      'Welcome back, Rakhis. It feels like rain tonight',
      'Rakhis, the windows are quiet tonight',
      'There is something gentle about the rain, Rakhis',
    ],
    middles: [
      'is there something you have been thinking about',
      'are you carrying a little too much today',
      'have you found a moment for yourself',
      'what has stayed with you today',
      'is there somewhere your thoughts keep returning',
    ],
    endings: [
      'let the rain take some of it with it.',
      'you can leave some things for another day.',
      'nothing needs to be settled tonight.',
      'for now, just let the world be quiet.',
      'the rest can wait.',
    ],
  },
  time: {
    openings: [
      'Rakhis, another day is almost gone',
      'The hours have passed quietly, Rakhis',
      'Welcome back, Rakhis. Another day has found its way here',
      'Rakhis, time seems to move differently tonight',
      'The day is slowly becoming yesterday, Rakhis',
    ],
    middles: [
      'do you remember what mattered today',
      'is there something you wish had gone differently',
      'what are you taking with you from today',
      'did you leave anything unfinished',
      'have you made peace with how today went',
    ],
    endings: [
      'tomorrow can carry the rest.',
      'today has done enough.',
      'some things can wait.',
      'you do not have to carry it all forward.',
      'let today become yesterday.',
    ],
  },
  silence: {
    openings: [
      'Rakhis, everything feels a little quieter tonight',
      'There is a certain quiet to tonight, Rakhis',
      'Welcome back, Rakhis. The noise has finally settled',
      'Rakhis, the silence feels different tonight',
      'For a moment, everything is still, Rakhis',
    ],
    middles: [
      'is there something the quiet is reminding you of',
      'what do you hear when everything else fades',
      'is there something you have been avoiding',
      'have you listened to yourself lately',
      'what has been sitting quietly in your mind',
    ],
    endings: [
      'you do not have to fill the silence.',
      'let the quiet stay a little longer.',
      'some answers can arrive slowly.',
      'it is okay to leave some things unanswered.',
      'for now, silence is enough.',
    ],
  },
  light: {
    openings: [
      'Rakhis, the light is fading gently',
      'The last bit of daylight is almost gone, Rakhis',
      'Welcome back, Rakhis. The room feels softer tonight',
      'Rakhis, evening has settled in slowly',
      'The day is letting go of its light, Rakhis',
    ],
    middles: [
      'is there something you are still holding onto',
      'what are you not ready to let go of',
      'is there something worth keeping close',
      'do you remember what once gave you light',
      'what are you hoping to find tomorrow',
    ],
    endings: [
      'some things can wait for the morning light.',
      'not everything has to fade tonight.',
      'keep what matters close.',
      'morning will bring its own kind of light.',
      'for now, let the evening be enough.',
    ],
  },
};

const recentMessages: string[] = [];
const MAX_RECENT_MESSAGES = 10;

function randomItem<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function generateWelcomeMessage(): string {
  let message: string;

  do {
    const motifs = Object.keys(welcomeMessages) as Array<keyof typeof welcomeMessages>;
    const motif = randomItem(motifs);
    const pool = welcomeMessages[motif];

    const opening = randomItem(pool.openings);
    const middle = randomItem(pool.middles);
    const ending = randomItem(pool.endings);

    message = `${opening}. ${middle}? ${ending}`;
  } while (recentMessages.includes(message));

  recentMessages.push(message);

  if (recentMessages.length > MAX_RECENT_MESSAGES) {
    recentMessages.shift();
  }

  return message;
}

export default function AdminWelcome() {
  const [text, setText] = useState('');

  useEffect(() => {
    setText(generateWelcomeMessage());
  }, []);

  if (!text) return null;

  return (
    <div className="admin-welcome cut-small" role="status" aria-live="polite">
      <p className="admin-welcome-text">{text}</p>
    </div>
  );
}
