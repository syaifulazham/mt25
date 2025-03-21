# Techlympics 2025 System Blueprint

## Database

**Technology**: MySQL with Prisma ORM for robust and type-safe data interactions.\
**Tables**:

- **Users** – Stores user accounts for Organizers, Participants, and Judges, with roles (Admin, Operator, Viewer, Participant, Judge).
- **Contests** – Contest/event details (e.g., theme, category, rules).
- **Schools** – Directory of participating schools.
- **HigherInstitutions** – Directory of participating higher education institutions.
- **Contingents** – Teams or groups with unique identifiers.
- **Submissions** – Records of contest submissions.
- **Judging** – Judges’ evaluations and scoring data.
- **Certificates** – Generated certificates for participants.
- **Results** – Contest results and rankings.
- **Notifications** – Messages and alerts sent to users.
- **Analytics** – Usage metrics and activity logs.
- **Zones** – Reference table for zones.
- **States** – Reference table for states, including associations with zones.

## Backend

**Technology Stack**: Next.js with API Routes for backend functionality.\
**API Design**: REST principles for clear resource separation (contests, users, submissions, etc.).\
**Authentication & Authorization**:

- Organizers use username/password authentication.
- Participants and Judges authenticate via Google OAuth.
- Role-based access control enforced on all endpoints.\
  **Initial Admin Setup**: If no organizer exists, the system creates a default admin.\
  **Data Validation**: Ensures data integrity through schema-based validation.

## Frontend

**Framework**: Next.js for a single-page application with server-side rendering when needed.\
**Routing**: Next.js routing for seamless navigation.\
**State Management**: Uses React Context API or Redux for managing state.\
**Forms & Validation**: Client-side validation ensures correct input.\
**UI & Styling**: Tailwind CSS and Shadcn UI for modern UI components.

## Administrator Panel

**Authentication & Roles**: Username/password login for Admin, Operator, and Viewer roles.\
**Features**:

- **User Management**: Add, edit, remove users with wildcard search.
- **Reference Data Management**: Maintain lists for zones, states, schools, and institutions, with CSV upload support.
- **Contest Management**:
  - Define contest themes (name, code, color, logo, description, backdrop image).
  - Define target groups by age and school level.
  - Configure contests (type, method, accessibility, judging criteria).
  - Set up scorecards for evaluation.
  - Upload contest resources and references.
- **Quiz Management**:
  - Create quiz banks manually or with AI-generated questions.
  - Assemble quizzes from the bank with live leaderboard support.
  - Provide a quiz management dashboard.
- **Event Scheduling**:
  - Set event schedules with details (zone, venue, GPS, backdrop image).
  - Generate unique pages for attendance check-in (QR-code scanning).
  - Upload event photos and generate AI-assisted reports.
- **Participation Management**:
  - View registered teams and approve/reject applications.
  - Update participant/manager details.
- **Judging Management**:
  - Assign jury or AI-based judging methods.
  - View results dashboards with filtering options.
- **Content Publishing**:
  - Post news and announcements with approval workflows.

## Participant Platform

**Authentication**: Google OAuth login.\
**Features**:

- **Team/Contingent Management**:
  - School teams selected from a predefined list; requests required for existing teams.
  - Independent teams can specify Higher Institution or Other.
  - Unique hashcode assigned to each contingent.
- **Participant Registration**:
  - Manual entry or bulk upload via CSV.
  - Initial credentials assigned (IC number as default user ID).
  - Automatic contest registration based on eligibility.
  - Profile updates allowed.
- **Manager Registration**:
  - Ability to oversee teams and approve participation.
- **State-Level Participation**:
  - Create and manage state-level teams.
  - Enforce contest-specific team composition rules.

## Participant Microsite

**Authentication**: Linked to Participation Platform (email, password).\
**Features**:

- Public profile showcasing participant's work and achievements.
- Portfolio of contest entries and results.
- Integration with Moodle for educational content.
- Certificate downloads for completed contests.

## Security

- **HTTPS** enforced across all connections.
- **XSS Prevention** via input sanitization and output encoding.
- **SQL Injection Prevention** with parameterized queries.
- **Rate Limiting** to prevent brute-force attacks.

## Testing

- **Unit Testing** for backend and frontend components.
- **Integration Testing** for API endpoints.
- **End-to-End Testing** simulating real user workflows.
- **Test Automation** using Jest, Mocha, Cypress, or Selenium.

## Deployment

**Containerization**: Docker containers for Next.js frontend and backend.\
**Orchestration**: Kubernetes (K8s) for container management and auto-scaling.\
**Reverse Proxy & Load Balancing**: Nginx/HAProxy for HTTPS termination and traffic distribution.\
**Scalability**:

- Stateless application design for horizontal scaling.
- Auto-scaling policies for cloud deployments.
  **Database Deployment**:
- Cloud: Managed MySQL services (AWS RDS, GCP Cloud SQL, Azure Database for MySQL).
- On-premise: MySQL replication for high availability.
  **CI/CD**:
- Automated builds, tests, and deployments using GitHub Actions or GitLab CI.
  **Security Best Practices**:
- Run containers with least privilege.
- Apply OS and dependency patches regularly.
- Enforce firewall rules restricting database access.
  **Monitoring & Logging**:
- Prometheus and Grafana for metrics.
- Centralized logging (ELK/EFK stack or cloud-based logging services).

---

This deployment strategy ensures Techlympics 2025 is scalable, secure, and maintainable, using Next.js for both frontend and backend functionalities with MySQL as the primary database.

