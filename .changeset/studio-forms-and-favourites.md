---
'@loopstack/loopstack-studio': patch
---

Three things Studio got wrong on its own pages, each fixed where it was caused.

- A form of exactly two fields puts them side by side only when both are compact inputs. A block — rendered
  Markdown, a folded Markdown section, a code view, a text area, a picker — takes the whole width, so a card
  made of a text and its folded detail no longer squeezes both into half a column.
- A widget can mark a field as required on top of the schema: what the document can be stored without is
  one thing, what the user has to supply before the card's actions accept it is another, and a gate filled
  in over several passes needs the second without the first.
- The sidebar's favourites filter sends `isFavourite` as a boolean, which is what the API's filter schema
  accepts; it was sent as a string and refused, and the list stayed empty. The hook that builds the request
  now takes the contract's filter type, so the mismatch cannot come back.
- The fleet board's memos depend on two fixed arrays folded through `useQueries`' `combine` instead of on a
  dependency list that grew with the number of workspaces, which React flagged on every load.
