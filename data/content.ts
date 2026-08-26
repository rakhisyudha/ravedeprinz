export type Project = {
  title: string;
  type: 'FINISHED' | 'IN PROGRESS' | 'SHELVED';
  year: string;
  desc: string;
  stack: string;
  accent: 'cyan' | 'gold' | 'muted';
  image?: string;
  link?: string;
  github?: string;
};

export const projects: Project[] = [
  {
    title: 'Simple Portfolio',
    type: 'FINISHED',
    year: '2021',
    desc: 'My first portfolio website, made from simple HTML, CSS, and JS. This website gave me so much experience, especially when working with responsive layouts.',
    stack: 'HTML · CSS · JavaScript',
    accent: 'cyan',
    image: 'portfolio',
    link: 'https://rakhisdeyudha.netlify.app/',
    github: 'https://github.com/rakhisyudha/Rakhis_Portfolio',
  },
  {
    title: 'Pakis Hills',
    type: 'FINISHED',
    year: '2022',
    desc: 'A landing page for Pakis Hills. This project helped me become more careful with responsive layouts and CSS.',
    stack: 'HTML · CSS · JavaScript',
    accent: 'cyan',
    image: 'pakis',
    link: 'https://rakhis-pakis.netlify.app/',
    github: 'https://github.com/rakhisyudha/PakisHillss',
  },
  {
    title: 'Outbound Design',
    type: 'FINISHED',
    year: '2022',
    desc: 'A promotional landing page for an outbound/training program, built and deployed as a static site.',
    stack: 'HTML · CSS · JavaScript',
    accent: 'cyan',
    image: 'outbound',
    link: 'https://rakhis-outbound.netlify.app/',
    github: 'https://github.com/rakhisyudha/OutboundDesign',
  },
  {
    title: 'Web Auction',
    type: 'FINISHED',
    year: '2022',
    desc: 'A school project built as an auction platform with CodeIgniter and MySQL. It works locally but has not been deployed.',
    stack: 'PHP · CodeIgniter · MySQL',
    accent: 'muted',
    image: 'auction',
    github: 'https://github.com/rakhisyudha/WebLelang',
  },
  {
    title: 'Currency Converter',
    type: 'FINISHED',
    year: '2022',
    desc: 'A small currency converter built as practice with simple frontend code and very few dependencies.',
    stack: 'HTML · CSS · JavaScript',
    accent: 'cyan',
    image: 'convert',
    link: 'https://currcov.netlify.app/',
    github: 'https://github.com/rakhisyudha/Converter_Currency',
  },
  {
    title: 'Quiz App',
    type: 'FINISHED',
    year: '2023',
    desc: 'A mobile quiz application and my first serious attempt at designing an interface for a phone screen.',
    stack: 'Mobile App',
    accent: 'cyan',
    image: 'quiz-portrait',
    link: 'https://appetize.io/app/b_oaujsptwwlpygbcgwucebwj43u?device=pixel7&osVersion=13.0&toolbar=true',
    github: 'https://github.com/rakhisyudha/quiz_app',
  },
  {
    title: 'Online Wedding Invitation',
    type: 'FINISHED',
    year: '2023',
    desc: 'A digital wedding invitation built with Next.js, Tailwind CSS, and Framer Motion. It has responsive layouts, search-friendly pages, and a SendGrid contact form. It was deployed on Vercel and used by real guests.',
    stack: 'Next.js · Tailwind · Framer Motion · SendGrid',
    accent: 'gold',
    image: 'wedding',
    link: 'https://weddinganidarahmat.vercel.app/',
    github: 'https://github.com/rakhisyudha/WeddingApp',
  },
  {
    title: 'Online Marketplace',
    type: 'FINISHED',
    year: '2023',
    desc: 'A full-stack marketplace built with React, Express, and MongoDB. It includes client-side routing, data fetching, a CRUD API, JWT authentication, and Google Analytics. The frontend runs on Vercel and the backend runs on Railway.',
    stack: 'React · Express · MongoDB',
    accent: 'gold',
    image: 'market',
    link: 'https://online-web-shop-one.vercel.app/',
    github: 'https://github.com/rakhisyudha/online_marketplace_kel2',
  },
];

export type Role = {
  date: string;
  role: string;
  company: string;
  companyLink?: string;
  location?: string;
  desc: string;
  stack: string;
};

export const work: Role[] = [
  {
    date: 'MAR 2026 — AUG 2026',
    role: 'Backend Intern',
    company: 'Radius Data Solusi',
    desc: 'Built a CRM platform from scratch with Go and Gin. It manages sales pipelines, deals, and customer relationships. I worked on role-based access, email notifications, Google Drive integration, and a drag-and-drop Kanban board. The work covered database design, API structure, authentication, and frontend integration.',
    stack: 'Go · Gin · PostgreSQL',
  },
  {
    date: 'JUL 2022 — OCT 2022',
    role: 'Frontend Intern',
    company: 'CV Sinang Permata',
    location: 'Megamendung, Bogor, Indonesia',
    desc: 'Converted Figma designs into HTML and learned how a real team uses Git and GitLab. I improved my CSS and responsive design skills, helped lead part of the team, and completed the internship with a certificate.',
    stack: 'HTML · CSS · Figma · Git',
  },
];

export type EducationItem = {
  type: string;
  time: string;
  place: string;
  info: string;
};

export const education: EducationItem[] = [
  {
    type: 'Bachelor of Science in Computer Science',
    time: '2024 — 2028',
    place: 'Binus Online Learning',
    info: 'Relevant coursework: Algoritma & Pemrograman, Kalkulus, Pengembangan Perangkat Lunak, Logika, Database Design, Computer Security, Computer Networks.',
  },
  {
    type: 'Major of Software Engineering',
    time: '2020 — 2023',
    place: 'Caringin, Bogor Regency, Indonesia',
    info: 'Built a foundation in HTML, CSS, JS, MySQL, Pascal, and PHP, working with CodeIgniter. Delivered a team project (library management system) and a solo project (auction platform), both graded well. Learned the waterfall SDLC end to end.',
  },
  {
    type: 'Data Analytics Bootcamp',
    time: 'JUN 2022',
    place: 'RevoU',
    info: 'Completed a bootcamp covering Big Data Value, Predictive Analytics, Perspective Analytics, and the Data Analytics Cycle, and received the certificate.',
  },
];

export type SkillCategory = { category: string; skills: string[] };

export const skills: SkillCategory[] = [
  { category: 'Frontend', skills: ['React', 'Vue.js', 'JavaScript', 'HTML5', 'CSS3', 'Tailwind CSS'] },
  { category: 'Backend', skills: ['Node.js', 'Express.js', 'PHP', 'Laravel', 'Go', 'Gin'] },
  { category: 'Database', skills: ['MySQL', 'PostgreSQL', 'MongoDB', 'Redis'] },
  { category: 'DevOps', skills: ['Docker', 'Jenkins', 'Nginx', 'WireGuard', 'Git'] },
];

export const notes = [
  { date: '18.02.25', title: 'Small systems, strong opinions', tag: 'BUILDING', text: 'The best tools I use are not feature-rich. They make one important decision easier.' },
  { date: '02.01.25', title: 'Notes from a year of shipping', tag: 'REFLECTION', text: 'A few rules that survived the move from tutorials to production: name the failure mode first.' },
  { date: '11.11.24', title: 'The useful friction of a blank page', tag: 'PROCESS', text: 'Starting with constraints is not a compromise. It is a way to make the work legible.' },
];
