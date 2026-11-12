/* Technical skills, grouped the way the Technology Zone is laid out.
   Source: the résumé's skills table and the stacks listed on the project
   pages. `usedIn` holds project ids from projects.js, so every claim links
   back to a published write-up. `shape` picks the 3D display for the group. */

export const skillGroups = [
  {
    id: 'backend',
    name: 'Backend',
    shape: 'rack',
    blurb: 'The core: application logic, APIs, queues and integrations.',
    skills: [
      {
        id: 'php', name: 'PHP',
        detail: 'PHP 8.2 is the language under almost everything here, from 60+ model enterprise platforms to streamed spreadsheet processing.',
        points: ['PHP 8.2 across current projects', 'Streamed reads of Excel files up to 500 MB', 'Queue workers for long-running jobs'],
        usedIn: ['hrms', 'fedx', 'bic'],
      },
      {
        id: 'laravel', name: 'Laravel',
        detail: 'The primary framework. Laravel 11 and 12 for multi-tenant SaaS, REST APIs, real-time systems, queues with Horizon, and payment and identity integrations.',
        points: ['Multi-tenancy with one database per organisation', 'SAML2 single sign-on and role-based access', 'Reverb websockets, queues and scheduled commands', 'Sanctum-secured REST APIs for mobile apps'],
        usedIn: ['hrms', 'sendmepls', 'kaifit', 'globaltimesheet', 'fedx', 'bic', 'chatbot'],
      },
      {
        id: 'python', name: 'Python',
        detail: 'Used for AI services: a FastAPI back end with Celery workers that ingest, embed and retrieve documents.',
        points: ['FastAPI services', 'Celery and Redis for async ingestion', 'LangChain retrieval pipelines'],
        usedIn: ['chatbot'],
      },
    ],
  },
  {
    id: 'frontend',
    name: 'Frontend',
    shape: 'screen',
    blurb: 'Interfaces people use all day.',
    skills: [
      {
        id: 'react', name: 'React',
        detail: 'React 18 with Redux and Material UI for a role-based healthcare referral platform across 150+ APIs.',
        points: ['React 18, Redux, Material UI', 'Role-based apps for four user types', 'Dynamic forms, calendars and PDF reports'],
        usedIn: ['maxmrj'],
      },
      {
        id: 'nextjs', name: 'Next.js',
        detail: 'Part of the day-to-day stack at Maxaix, where enterprise applications are built with Laravel, React and Next.js.',
        points: ['Used alongside Laravel APIs at Maxaix', 'Listed in the résumé under Frontend'],
        usedIn: [],
      },
      {
        id: 'javascript', name: 'JavaScript',
        detail: 'From real-time interfaces over websockets to AJAX-driven catalogs, and this site: a WebGL particle field and this 3D world, written by hand without a framework.',
        points: ['Socket.io, Echo and Pusher clients', 'AJAX filtering and load-more catalogs', 'This portfolio: vanilla ES modules and WebGL'],
        usedIn: ['hrms', 'sendmepls', 'bic'],
      },
    ],
  },
  {
    id: 'data',
    name: 'Data and Cloud',
    shape: 'stack',
    blurb: 'Where the data lives and how it all runs in production.',
    skills: [
      {
        id: 'mysql', name: 'MySQL',
        detail: 'The primary database: schemas from 70+ tables to 100+ models, with per-tenant databases, audit trails and salary versioning.',
        points: ['70+ table schema for a subscription platform', 'One database per organisation for tenant isolation', 'Migrations and seeders for fast onboarding'],
        usedIn: ['hrms', 'sendmepls', 'kaifit', 'globaltimesheet', 'fedx', 'bic'],
      },
      {
        id: 'redis', name: 'Redis',
        detail: 'Queues, caching and real-time plumbing: bulk imports and exports, async document processing and websocket back ends.',
        points: ['Redis-backed queues for bulk operations', 'Layered caching for reads', 'Broker for Celery workers'],
        usedIn: ['hrms', 'chatbot', 'sendmepls'],
      },
      {
        id: 'docker', name: 'Docker',
        detail: 'Applications are containerised and shipped behind Nginx, so what runs in production is what was tested.',
        points: ['Docker and Nginx deployments', 'Supervisor and PM2 for long-running processes'],
        usedIn: ['chatbot', 'maxmrj'],
      },
      {
        id: 'aws', name: 'AWS',
        detail: 'Owns AWS deployments end to end: servers, storage and the Linux and Nginx layer underneath.',
        points: ['End-to-end deployment ownership at Maxaix', 'AWS file storage', 'Linux and Nginx administration'],
        usedIn: ['maxmrj'],
      },
    ],
  },
  {
    id: 'ai',
    name: 'AI',
    shape: 'core',
    blurb: 'AI built in, not bolted on.',
    skills: [
      {
        id: 'llm', name: 'AI / LLM Integration',
        detail: 'Retrieval-augmented generation in production: OpenAI and LangChain over a Milvus vector store, with streamed, cited answers isolated per tenant.',
        points: ['RAG with OpenAI and LangChain', 'Milvus vector search in under a second', 'Ingestion of PDF, Excel, CSV, DOCX and PPTX', 'AI-generated summaries for survey forms'],
        usedIn: ['chatbot', 'maxmrj'],
      },
      {
        id: 'prompt', name: 'Prompt Engineering',
        detail: 'Getting grounded answers out of a model: query rewriting before retrieval, reranking after it, and prompts that make the model cite its sources.',
        points: ['Query rewriting and reranking', 'Source-grounded, cited responses', 'Streamed answers for real-time chat'],
        usedIn: ['chatbot'],
      },
    ],
  },
];

export const allSkills = skillGroups.flatMap(g => g.skills.map(s => ({ ...s, group: g.id, groupName: g.name })));

export const findSkill = id => allSkills.find(s => s.id === id);
