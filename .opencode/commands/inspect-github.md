# Inspect GitHub

Perform a READ-ONLY inspection of the Kira GitHub repository.

Repository:

    caistech/Kira

Run:

    git remote get-url origin

    git branch --show-current

    gh auth status

    gh repo view caistech/Kira --json nameWithOwner,visibility,defaultBranchRef

Report:

- GitHub remote
- current local branch
- repository visibility
- default branch
- GitHub authentication status

Do not modify anything.
Do not commit.
Do not push.