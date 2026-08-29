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
      'Rakhis, another day has quietly ended',
      'The night does not ask anything of you, Rakhis',
      'Rakhis, everyone else has gone to sleep',
    ],
    middles: [
      'is there something you left unsaid',
      'are you carrying something from today',
      'have you given yourself a moment to rest',
      'what has been on your mind',
      'are you listening to the quiet',
      'did today ask more of you than you had',
      'is there someone you should have called',
      'what would you have done differently, if you had known',
      'have you let yourself feel what today actually felt like',
    ],
    endings: [
      'let it be enough for tonight.',
      'some things can wait until morning.',
      'you do not have to hurry.',
      'stay a little. Breathe.',
      'leave the rest for tomorrow.',
      'no one gets every day back, but you have this one.',
      'you will not remember most of today. remember this part.',
      'rest is not the same as giving up.',
    ],
    depths: [
      'you will not get this exact night again. that is alright.',
      'most days pass unremembered. this does not make them wasted.',
      'the ones who matter do not need you to be finished becoming yourself.',
    ],
  },
  memory: {
    openings: [
      'Rakhis, some days feel strangely familiar',
      'Welcome back, Rakhis. Time has a way of circling back',
      'Rakhis, there are things the years never quite take',
      'Some things still feel close, Rakhis',
      'Rakhis, the past has a quiet way of returning',
      'Rakhis, something today reminded you of someone',
      'Rakhis, not everyone you have loved is still here',
    ],
    middles: [
      'do you remember what brought you here',
      'is there something you still carry',
      'what remains when everything else moves on',
      'do you remember how this once felt',
      'is there something you have not quite let go of',
      'who do you think of, when it gets this quiet',
      'what did someone teach you, without meaning to',
      'is there a version of you that only existed because of them',
    ],
    endings: [
      'some things are better left remembered.',
      'not everything needs to be forgotten.',
      'you can keep it, even if you let it go.',
      'some memories can simply stay.',
      'let the past rest where it belongs.',
      'grief does not mean you are still stuck. it means it mattered.',
      'they shaped you. that does not end when they are gone.',
      'carrying someone forward is its own kind of keeping them alive.',
    ],
    depths: [
      'loss does not close a door so much as leave it open, quietly.',
      'you do not get over some people. you build around them.',
      'what someone leaves in you outlasts what they leave behind.',
    ],
  },
  rain: {
    openings: [
      'Rakhis, the rain has been here for a while',
      'The rain makes everything a little quieter, Rakhis',
      'Welcome back, Rakhis. It feels like rain tonight',
      'Rakhis, the windows are quiet tonight',
      'There is something gentle about the rain, Rakhis',
      'Rakhis, even the rain sounds tired tonight',
    ],
    middles: [
      'is there something you have been thinking about',
      'are you carrying a little too much today',
      'have you found a moment for yourself',
      'what has stayed with you today',
      'is there somewhere your thoughts keep returning',
      'what would you say, if no one else could hear',
      'what are you afraid of losing',
    ],
    endings: [
      'let the rain take some of it with it.',
      'you can leave some things for another day.',
      'nothing needs to be settled tonight.',
      'for now, just let the world be quiet.',
      'the rest can wait.',
      'even storms end quieter than they begin.',
      'you are allowed to not be okay and still keep going.',
    ],
    depths: [
      'some weight is not meant to be put down. only shared.',
      'the ache does not mean something is wrong with you.',
    ],
  },
  time: {
    openings: [
      'Rakhis, another day is almost gone',
      'The hours have passed quietly, Rakhis',
      'Welcome back, Rakhis. Another day has found its way here',
      'Rakhis, time seems to move differently tonight',
      'The day is slowly becoming yesterday, Rakhis',
      'Rakhis, another page has turned',
      'Rakhis, you will not get today back',
    ],
    middles: [
      'do you remember what mattered today',
      'is there something you wish had gone differently',
      'what are you taking with you from today',
      'did you leave anything unfinished',
      'have you made peace with how today went',
      'if today were the last, would it be enough',
      'what did you spend today on',
      'did you tell anyone what they meant to you',
    ],
    endings: [
      'tomorrow can carry the rest.',
      'today has done enough.',
      'some things can wait.',
      'you do not have to carry it all forward.',
      'let today become yesterday.',
      'time is short, but it was still yours.',
      'no day is wasted if it was truly lived.',
      'you cannot control how long you have. only what you do with it.',
    ],
    depths: [
      'an ending does not erase what came before it. it defines it.',
      'the point was never to avoid the end. it was to live anyway.',
      'meaning is not measured in how long something lasted.',
    ],
  },
  silence: {
    openings: [
      'Rakhis, everything feels a little quieter tonight',
      'There is a certain quiet to tonight, Rakhis',
      'Welcome back, Rakhis. The noise has finally settled',
      'Rakhis, the silence feels different tonight',
      'For a moment, everything is still, Rakhis',
      'Rakhis, even the world seems to be holding its breath',
    ],
    middles: [
      'is there something the quiet is reminding you of',
      'what do you hear when everything else fades',
      'is there something you have been avoiding',
      'have you listened to yourself lately',
      'what has been sitting quietly in your mind',
      'what would you ask, if silence could answer',
      'what are you pretending not to know',
    ],
    endings: [
      'you do not have to fill the silence.',
      'let the quiet stay a little longer.',
      'some answers can arrive slowly.',
      'it is okay to leave some things unanswered.',
      'for now, silence is enough.',
      'not every question needs an answer tonight.',
      'sometimes the quiet is just asking you to notice you are still here.',
    ],
    depths: [
      'being afraid of the end is not the same as wasting your life.',
      'the silence does not want an answer. it wants your honesty.',
    ],
  },
  light: {
    openings: [
      'Rakhis, the light is fading gently',
      'The last bit of daylight is almost gone, Rakhis',
      'Welcome back, Rakhis. The room feels softer tonight',
      'Rakhis, evening has settled in slowly',
      'The day is letting go of its light, Rakhis',
      'Rakhis, the sky is choosing its colors for the night',
    ],
    middles: [
      'is there something you are still holding onto',
      'what are you not ready to let go of',
      'is there something worth keeping close',
      'do you remember what once gave you light',
      'what are you hoping to find tomorrow',
      'what still feels worth reaching for',
      'who still makes the days feel worth showing up for',
    ],
    endings: [
      'some things can wait for the morning light.',
      'not everything has to fade tonight.',
      'keep what matters close.',
      'morning will bring its own kind of light.',
      'for now, let the evening be enough.',
      'even brief things are allowed to matter completely.',
      'what fades does not become worthless. it becomes memory.',
    ],
    depths: [
      'nothing has to last forever to have been worth having.',
      'the people who show up for you now are the ones worth keeping close.',
    ],
  },
};

const recentMessages: string[] = [];
const MAX_RECENT_MESSAGES = 12;
const DEPTH_CHANCE = 0.4;

function randomItem<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function isNightWindow(): boolean {
  // 19:00 - 03:00 GMT+7  →  12:00 - 20:00 UTC same calendar day
  // Compute hour in GMT+7 from UTC
  const now = new Date();
  const hourGMT7 = (now.getUTCHours() + 7) % 24;
  return hourGMT7 >= 19 || hourGMT7 < 3;
}

function generateWelcomeMessage(): string {
  let message: string;

  do {
    const allMotifs = Object.keys(welcomeMessages) as Array<keyof typeof welcomeMessages>;
    const availableMotifs = allMotifs.filter((m) => m !== 'night' || isNightWindow());
    const motifs = availableMotifs.length ? availableMotifs : allMotifs;

    const motif = randomItem(motifs);
    const pool = welcomeMessages[motif];

    const opening = randomItem(pool.openings);
    const middle = randomItem(pool.middles);
    const ending = randomItem(pool.endings);

    message = `${opening}. ${middle}? ${ending}`;

    if (pool.depths && Math.random() < DEPTH_CHANCE) {
      const depth = randomItem(pool.depths);
      message += ` ...${depth}`;
    }
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
