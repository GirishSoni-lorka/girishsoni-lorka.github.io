/* Profile. Source: index.html (hero, principles) and assets/resume.pdf. */

export const profile = {
  name: 'Girish Soni',
  title: 'Senior Laravel Full-Stack Developer',
  location: 'Jodhpur, Rajasthan, India',
  status: 'Available for senior and remote roles',
  welcome: 'Welcome. This city is my portfolio: every district holds one part of the story.',
  intro: 'Senior Laravel full-stack engineer. I build the systems businesses run on: enterprise SaaS, AI platforms and the cloud underneath them.',
  summary: 'Senior Laravel Full Stack Developer with 4+ years of experience building SaaS platforms, HRMS systems, healthcare applications, AI-powered solutions and enterprise web applications. Experienced in multi-tenant systems, real-time applications, payment gateway integrations, cloud deployments and AI integrations.',
  statement: "I'm not hired to write code. I'm hired to make products work.",
  facts: [
    { label: 'Experience', value: '4+ years' },
    { label: 'Production systems', value: '8' },
    { label: 'Core', value: 'Laravel, PHP 8.2' },
    { label: 'Runs on', value: 'AWS, Docker, Nginx' },
  ],
  principles: [
    { title: 'Architecture that survives growth', text: 'Tenant isolation, queues, caching and event streams, decided on day one so the product scales without a rewrite on day five hundred.' },
    { title: 'The metric is the point', text: 'Onboarding time, uptime, conversion, cost to serve. I optimise the number the business cares about, not the count of tickets closed.' },
    { title: 'AI built in, not bolted on', text: 'Retrieval pipelines, semantic search and document intelligence, grounded and isolated per tenant. Shipped, not demoed.' },
    { title: 'It has to run at 2am', text: 'Dockerised, deployed on AWS, observable and recoverable. The unglamorous engineering that decides whether a launch becomes a business.' },
  ],
};
