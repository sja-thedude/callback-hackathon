# Callback

Built with **OpenAI Codex** for streamers and their communities.

[Live demo](https://callback-hackathon.sja-affu765.workers.dev) · [Demo video](https://youtu.be/TRdv1G8JRRQ) · [Source code](https://github.com/sja-thedude/callback-hackathon)

## Inspiration

Stream communities run on shared history. The joke that keeps
coming back. The corner you always die in. The thing chat still
brings up two years later.

That history exists. It's sitting in a clip archive nobody can
search while they're producing a live show. The moment a callback
would land, it's gone, because remembering it takes longer than
the moment lasts.

I wanted to give a stream its own memory.

## What it does

A streamer connects their channel and indexes their own clips.
Callback then sits invisible until it's needed.

It listens to live chat. When several chatters land on something
that matches a moment from the archive, an overlay brings the old
clip back on screen with its date and a line explaining the
connection, and, when chat posting is enabled, the bot posts the original link in chat.

The restraint is as much the product as the retrieval. An
uncertain match is held, not forced. A callback has to clear
confidence, ambiguity, cooldown, duplicate, freshness and
ownership checks before it airs, and the streamer gets a
seven-second veto window for automatic callbacks. Eligible candidates can also be approved manually.

The control panel shows the whole decision: indexing progress,
chat activity, up to three ranked matches, their separation,
and why it aired or didn't.

There's an account-free replay so anyone can try it without
waiting for a stream to go live.

## How I built it

A Cloudflare Worker handles Twitch OAuth, token refresh and Helix
calls. Indexing pulls a channel's clips, verifies ownership,
resolves game categories, and embeds titles and categories with
BGE Small English v1.5. Vectors live in a Durable Object per
studio.

EventSub WebSockets deliver live chat. A rolling 30-second window
is embedded and ranked against the clip vectors by cosine
similarity. Community mode needs three distinct chatters, a score
above threshold, and at least a 0.08 lead over the next-best
clip. Both the threshold and the runner-up margin must pass;
similarity is not treated as a calibrated probability.

The overlay is a transparent page added to OBS as a browser
source, driven over a separate read-only WebSocket. Twitch application
credentials and OAuth tokens are kept out of browser code and API responses.

## How I used Codex

I described the experience I wanted and the production
constraints, and built the project with OpenAI Codex. It scaffolded the frontend and
the Worker, implemented Twitch OAuth and Helix clip indexing,
wrote the EventSub subscription and chat ingestion, and wired
semantic retrieval to the overlay.

It also built the parts that make it safe to put on a live
broadcast: the confidence and ambiguity gates, cooldown and
duplicate checks, account-switch isolation, the persistent veto
queue, and delivery confirmation that only reports success when
Twitch confirms it. It wrote tests for weak matches, foreign
clips, stale candidates, veto cancellation and Twitch backoff,
then drove the deployed app through browser checks at phone and
desktop widths in both themes, configured the real OBS browser
source, and measured its transparency.

## Challenges I ran into

**Score alone is not enough.** The engine checks both similarity
and the gap between the best and second-best clips. Automated
tests verify that weak and ambiguous candidates are held; there
is no measured comparison of the margin against threshold tuning.

**A wrong callback on a live stream is worse than none.** That
reframed the whole project. Most of the engineering went into
reasons not to fire.

**Delivery had to be confirmed, not assumed.** A successful HTTP
response does not by itself prove a chat message was sent. The
bot checks Twitch’s `is_sent` field, with tests for rejected
messages and real EventSub receipt of the live callback links.

**Twitch rate limits.** The index fetches up to 500 clips per
operation. Helix 429 handling and reset-window backoff have
automated coverage; the real demo archive contains eight clips.

## What I learned

Retrieval quality is mostly about what you refuse to return. The
engine uses both an absolute threshold and a relative margin.
The eight demo scenarios pass both checks; broader retrieval
quality has not been measured.

Building for live broadcast is a different discipline from
building for a page. There's no undo in front of an audience, so
automatic airing needs a human-cancellable window.

## Accomplishments

Eight original clips created, indexed and retrieved correctly,
with all eight replay scenarios selecting the intended clip above
threshold and clear of the ambiguity margin. Real live
verification covering sign-in, indexing, EventSub, a held near
miss, veto cancellation, two live callbacks and confirmed bot
delivery. OBS Studio 33.0.1 displaying a live callback with
verified transparency. 34 passing tests.

## About the demo content

Every clip is original content from my own Twitch channel,
sjathedude: original rendered scenes broadcast and clipped through
automation I authorized. Scripted replay chat is based on real clip
titles and is not historical chat. There is no third-party
archive and no fictional clip library. The live takes used a
clearly labelled owner-rehearsal mode rather than simulated
community participation.

## Honest limits

Raid, subscription and category triggers aren't implemented.
Retrieval works from clip metadata, so vague titles limit recall.
Similarity scores are retrieval signals, not calibrated
probabilities. The three-chatter community requirement is covered
by automated tests; the live takes demonstrate owner mode.
Engagement and retention gains are unmeasured.

## What's next

VOD transcription, so retrieval works on what was said rather
than what the clip was titled. Raid and category triggers.
Calibrating the thresholds against real multi-streamer usage.

The demo video’s build segment presents the original request, a
recorded coding action, fresh test output, and verification results
from the actual Codex session export. It is clearly labeled as an
export presentation rather than native chat-application footage.
