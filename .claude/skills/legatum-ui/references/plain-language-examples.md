# UI: plain language, before and after, enforcement

The 2026-10-17 copy audit's before/after table, how the copy lint enforces the guide, rules.

Moved verbatim from SKILL.md on 2026-11-22 (original order kept). The current rules are in SKILL.md; where this file disagrees with SKILL.md, SKILL.md wins.


**Before and after (2026-10-17 audit, full table in `docs/design/copy-audit-2026-10-17.md`):**

| Before | After |
| --- | --- |
| Each city earns +1 Gold per complete pair of population each turn. | Each city earns +1 Gold a turn for every 2 population. |
| Every 100 Gold held adds +1 Gold per turn, up to +5. | Every 100 Gold in your treasury earns +1 Gold a turn in interest. |
| Settler: Needs population 2; costs 1 pop. | A city needs 2 population to train one, and loses 1 population when it does. |
| An Industry project replaces a city's production for Gold (50% of Production) or Science (25%), rounded down. | A city can run an Industry project instead of building: each turn it turns 50% of its Production into Gold, or 25% into Science. |
| All units, Settlers included, move 1 less (minimum 1). | Every unit, Settlers too, has 1 less move (never fewer than 1). |
| Live: the 2 VP is lost while the treasury is below it. | You lose the VP while your treasury is below 1,000 Gold, and regain it when you are back above. |
| Moving and firing remain mutually exclusive. | A unit can move or fire in a turn, not both. |
| Military units (Scouts excepted) heal only 2 HP a turn. (superseded 2026-11-06: Sparta's slow heal is cut and resting heal is uniform; no such sentence exists now.) | Your military units (not Scouts) heal only 2 HP a turn by resting. (superseded 2026-11-06, same reason) |
| Each level adds 10% base strength. | Each level adds 10% to the unit's strength. |
| (Germany, user 2026-10-17: "is it +3 beyond the Workshop or +1?") The Ruhr Foundry replaces the Forge and gives +6 Production per turn. | Ruhr Foundry: +6 Production (a Forge gives +3). |
| (user: "what is a new building family?") New building families cost 90% Production. (rule cut 2026-11-07; the line no longer exists, the lesson stands) | Your first building of each kind costs 10% less Production (upgrades and Great Works cost the usual price). |
| (user: "what does the 'while it runs' thing even mean?") Drawback: While it runs, the city cannot produce a unit or building. | Removed: it only restated "instead of building" in the ability. The project row has no drawback. |
| Bo's Scout moved 2 hexes to 2 tiles NE of Lugano | Bo's Scout moved 2 tiles, now 2 tiles NE of Lugano |
| (Settle lens hover, user 2026-10-17) "+23 Food, +36 Production from the land within 3 tiles, outer ring at half (Food counts 4, Production 3, Gold 2: +200 points)" | A plain sentence first ("Rich farmland and good Production"), the arithmetic behind Details |
| Each other Japanese city within 5 hexes gives the city +7% Food and +7% Production per turn. | A city gains 7% Food and Production for every other Japanese city within 5 tiles. |
| (user 2026-11-23: "all the other stuff is rules nuance") Thin levies: you can field at most one military unit per city, plus one more. Aircraft count; Scouts don't. Losing a city never disbands units, but you can't raise new ones until you are back under the limit. | Thin levies: you can field at most one military unit per city, plus one more. (The rest is in the Guide.) |
| Corruption cuts all four yields by 10% per tile beyond 4 from the capital. At 14 tiles its Food, Gold and Science reach zero, though Production never falls below 3. | Cities lose 10% of their yields for every tile beyond 4 from your capital. |
| A rival that captures one of your cities gets one free technology (once per city for each rival). | A rival that captures one of your cities gets a free technology. |
| (Fighter card, 133 words) Uses 1 Oil supply while based. Your team sees every tile within 4 tiles of its city. On guard it intercepts ... Recon scouts any tile ... | Guards against air strikes within 4 tiles of its city, or strikes up to 5 tiles away. Uses 1 Oil supply. |

**Enforced:** the copy lint (`app/src/test/copyRules.ts` holds the banned phrases, the glossary synonyms and the sentence limits; one data file, add a row to grow it). `ui/textArtifacts.test.tsx` runs it, with the artifact guard, over every string the game prints from data (faction sheets, goals, the Guide, production and technology text, victory and diplomacy rules, a mock game's turn report), and `ui/copySource.test.ts` runs its phrase rules over string literals in `app/src` and `crates/core/src`. A real exception goes in `EXCEPTIONS` with its reason. The UI reviewer reviews copy on every screen it tours; the `legatum-plain-language-reviewer` reads every changed player string on each PR (gate marker `.progress/plain-review/`).
