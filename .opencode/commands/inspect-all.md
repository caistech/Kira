# Inspect Kira Environment

Perform a READ-ONLY environment inspection of the Kira development stack.

Inspect:

1. Local repository
2. GitHub
3. Vercel
4. Supabase
5. Application architecture

## Repository

Run:

    git status

    git branch --show-current

    git remote -v

## GitHub

Run:

    gh auth status

    gh repo view caistech/Kira --json nameWithOwner,visibility,defaultBranchRef

## Vercel

Run:

    vercel teams list

    vercel project ls

Identify:

    Corporate AI Solutions

## Supabase

Run:

    supabase projects list

    supabase inspect db table-stats --linked

## Application

Inspect:

    package.json

    app/

    lib/

    supabase/

Report:

### Repository

- current branch
- remote
- working tree state

### GitHub

- repository
- visibility
- default branch
- authentication

### Vercel

- relevant team
- relevant projects

### Supabase

- linked project
- reference ID
- database inspection results

### Application

- framework
- language
- major dependencies
- major architectural components

Clearly classify observations as:

VERIFIED
INFERRED
UNKNOWN
NOT INSPECTED

Do not modify anything.