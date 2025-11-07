Jobs & Applications - Product Spec (Team Lead Edition)

Audience: product-leaning team lead + devs who already speak “wpkernel”.
Assumption: WPKernel is finished and standard at your company. This doc is product-first, WP-native, and simply references wpk artefacts where useful.

⸻

0. Summary
   • Goal: A careers site and lightweight hiring workflow inside WordPress.
   • Public outcomes: Browse jobs, filter/search, view a job, submit an application (with CV), get confirmation.
   • Internal outcomes: Manage jobs, triage applications across stages, email applicants on changes, basic reporting.

Non-goals (v1): HRIS sync, interview scheduling, complex approvals, agency portals.

⸻

1. Content model (WordPress-first)

1.1 Custom Post Types

| CPT         | Visibility                       | Statuses                                          | Notes                                                                  |
| ----------- | -------------------------------- | ------------------------------------------------- | ---------------------------------------------------------------------- |
| job         | Public                           | draft, publish, closed                            | closed = stops listing & sitemap; keep detail URL for SEO/history.     |
| application | Private (no front-end permalink) | new, screening, interview, offer, hired, rejected | Custom post statuses (not tax). Supports revision notes & audit trail. |

Kernel: back this with resources job and application. The CPTs are system of record; don’t invent tables unless needed later.

1.2 Taxonomies

| Taxonomy                  | For | Behaviour                                     |
| ------------------------- | --- | --------------------------------------------- |
| department (hierarchical) | job | Filters on listing; visible on detail.        |
| location (flat)           | job | String locations; consider normalising later. |
| seniority (flat)          | job | e.g. Junior, Mid, Senior, Lead.               |
| job_type (flat)           | job | Full-time, Contract, Internship, etc.         |

1.3 Meta fields

| CPT         | Field                  | Type                        | Purpose                                 |
| ----------- | ---------------------- | --------------------------- | --------------------------------------- |
| job         | salary_min, salary_max | int                         | Display ranges and filter.              |
| job         | apply_deadline         | date                        | Hide/list rules & schema.               |
| job         | remote_policy          | enum: on-site/remote/hybrid | Pill on listing/detail.                 |
| application | name, email, phone     | string                      | Required on form.                       |
| application | cv_media_id            | int (attachment)            | Private upload; 10MB cap; pdf/doc/docx. |
| application | answers                | JSON                        | Form questions (free text).             |
| application | source                 | enum: site/referral/agency  | Reporting.                              |

Kernel bindings expose job meta to blocks; application meta never renders publicly.

⸻

2. Pages & blocks (site structure)

2.1 Public
• /jobs - Jobs listing
• Core blocks: Heading, Search, Buttons, Query Loop.
• Filters (department, location, job_type, seniority) as block controls.
• Sort: Recent first; optional salary/closing date.
• Pagination (cursor or classic).
• SEO: indexable.
• /jobs/{slug} - Job detail
• Title, meta pills (location, job_type, salary range), description.
• Apply CTA opens embedded form (same page) or /apply/{job} anchor.
• SEO: JSON-LD JobPosting; remove from listing when closed, keep page indexable with validThrough.
• /thanks - Application confirmation
• Friendly message, next steps.

2.2 Admin
• Jobs (WP list table)
• Columns: Title, Department, Location, Status, Updated.
• Quick actions: Publish/Close, Duplicate.
• Bulk: Close, Move department.
• Applications (Pipeline board)
• Columns = post statuses (new → hired/rejected).
• Card: applicant name/email, source, applied date, badges (stage SLA).
• Detail pane: CV preview/download, answers, notes, timeline.
• Actions: Move stage, email template send, assign to reviewer.
• Settings
• Stages (reorder labels → maps to statuses).
• Application form fields (toggle optional questions).
• Email templates (acknowledgement, stage changes).
• Privacy & retention (auto-purge schedule).

Kernel: views are blocks + bindings; pipeline is an admin surface. Actions drive writes; jobs handle slow work.

⸻

3. Permissions & roles

| Role           | Capabilities                                                                   |
| -------------- | ------------------------------------------------------------------------------ |
| Hiring Manager | create/edit/publish/close job; read all application; move stages; send emails. |
| Recruiter      | read job; full application access; move stages; edit notes; send emails.       |
| Reviewer       | read job; read application limited; comment only.                              |
| Applicant      | Public (no account).                                                           |

Map to custom caps manage_jobs, review_applications. Keep simple; refine later if needed.

⸻

4. Application form (front-end)
   • Fields: name*, email*, phone, CV\*, cover letter (textarea), checkbox “I consent to data processing”.
   • Validation: client & server.
   • Anti-spam: honeypot + time-to-submit threshold; reCAPTCHA optional.
   • Rate-limit: max 3 submissions / 24h per email/IP.
   • Uploads: pdf/doc/docx only, 10MB limit; virus scan hook; store as private media.
   • Outcome: on success → thank-you page + email acknowledgement.

Kernel: fire application.created event for integrations; queue ParseResume job if enabled.

⸻

5. Emails & notifications
   • Applicant:
   • Acknowledgement (immediate).
   • Stage change updates (optional per stage).
   • Internal:
   • New application → notify assigned recruiter (email, optional Slack).
   • Daily digest to Hiring Manager (count by stage, overdue SLAs).

