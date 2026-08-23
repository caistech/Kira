# Inspect Vercel

Perform a READ-ONLY inspection of the Vercel environment.

First determine the available authenticated teams.

Run:

    vercel teams list

Identify:

    Corporate AI Solutions

Then inspect available projects using supported Vercel CLI syntax.

Run:

    vercel project ls

Report:

- authenticated Vercel teams
- Corporate AI Solutions team
- available projects relevant to Kira
- anything that cannot be determined from the CLI

Do not:

- deploy
- link
- modify
- change environment variables
- change domains
- change project settings