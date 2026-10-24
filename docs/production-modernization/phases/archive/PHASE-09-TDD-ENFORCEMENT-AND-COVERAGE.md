# Phase 9 — TDD Enforcement & Coverage

**Date:** Following Phase 8  
**Duration:** 1 day  
**Owner:** QA Lead / Backend  

---

## Objective

Enforce TDD discipline across the codebase, achieving coverage targets for core modules and resolving remaining gaps.

---

## Scope

| Metric | Before | Target | Action |
|---|---|---|---|
| Auth coverage | ~92% | ≥95% | Add tests for AccountAccessService edge cases |
| Bookings coverage | ~88% | ≥95% | Add tests for expiry sweep, conflict detection |
| Payments coverage | ~89% | ≥95% | Add tests for refund flow, ledger invariants |
| Learning coverage | ~76% | ≥90% | Add tests for assignment lifecycle, grading |
| Trust coverage | ~84% | ≥90% | Add tests for dispute filing, safety report flow |
| Notifications coverage | ~67% | ≥90% | Add tests for dispatch, preferences, real-time fanout |

### Action Items

- **S9.1**: Review existing Istanbul coverage reports per module
- **S9.2**: Identify top 5 test gaps per domain and create missing test suites
- **S9.3**: Prioritize auth + bookings + payments (P0 modules) to reach ≥95%
- **S9.4**: Address learning + trust + notifications gaps to ≥90%
- **S9.5**: Add Playwright retry config for flaky E2E tests; quarantine if unfixable within this sprint
- **S9.6**: Run `pnpm turbo run test:coverage` — generate aggregate report
- **S9.7**: Compare actual coverage vs targets; update task register with remaining gaps
- **S9.8**: Ensure CI pipeline blocks merge if coverage drops below thresholds

---

## Acceptance Criteria

- [ ] Istanbul coverage report generated; all core modules meet or exceed targets
- [ ] CI pipeline enforces coverage thresholds (fail on drop)
- [ ] Flaky E2E tests quarantined or fixed
- [ ] All new unit tests pass; no regressions

---

## Coverage Gate (CI Enforced)

```yaml
# In CI pipeline (GitHub Actions / GitLab CI)
- name: Enforce Coverage Thresholds
  run: |
    if [ "$COVERAGE_AUTH" -lt 95 ] || [ "$COVERAGE_BOOKINGS" -lt 95 ] || [ "$COVERAGE_PAYMENTS" -lt 95 ]; then
      echo "Coverage below P0 threshold!" >&2
      exit 1
    fi
    if [ "$COVERAGE_LEARNING" -lt 90 ] || [ "$COVERAGE_TRUST" -lt 90 ] || [ "$COVERAGE_NOTIFICATIONS" -lt 90 ]; then
      echo "Coverage below P2 threshold!" >&2
      exit 1
    fi
```

---

*End of Phase 9.*