/* Achievements, education and milestones. Source: assets/resume.pdf and the
   published pages. Verified information only: there are no certifications
   on record, so the list is empty and the panel says so. Add entries as
   { name, issuer, year, url? } when there are some. */

export const achievements = [
  {
    title: 'Out of the Box Performance Recognition',
    text: 'Awarded for outstanding performance during early professional career growth.',
  },
];

export const education = [
  { degree: 'Master of Computer Applications', school: 'Lachoo Memorial College, Jodhpur', period: '2022 to 2024' },
  { degree: 'Bachelor of Computer Applications', school: 'Lachoo Memorial College, Jodhpur', period: '2019 to 2022' },
];

export const certifications = [];

export const milestones = [
  { when: '2022', text: 'Joined Web Techno Software as a Laravel developer.' },
  { when: '2022 to 2024', text: 'Grew from developer into a senior, team-facing role.' },
  { when: '2024', text: 'Joined Maxaix as Senior Laravel Full Stack Developer.' },
  { when: '2024', text: 'Led delivery of Enterprise HRMS, KaiFit and the AI Enterprise Chatbot.' },
  { when: 'Today', text: 'Eight production systems shipped across HR, AI, fintech, healthcare and logistics.' },
];
