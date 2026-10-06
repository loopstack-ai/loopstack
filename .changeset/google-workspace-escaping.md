---
'@loopstack/google-workspace-module': patch
---

Gmail and Drive tools escape what they put into mail headers, Drive queries and request URLs, and return complete, correctly typed results.

- `gmail_send_message` rejects line breaks in `to`, `cc`, `bcc` and `subject` with a validation error, and
  sends non-ASCII subjects as RFC 2047 encoded-words.
- `gmail_reply_to_message` keeps header values copied from the original message on one line, extends the
  original `References` chain with the parent Message-ID, and recognises an existing `Re:` prefix in any
  letter case.
- `gmail_get_message` with `format: 'minimal'` returns the message with empty headers, body and attachments.
- `google_drive_list_files` escapes quotes and backslashes in `folderId`.
- `google_drive_download_file` applies `exportMimeType` to Google Docs/Sheets/Slides only; other files are
  returned as stored, with their own mime type.
- `google_drive_upload_file` returns the created file's `webViewLink`.
- File and message ids are URL-encoded in request paths.
