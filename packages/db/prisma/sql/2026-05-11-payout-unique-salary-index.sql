CREATE UNIQUE INDEX IF NOT EXISTS "payout_unique_salary_per_month"
  ON "Payout" ("organizationId", "memberUserId", "periodMonth")
  WHERE "kind" = 'SALARY';
