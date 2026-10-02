/**
 * URL-encodes a repository path for the GitHub contents API, segment by segment, so that `/` keeps
 * separating directories while characters such as `#`, `?` and `%` stay part of the file name.
 */
export function encodeContentPath(path: string): string {
  return path.split('/').map(encodeURIComponent).join('/');
}
