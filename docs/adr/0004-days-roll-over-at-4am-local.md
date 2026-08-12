# Days roll over at 4am local time

A Day runs 4am to 4am, not midnight to midnight. Late-night snacking is a core case for this tracker, and under a midnight boundary an 11pm biscuit either lands on the wrong Day or forces someone to open the site before midnight to beat the clock.

Ratings are stored against a local calendar date, never a UTC timestamp. Storing UTC would silently shift history when either Player travels, breaking Streaks that were never actually broken.

This is recorded because both choices look like bugs to a reader who assumes midnight and UTC are the sensible defaults. They are deliberate — do not "fix" them.