Templates are editable in Settings; variables: {job_title}, {applicant_name}, {stage}, {link_to_card}.

⸻

6. Reporting (lightweight)
   • Dashboard widgets:
   • Applications by stage (last 30 days).
   • Time-to-hire median (last quarter).
   • Source breakdown.
   • Export CSV (jobs, applications with selected fields).
   • Optional: Google Analytics / Matomo events for Apply start/submit.

⸻

7. SEO & content rules
   • Include job CPT in XML sitemaps.
   • Remove jobs from listing when closed. Keep detail page with validThrough in JSON-LD.
   • Titles: {Role} - {Department} - {Location}.
   • Canonical to the job permalink.
   • Open Graph: title + first paragraph of description.
   • Multilingual (if required): one job per locale; link with translation plugin.

⸻

8. Privacy, security, compliance
   • Consent checkbox mandatory with link to privacy policy.
   • Retention: auto-purge rejected applications after 180 days (configurable).
   • Right to access/delete: export/delete a single application (admin).
   • Mask PII in logs; never email raw CVs-send links with expiring tokens.
   • PDPA/GDPR: Data Processing Addendum note in Settings.

⸻

9. Performance & accessibility
   • Listing TTI ≤ 1.2s on mid-tier mobile; Core Web Vitals green.
   • Admin pipeline virtualised for > 200 cards.
   • A11y: keyboardable drag (arrow move), focus states, ARIA live for uploads and stage changes.
   • Images lazy-load; prefetch next/prev page.

⸻

10. Integrations (v1 hooks)
    • Slack channel message on application.created (optional).
    • Webhook out on application.statusChanged (JSON payload).
    • Zapier/Make ready: copy endpoint URL + secret in Settings.

Kernel: this is just event wiring and a webhook toggle; no deep coupling.

⸻

11. Settings (single admin screen)
    • Company defaults (logo for emails, reply-to address).
    • Form fields on/off; custom question labels.
    • Stages (rename/reorder).
    • Email toggles & templates.
    • Retention period (days).
    • Integrations (webhook URL & secret, Slack webhook).
    • Upload policy (allowed types, max size).

⸻

12. Migration & import
    • CSV import for jobs (title, description, department, location, salary, status).
    • Import existing applications (CSV + file folder) - optional utility for agencies.

⸻

13. Roadmap (just the product slices)
    1.  Public discovery - listing + detail + basic SEO.
    2.  Apply flow - form, uploads, confirmation + acknowledgement email.
    3.  Internal triage - pipeline, detail pane, notes, move stage.
    4.  Emails & digests - stage templates, daily summary.
    5.  Reporting & export - dashboards + CSV.
    6.  Privacy & retention - purge + export/delete.
    7.  Integrations - Slack + webhook; later HRIS.

Each slice ships fully usable end-to-end.

⸻

14. Definition of Done (E2E)

Public
• /jobs shows filters working (dept/location/job_type/seniority) with deep-linked URLs.
• /jobs/{slug} renders title/meta without JS; JSON-LD JobPosting passes Rich Results test.
• Application form validates client+server; CV uploads (10MB) show progress; on success user reaches /thanks and receives email within 60s.

Admin
• Jobs list: publish/close, duplicate, bulk close.
• Pipeline: drag card between stages updates status immediately; keyboard move works; errors show an admin notice and revert.
• Detail pane: shows CV (preview or download), answers, notes, timeline; send stage email.
• Settings: changing stages updates pipeline columns instantly; templates save and apply.

Reporting & privacy
• Dashboard widgets show counts & median time-to-hire.
• CSV export downloads within 5s for 5k rows.
• Auto-purge removes rejected > retention days (dry-run preview) and logs summary.
• Single application export/delete available to admins.

Integrations
• Slack message posts on new application when enabled.
• Webhook receives JSON payload on stage changes, with retry on failure.

Budgets
• CLS < 0.1; LCP ≤ 2.5s on listing & detail.
• No PII in error logs; attachments require auth and expire tokens.

⸻

15. Acceptance test stories (concise)
    1.  Candidate applies: From listing → detail → submit with CV → sees thanks + gets email.
    2.  Manager triages: Opens pipeline → moves to interview → sends email → sees event in timeline.
    3.  SEO: New job appears in sitemap; closing job removes it from listing; JSON-LD valid.
    4.  Privacy: 181-day-old rejected applications purged by scheduler; report emailed to admin.
    5.  Integration: Stage change fires webhook; 500 response retries up to 3 times.

⸻

16. Notes & trade-offs
    • Applications as CPT keeps admin UX, revisions, and export tooling. If volume becomes very large, we can move to a table model later (v2), keeping REST contracts stable.
    • Custom statuses (not taxonomies) make pipeline semantics clear and align with WP UI patterns.
    • Keep filters to taxonomies for performance and editor UX.

⸻

TL;DR for the team
• Create job and application CPTs, with the taxonomies/fields above.
• Build the listing, detail, and apply pages using core blocks + bindings; the admin gets a list + pipeline.
• Emails, reporting, retention, and integrations round out the product.
• Ship in vertical slices; each slice must pass its E2E and meet the budgets.
