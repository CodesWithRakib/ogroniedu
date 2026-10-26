# OgroniEdu — Funnel & Retention Mathematical Definitions

## 1. Funnel Conversion & Drop-Off Equations

For any multi-stage sequential funnel where $S_i$ represents the count of unique occurrences at stage $i$:

### 1.1 Conversion Rate from Previous Stage

$$ \text{ConversionRate}_{i} = \begin{cases}
100.0\% & \text{if } i = 1 \\
\frac{S_i}{S_{i-1}} \times 100 & \text{if } i > 1 \text{ and } S_{i-1} > 0 \\
0.0\% & \text{if } S_{i-1} = 0
\end{cases}$$

### 1.2 Stage Drop-Off Rate
$$\text{DropOffRate}_{i} = \begin{cases}
0.0\% & \text{if } i = 1 \\
\max(0.0, 100.0 - \text{ConversionRate}_{i}) & \text{if } i > 1
\end{cases}$$

### 1.3 Overall Funnel Conversion Rate
$$\text{OverallConversionRate}_{i} = \begin{cases}
\frac{S_i}{S_1} \times 100 & \text{if } S_1 > 0 \\
0.0\% & \text{if } S_1 = 0
\end{cases}$$

---

## 2. Zero-Result Search Calculation

Measures the proportion of tutor searches that yielded zero active tutors:

$$\text{ZeroResultRate} = \begin{cases}
\frac{\text{ZeroResultSearches}}{\text{TotalSearches}} \times 100 & \text{if } \text{TotalSearches} > 0 \\
0.0\% & \text{if } \text{TotalSearches} = 0
\end{cases}$$

*Interpretation:* A zero-result search rate exceeding 15% in a specific district (e.g. Sylhet Sadar or Rajshahi) signals supply shortage in that locality, guiding tutor recruitment marketing.

---

## 3. Cohort Retention Mathematical Definition

Retention measures whether learners return to book additional lessons or repeat sessions over time.

### 3.1 Repeat Learner Retention Rate
Given a cohort of unique learners $L$ who completed at least one booking within the time window:

$$\text{RetentionRate} = \frac{| \{ l \in L \mid \text{BookingCount}(l) \ge 2 \} |}{|L|} \times 100$$

### 3.2 Loyal Learner Rate
$$\text{LoyalRate} = \frac{| \{ l \in L \mid \text{BookingCount}(l) \ge 3 \} |}{|L|} \times 100$$

### 3.3 Zero Denominator Invariant
If $|L| = 0$, both $\text{RetentionRate} = 0.0\%$ and $\text{LoyalRate} = 0.0\%$.

---

## 4. Learning Engagement Attendance Equation

Attendance evaluates confirmed session reliability, distinguishing verified completions from student or tutor no-shows:

$$\text{AttendanceRate} = \begin{cases}
\frac{\text{CompletedSessions}}{\text{CompletedSessions} + \text{NoShowSessions}} \times 100 & \text{if } (\text{Completed} + \text{NoShow}) > 0 \\
0.0\% & \text{otherwise}
\end{cases}$$

Cancelled sessions (rescheduled or cancelled with notice) are excluded from the attendance denominator and tracked separately under `SessionCancellationRate`.

---

## 5. Temporal Boundaries & Timezone Standards

1. **Standard Timezone:** All database queries utilize UTC timestamps with explicit boundary filtering: `created_at BETWEEN $1 AND $2`.
2. **Display Timezone:** Customer-facing dashboards present dates converted to **Bangladesh Standard Time (BST, UTC+6)**.
3. **Temporal Inversion Guard:** The `resolveTimeBounds()` utility verifies that `startDate <= endDate`. If an inverted range is supplied, the API throws `BadRequestException` to prevent negative duration calculations.
$$
