/**
 * One entry of an issue's `issue_field_values`, as the REST API returns it.
 *
 * Issue fields are GitHub's own typed fields on an issue, defined by the organization. A single select
 * arrives as an option object; everything else arrives as a plain `value`.
 */
export interface RestIssueFieldValue {
  issue_field_name?: string;
  value?: unknown;
  single_select_option?: { name?: string } | null;
}

/**
 * The issue field values an issue carries, by field name, a single select as its option name. A value that is
 * neither text nor a number is left out, because there is no one way to render it.
 */
export function issueFieldValues(values: RestIssueFieldValue[] | null | undefined): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const entry of values ?? []) {
    const value = entry.single_select_option?.name ?? entry.value;
    if (!entry.issue_field_name || (typeof value !== 'string' && typeof value !== 'number')) continue;
    fields[entry.issue_field_name] = String(value);
  }
  return fields;
}
