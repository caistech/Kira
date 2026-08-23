# Inspect Supabase

Perform a READ-ONLY inspection of Kira's Supabase environment.

Known project:

    Kira

Reference ID:

    kmrskyewwnwettlycpfe

First inspect supported CLI syntax where necessary.

Run:

    supabase projects list

    supabase inspect db --help

Then inspect the linked database using supported commands.

Run:

    supabase inspect db table-stats --linked

Where useful, also inspect:

    supabase inspect db db-stats --linked

    supabase inspect db role-stats --linked

    supabase inspect db locks --linked

    supabase inspect db outliers --linked

Report:

- whether Kira is linked
- linked project reference
- database inspection capabilities
- table statistics
- relevant database observations

Do not:

- link
- push
- pull
- migrate
- reset
- deploy
- write data
- modify schema
- modify secrets