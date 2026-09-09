# StockSense refined mockups questions

Date: 2026-09-09
Stage: Refined Mockups
Status: Awaiting answers

The classic lifecycle intentionally skipped rough mockups. These questions establish the interaction direction directly from the approved requirements and user stories. Confirmed constraints already carried forward: React with TypeScript, Vite, Ant Design, English-first UI, role and retailer isolation, explicit loading/empty/error/stale states, and human approval for purchasing actions.

## Q1. Application shell and navigation

StockSense spans planning, purchasing, assistance, and operational evidence. Which primary navigation model should organize these areas?

- A. Role-aware left sidebar with a top retailer/context bar (Recommended) — persistent task areas, visible current retailer, session status, and role-filtered navigation.
- B. Top navigation — more open horizontal space, but fewer visible task areas and weaker support for deep workflows.
- C. Dashboard hub — each area starts from dashboard cards, with less persistent navigation.
- X. Other (please specify)

[Answer]:

## Q2. Default landing experience

The first authenticated screen determines what planners notice first. What should it emphasize?

- A. Exception-focused operations dashboard (Recommended) — shortages, reviews due, open orders, stale/unavailable data, and model health, each linked to action.
- B. Inventory workspace — current stock and movements are the primary landing surface.
- C. Assistant workspace — conversation and suggested actions lead the experience.
- X. Other (please specify)

[Answer]:

## Q3. Data workspace interaction

Inventory, forecasts, recommendations, suppliers, and purchase orders all need dense lists plus inspectable evidence. Which interaction pattern should be the default?

- A. Tables with filters and a right-side detail drawer (Recommended) — preserves list context while progressively revealing evidence and actions.
- B. Tables with dedicated detail pages — more room for complex records, with more navigation between list and detail.
- C. Card grids with modal details — visually lighter, but less efficient for comparison and high-density work.
- X. Other (please specify)

[Answer]:

## Q4. Purchase review workspace

Managers must inspect evidence, approve or reject proposals, cancel eligible orders, and understand partial receipts. Which layout best supports that decision?

- A. Master-detail review queue (Recommended) — proposal/order list beside line items, rationale, audit context, and explicit decision controls.
- B. Step-by-step review wizard — one proposal at a time with a final decision summary.
- C. Separate list and full-page order views — conventional navigation with maximum detail space.
- X. Other (please specify)

[Answer]:

## Q5. Assistant placement

The assistant explains evidence, opens governed views, and prepares actions that still require human confirmation. How should users access it?

- A. Collapsible assistant panel plus a full workspace (Recommended) — contextual help beside any screen, with a dedicated page for longer investigations and history.
- B. Dedicated assistant page only — simpler shell and more space, but weaker in-context assistance.
- C. Embedded prompts inside each workflow only — highly contextual, without a general conversation workspace.
- X. Other (please specify)

[Answer]:

## Q6. Responsive scope

The portfolio demo is expected to run primarily on a development workstation, while reviewers may resize the browser. What responsive behavior should the first release promise?

- A. Full desktop and tablet workflows, with mobile read/review essentials (Recommended) — optimize dense authoring for 1024px and above, retain core status, evidence, and approvals at 360px where safe.
- B. Full desktop and tablet workflows only — document mobile as unsupported for the initial release.
- C. Full functional parity from 360px upward — highest reach, with significantly more design and test scope for dense planning flows.
- X. Other (please specify)

[Answer]:

## Q7. Accessibility target

The approved stories require keyboard operation, visible focus, meaningful labels, text status, and focus recovery. Which conformance target should the design adopt?

- A. WCAG 2.2 Level AA (Recommended) — current AA target, including modern focus and target-size guidance.
- B. WCAG 2.1 Level AA — matches the bundled design guidance while retaining all explicit story obligations.
- C. Explicit story obligations only — narrower formal claim, though less compelling for a portfolio review.
- X. Other (please specify)

[Answer]:

## Q8. Visual direction and information density

The design must feel credible for specialty-retail operations while keeping forecasts and exceptions scannable. Which direction should guide Ant Design tokens and layouts?

- A. Professional analytical (Recommended) — neutral surfaces, restrained blue/teal accents, compact tables, and strong semantic status treatment.
- B. Dense operations console — maximum rows and controls per screen with minimal decorative space.
- C. Retail-friendly dashboard — warmer palette, larger cards, and more visual storytelling at the cost of some density.
- X. Other (please specify)

[Answer]:

## Q9. Charting approach

Forecast comparison, inventory trajectories, and evaluation evidence need accessible charts alongside tabular values. Which library direction should the design map?

- A. Ant Design Charts (Recommended) — close visual alignment with Ant Design and a focused React integration.
- B. Apache ECharts — broader advanced-chart capability with more custom integration work.
- C. No additional chart library initially — use Ant Design statistics, progress components, and accessible tables until implementation validates a chart need.
- X. Other (please specify)

[Answer]:

## Q10. Mockup coverage depth

There are 63 approved stories, including operational and API-focused work that does not need a unique screen. How detailed should this stage make the visual artifacts?

- A. Complete key journeys plus reusable screen/state patterns (Recommended) — mock up every distinct user workflow and map remaining stories to those patterns or to non-UI handling.
- B. One distinct screen or state diagram for every story — maximum explicit coverage with a much larger, repetitive artifact.
- C. Walking-skeleton journey only — deepest detail for import through receipt, deferring later forecast, assistant, and operations UX.
- X. Other (please specify)

[Answer]:
