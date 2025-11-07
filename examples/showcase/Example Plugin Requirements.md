## How each product feature maps to kernel

### 1) Content model (CPTs, taxonomies, meta) → Resources

- You register job (public) and application (private) as CPTs, plus taxonomies (department, location, etc.) and meta (salary_min/max, answers).
- Kernel “Resource” wrappers point at your versioned REST (/wpk/v1/jobs, /wpk/v1/applications), so the client gets typed clients + stores + caching without boilerplate.
- Outcome: one line to fetch, one line to invalidate, no hand-rolled fetch code.

### 2) Public listing & detail → Bindings + Interactivity

- Listing page uses core blocks (Query Loop, Buttons). Data appears via Block Bindings (e.g., gk:job.title, gk:job.location).
- Filters/search are tiny Interactivity bundles: update filter state → wpk resolvers refetch → list updates.
- Optional server binding renders SEO-critical text (title/summary/JSON-LD) without JS.

### 3) Apply form & uploads → Actions + Interactivity + Upload helper

- The form is a small Interactivity controller that calls an Action (Application.Submit).
- The Action validates policy, posts to REST, emits events, invalidates caches, and uses the kernel’s upload helper for chunked CV files with progress.
- Success and failure are handled consistently via the wpk reporter + notices.

### 4) Admin pipeline (kanban) → Admin mount + store + optimistic updates

- Mount a React app on an admin page (kernel Admin Surface).
- Columns reflect post statuses; cards read from the store. Drag a card → an Action patches status with optimistic UI and auto-revert on error.
- Extend via SlotFill (e.g., “Export CSV” button) without forking the UI.

### 5) Emails & notifications → Actions + Jobs + Events/Bridge

- Stage changes trigger events (wpk.application.statusChanged).
- Email sends either synchronously (simple) or as a Job (SendEmail) with retry/status.
- Want Slack/webhooks? Add a listener to the event, or use the PHP Bridge (wpk.bridge.application.created) for server-side integrations.

### 6) Reporting & export → Selectors + Actions + Job

- Counts/metrics are selectors over the store (fast, memoised).
- CSV export is an Action that kicks a Job to assemble data, returns a signed URL when ready.

### 7) Privacy & retention → Settings + scheduled Job

- Retention (e.g., 180 days) lives in Settings.
- A scheduled Job purges old “rejected” applications and logs a summary. Export/delete for a single applicant is another Action calling REST.

### 8) SEO & sitemaps → Server binding + contracts

- Jobs stay in XML sitemaps via the CPT.
- Server bindings output JobPosting JSON-LD and validThrough when closed; views hydrate the rest client-side.

### 9) Permissions → Policies + REST caps

- UI checks Policies (jobs.manage, applications.review) to show/hide controls.
- Server remains authoritative via REST permission_callback. No double-guessing.

### 10) Extensibility → Events + SlotFill + Bridge

- Everything interesting emits one of the canonical events.
- Third parties add UI with SlotFill, or listen in PHP via the Bridge-no spelunking.

---

## What the team actually writes vs. what they get “for free”

| You write (product)                | Kernel gives you                                    |
| ---------------------------------- | --------------------------------------------------- |
| CPTs/tax/meta + REST routes        | Typed clients, data stores, resolvers, cache keys   |
| A few block bindings               | Editor + front-end data wiring, SSR option for SEO  |
| A handful of Actions               | Error handling, events, cache invalidation, retries |
| Small interactivity controllers    | Declarative behaviour (submit, filters, DnD)        |
| 2-3 Jobs (CV parse, email, export) | Enqueue/status/polling helpers, timeouts            |
| Settings screen                    | Policy gating, notices, persisted config            |
| Optional Slack/webhook listener    | Event bus + PHP Bridge with stable names            |

---

## End-to-end: “Apply” in 7 steps (what happens at runtime)

```
sequenceDiagram
  autonumber
  participant C as Candidate (browser)
  participant V as View (Apply form)
  participant A as Action (Application.Submit)
  participant R as Resource (/applications)
  participant WP as WP REST (caps+schema)
  participant J as Job (ParseResume)
  participant H as Hooks/Bridge

  C->>V: Fill form + upload CV
  V->>A: submit(formData)
  A->>R: POST /wpk/v1/applications
  R->>WP: Validate + save (private CPT)
  WP-->>R: 201 { id, jobId, ... }
  A->>H: emit wpk.application.created
  A->>J: enqueue ParseResume(id)
  A->>V: resolve success + show notice
  J->>WP: parse, attach text/metadata
  H-->>Integrations: Slack/Webhook (optional)
```

No bespoke plumbing: each arrow is a one-liner because the wpk owns the ceremony.

---

## What this means for delivery

- Lower cognitive load: everyone already speaks the kernel’s nouns; product specs map directly to a short list of Resources, Actions, Bindings, Jobs, and Settings.
- Shorter cycles: each slice (listing, apply, pipeline…) is shippable on its own with an E2E proving the path.
- Safer change: versioned REST + typed contracts + standard error/reporting = fewer “it worked on my machine” moments.

If you want, I can turn your current job-site spec into a sprint board with slices (Public discovery → Apply → Pipeline → Emails → Reporting → Privacy → Integrations) and list the exact Resources/Actions/Bindings each slice needs-so the team can start pulling tickets immediately.
