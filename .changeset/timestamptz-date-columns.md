---
'@loopstack/common': minor
'@loopstack/secrets-module': minor
'@loopstack/remote-client': minor
---

Store every `created_at` / `updated_at` column as `timestamptz`, so timestamps are correct regardless of the
timezones Node and Postgres run in.

On the first start after upgrading, schema synchronization recreates these columns: existing rows' created and
updated times are set to the upgrade time. Hosts that manage the schema themselves (`reuseExistingConnection`)
change the column types to `timestamptz` on their side.
