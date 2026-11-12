/* Projects. Source: projects.html (all eight write-ups).

   To add a project, append an object here. The Project Garage builds one
   display bay per entry and the panels render from the same data, so no 3D
   code needs to change.

   Optional fields:
     image  - preview image path, relative to the page like every other
              asset link (for example 'assets/images/projects/kaifit.webp').
              When absent, a poster is generated from the project's name,
              kind and accent colour.
     github - repository URL. Shown only when present.
     live   - live demo URL. Shown only when present.
   None of the current projects publish a repository or demo (client work),
   so those fields are intentionally left out rather than invented. */

export const projects = [
  {
    id: 'hrms',
    name: 'Enterprise HRMS',
    kind: 'HR platform, US and China',
    meta: 'Maxaix, 2024. HR platform for an enterprise client in the US and China.',
    accent: '#ff5a1f',
    description: "A full HR platform running an enterprise client's workforce across the US and China: employee lifecycle, org hierarchy, payroll sync and real-time multilingual operations for thousands of employees.",
    highlights: [
      'Full employee lifecycle: profiles, life events and documents, with validated bulk CSV and Excel import and export for both regions.',
      'SAML2 single sign-on with granular roles for US HR, China HR and managers.',
      'TriNet API integration for payroll and benefits sync, plus Radford job codes and compensation history.',
      'Azure Translator provides live English and Chinese translation across announcements, FAQs and news.',
      'Real-time notifications and HR task workflows over Socket.io, with scheduled syncing and reminders.',
      '60+ Eloquent models, with Redis-backed queues for bulk operations at scale.',
    ],
    stack: ['Laravel 11', 'PHP 8.2', 'MySQL', 'Redis', 'Socket.io', 'SAML2', 'TriNet API', 'Azure Translator', 'Vite'],
    page: 'projects.html#proj-hrms',
  },
  {
    id: 'chatbot',
    name: 'AI Enterprise Chatbot',
    kind: 'Document intelligence',
    meta: 'Maxaix, 2024. Multi-tenant document assistant.',
    accent: '#3f8fd8',
    description: "A multi-tenant RAG assistant that ingests a company's documents into a vector database and answers questions with grounded, cited responses, wired into the cloud storage and CRM tools teams already use.",
    highlights: [
      'Retrieval over LangChain and OpenAI, with reranking, query rewriting and streamed responses for real-time chat.',
      'An ingestion pipeline for PDF, Excel, CSV, DOCX and PPTX that converts files to Markdown before embedding.',
      'A Milvus vector store for sub-second semantic search, with bulk ingest and delete APIs.',
      'Async processing with Celery and Redis, so large uploads never block the interface.',
      'Tenant isolation plus eight integrations: Google Drive, OneDrive, Dropbox, Salesforce, Wealthbox, Redtail, Gmail and Outlook.',
      'A Laravel front end and FastAPI back end on PostgreSQL, deployed with Docker and Nginx.',
    ],
    stack: ['Laravel', 'FastAPI', 'Python', 'OpenAI', 'LangChain', 'Milvus', 'PostgreSQL', 'Celery', 'Redis', 'Docker'],
    page: 'projects.html#proj-chatbot',
  },
  {
    id: 'sendmepls',
    name: 'SendMePls',
    kind: 'Real-time logistics',
    meta: 'Maxaix, 2024. Real-time delivery and shopping platform.',
    accent: '#2f9f8f',
    description: 'An end-to-end delivery and shopping platform. Customers place multi-shop orders, agents are onboarded and assigned, and everything is tracked live with in-app calls, messages and built-in payments.',
    highlights: [
      'Real-time order tracking and status events over Laravel Reverb websockets with Pusher and Echo.',
      'Agent onboarding with document verification, vehicle assignment and exportable reports.',
      'A payments engine: PayCentral card allocation and loading, Ozow bank payouts and automated refunds.',
      'Agora video and audio calls, Twilio SMS and FCM push connecting agents and customers.',
      'Multi-shop shopping orders with VAT, discount and budget logic and approval flows.',
      '100+ models, Redis queues and AES encryption, with PM2 and Workerman managing processes and sockets.',
    ],
    stack: ['Laravel 12', 'MySQL', 'Redis', 'Reverb', 'Pusher', 'Agora', 'Twilio', 'PayCentral', 'Ozow', 'FCM'],
    page: 'projects.html#proj-sendmepls',
  },
  {
    id: 'kaifit',
    name: 'KaiFit',
    kind: 'Subscription SaaS',
    meta: 'Maxaix, 2024. Subscription SaaS and mobile back end.',
    accent: '#d9463e',
    description: 'The back end and admin platform behind a consumer fitness app: subscriptions, food and exercise logging, restaurant discovery and a full marketing analytics console.',
    highlights: [
      'REST APIs for mobile: OTP and social sign-in with Google and Apple, food and exercise logging, and health sync.',
      'RevenueCat subscriptions through secure webhooks, with promo codes and entitlement handling.',
      'Google Places restaurant search, menus and QR-based food logging, with FCM push notifications.',
      'An admin panel for users, content, lead campaigns and CSV analytics exports.',
      'A 70+ table schema with Sanctum auth and queued emails and notifications.',
    ],
    stack: ['Laravel', 'MySQL', 'Sanctum', 'RevenueCat', 'Google Places', 'FCM', 'Canny', 'Make.com'],
    page: 'projects.html#proj-kaifit',
  },
  {
    id: 'globaltimesheet',
    name: 'Global Time Sheet',
    kind: 'Multi-tenant HRMS',
    meta: '2023 to 2024. Multi-tenant HRMS.',
    accent: '#7a6fd0',
    description: 'A production-ready multi-tenant HRMS covering payroll, attendance, leave and timesheets, with each organisation fully isolated in its own database.',
    highlights: [
      'True multi-tenancy with a separate database per organisation, domain routing and plan-based limits.',
      'Payroll generation with inline component editing, loss of pay, bonuses and advances, plus NEFT and RTGS bank-file export.',
      'Day and night shift attendance generated automatically by scheduled commands twice a day.',
      'Leave accrual and carry-forward rules, and project timesheets with approval workflows.',
      'Role-based access with Spatie Permission, audit trails, salary versioning and Excel, CSV and PDF exports.',
    ],
    stack: ['Laravel 12', 'MySQL', 'Stancl Tenancy', 'Sanctum', 'Spatie Permission', 'PhpSpreadsheet', 'GeoIP'],
    page: 'projects.html#proj-globaltimesheet',
  },
  {
    id: 'fedx',
    name: 'FedX tax reconciliation',
    kind: 'Fintech, payroll tax',
    meta: '2023 to 2024. Fintech, payroll tax.',
    accent: '#c9962a',
    description: 'A payroll-tax reconciliation system that ingests huge payroll spreadsheets, calculates state taxes by region and produces compliance-ready PDF declarations.',
    highlights: [
      'Handles Excel uploads up to 500 MB through async queue processing, so heavy files never time out.',
      'A configurable tax engine with rates by region, denomination and cost centre, each with its own validity period.',
      'Aggregates by personnel number and cost centre, and handles retroactive payroll adjustments.',
      'DomPDF tax declarations, with filtering, search and pagination across large datasets.',
      'Admin, editor and user roles, with soft deletes that keep the full history.',
    ],
    stack: ['Laravel 12', 'PHP 8.2', 'MySQL', 'Box/Spout', 'DomPDF', 'Laravel Queues', 'Carbon'],
    page: 'projects.html#proj-fedx',
  },
  {
    id: 'maxmrj',
    name: 'MaxMRJ',
    kind: 'Healthcare referrals',
    meta: 'Web Techno, 2022 to 2024. Healthcare referral platform.',
    accent: '#3aa3b8',
    description: 'A role-based healthcare platform that connects hospital discharge planners with post-acute care providers, making patient referrals from hospital to home faster.',
    highlights: [
      'A React 18, Redux and Material UI app with roles for admins, discharge planners, providers and provider users.',
      'Two-way referrals with accept and decline workflows, status tracking and PDF reports.',
      'PointClickCare OAuth for patient and EHR import, and dynamic survey forms with AI-generated summaries.',
      'Calendar scheduling, task templates and bundled patient referrals across 150+ APIs.',
      'AWS file storage, Google Maps, JWT auth and idle-timeout sessions, deployed with Docker and Nginx.',
    ],
    stack: ['React 18', 'Redux', 'Material UI', 'Axios', 'AWS', 'Google Maps', 'Docker', 'Nginx'],
    page: 'projects.html#proj-maxmrj',
  },
  {
    id: 'bic',
    name: 'BIC industrial catalog',
    kind: 'B2B e-commerce',
    meta: 'Web Techno, 2022 to 2024. B2B e-commerce catalog.',
    accent: '#8a9a4a',
    description: 'A B2B digital catalog for an industrial parts company: hierarchical product browsing for customers and a complete admin panel for managing inventory.',
    highlights: [
      'A hierarchical catalog from category to subcategory, brand model and product, with part numbers and OE references.',
      'AJAX load-more pagination, category and brand filters, and search in a responsive Tailwind interface.',
      'A secure admin panel with full product management, validated image uploads and contact-form mail.',
      'A clean relational schema with migrations and seeders for fast onboarding.',
    ],
    stack: ['Laravel 11', 'PHP 8.2', 'MySQL', 'Tailwind CSS', 'Vite', 'Blade'],
    page: 'projects.html#proj-bic',
  },
];

export const findProject = id => projects.find(p => p.id === id);
