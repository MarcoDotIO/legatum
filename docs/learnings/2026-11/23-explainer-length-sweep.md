# 2026-11-23: a diff-only text reviewer never fixes the text that predates it

The plain-language reviewer (added 2026-11-21) reads only the strings a PR changes, so every card written before it kept its rules nuance. Byzantium's "Thin levies" card (38 words, 3 sentences) shipped that way until the user spotted it. Its blocker threshold (about 30 words or three sentences) also let two-sentence, 28-word headlines through.

What fixed it: a one-off sweep of every explainer surface, the long wording moved to the Guide (faction sheet rows now carry optional `strengthDetail`/`priceDetail`, which the Guide prints instead of the headline), and `app/src/ui/explainerLength.test.ts`, which fails a sheet row, unit, building or technology card, or class note over 25 words, and a sheet row over two sentences. Aircraft cards were the worst (110 to 145 words each); the Guide's Aircraft section already held all of it.

Lesson: when a reviewer gate is added for a style rule, also add a mechanical check over the existing data and sweep once, or the old text stays.
