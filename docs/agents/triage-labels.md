# Triage Labels

The skills speak in terms of five canonical triage roles. This file maps those roles to the actual label strings used in this repo's issue tracker.

| Label in mattpocock/skills | Label in our tracker | Meaning                                  |
| -------------------------- | -------------------- | ---------------------------------------- |
| `needs-triage`             | `needs triage`       | Maintainer needs to evaluate this issue  |
| `needs-info`               | `needs info`         | Waiting on reporter for more information |
| `ready-for-agent`          | `ready-for-agent`    | Fully specified, ready for an AFK agent  |
| `ready-for-human`          | `ready-for-human`    | Requires human implementation            |
| `wontfix`                  | `wontfix`            | Will not be actioned                     |

When a skill mentions a role (e.g. "apply the AFK-ready triage label"), use the corresponding label string from this table.

`needs triage`, `needs info` and `wontfix` already exist in the repo and use spaces, not hyphens — apply them as written above rather than creating hyphenated duplicates. `ready-for-agent` and `ready-for-human` have no existing equivalent; create them on first use (`gh label create "ready-for-agent" --description "Fully specified, ready for an AFK agent"`).

Edit the right-hand column to match whatever vocabulary you actually use.
