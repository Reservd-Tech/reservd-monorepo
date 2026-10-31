# QSSF Lite integration planning
- [x] Prepared a mobile Rush Mode integration plan against QSSF Lite’s source and the shared workflow; implementation belongs in the QSSF Lite project.

# Order Management / Production Queue
- [x] Rush Mode incoming item demand, FIFO capacity preview, transactional whole-order bulk acceptance, and sticky stage counts/navigation; corrected stale stage filters on view switching.
- [x] 19 unit tests pass; signed-in UI preview → accept → production verified, totals/payment unchanged, 550×674 stage switching has no horizontal overflow; test fixtures removed.
- [ ] Rush acceptance simultaneous-session/load verification — one concurrent run allowed one commit and rejected the second, but repeated browser runs stalled; full load testing remains unverified.
- [x] Item-level preparation schema + atomic FIFO RPCs (start_item_preparation, mark_item_prepared).
- [x] Order Management page: live metrics, Rush Mode, intake pause, Incoming/Production/Ready views.
- [x] Production queue aggregation with batch actions, urgency, sold-out toggles.
- [x] Aggregation tests (9 pass); verified live: start → ready flow, order auto-ready, intake pause/resume, authorization rejection.
- [ ] Intake pause auto-resume timers (5/10/15 min) — manual pause/resume only; timed resume needs a scheduled job.
- [ ] Test 6 concurrency/duplicate batch actions and Test 8 two-device realtime — not yet exercised end-to-end.

# Food ratings
- [x] Inspect uploaded reservd source: the shop card displays a hardcoded 4.8; no customer food-rating collection, reads or storage are implemented.
- [ ] Show real reservd food ratings in the QSSF OS menu. Blocked: reservd must first collect real dish ratings tied to product IDs.
- [ ] Connect ratings in reservd. Blocked: must be done from reservd's project chat.
- [ ] Verify real ratings and unrated states. Blocked: no implemented customer food-rating source is available yet.
