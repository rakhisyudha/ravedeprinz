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
    desc: 'My first portfolio website, made it from simple html, css, and js. This website gave me so much experience, especially when i work with the responsive.',
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
    desc: 'Made it from CodeIgniter Framework with MySql database, this is my school project, and had it done. Unfortunately, i havent deploy it yet.',
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
    desc: 'A digital wedding invitation site built with Next.js, Tailwind CSS, and Framer Motion. Features SEO-friendly routing, fully responsive design, and integrated email service (SendGrid) for the contact form. Deployed on Vercel and used to invite real guests.',
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
    desc: 'A full-stack marketplace built with React, Express, and MongoDB. Implements React Router for navigation, Axios for data fetching, a RESTful CRUD API for product data, JWT-based login/register, and Google Analytics integration. Frontend deployed to Vercel, backend deployed to Railway.',
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
    date: 'MAR 2026 — SEP 2026',
    role: 'Backend Intern',
    company: 'Radius Data Solusi',
    desc: 'Built a comprehensive CRM platform from scratch using Framework Gin Go that manages sales pipelines, deals, and customer relationships. Implemented enterprise-grade features including role-based access control, email notifications, Google Drive integration, and a drag-and-drop Kanban board. Demonstrated expertise in full-stack development, database design, API architecture, authentication, and modern frontend patterns.',
    stack: 'Go · Gin · PostgreSQL',
  },
  {
    date: 'JUL 2022 — OCT 2022',
    role: 'Frontend Intern',
    company: 'CV Sinang Permata',
    location: 'Megamendung, Bogor, Indonesia',
    desc: 'Converted Figma designs into HTML, learned Git and GitLab workflows, and picked up real project-timing discipline. Sharpened CSS and responsive design skills. This internship is where the passion for coding actually clicked, also led part of the team and earned a completion certificate.',
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
    info: 'Relevant coursework: Algorithm & Programming, Calculus, Object-Oriented Programming, Logic, Database Design, Computer Security, Computer Networks.',
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
    info: 'Completed bootcamp in advanced topics such as Big Data Value, Predictive Analytics, Perspective Analytics, Data Analytics Cycle and got the certificate.',
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
  { date: '25.08.26', title: 'To Grieve Deeply Is to Have Loved Fully', tag: 'REFLECTION', text: 'The culmination of love is grief, and yet we love, despite the inevitable' },
  { date: '02.01.25', title: 'In Pursuit of Great We Failed to Do Good', tag: 'REFLECTION', text: 'The pursuit of greatness often leads us astray from what is truly important.' },
  { date: '05.01.25', title: 'Don\'t cry. You\'re perfect.', tag: 'REFLECTION', text: 'You are enough just as you are.' },
];
