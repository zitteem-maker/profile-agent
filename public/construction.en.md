# How this agent is built

My projects were run internally, on confidential client data: I can't show them. This agent documents them for me. I designed and built it with Claude Code. This page explains what is under the hood, how it is protected and what it doesn't do.

Code repository: https://github.com/zitteem-maker/profile-agent

## The stack, and why

- **A single Cloudflare Worker with Static Assets.** It serves the page (plain HTML, CSS and JavaScript, no framework) and the API under `/api/*`. I chose a Worker over Cloudflare Pages because I needed scheduled tasks and native rate limiting.
- **Cloudflare D1** (SQL database): sessions, questions, answers and flags.
- **Cron Trigger**: daily report in Slack and automatic deletion of old data.
- **Cloudflare Turnstile**: anti-bot check on the entry form, validated server-side.
- **Slack** (incoming webhook): real-time alerts and the morning report.
- **Claude Sonnet 5.5 through the Anthropic API**, with streaming and prompt caching.

**Prompt rather than RAG or fine-tuning.** My validated profile and FAQ are injected in full into the model's context. That volume fits in the context: a RAG would add a search step that can miss the right passage, whereas here the model always has everything in front of it, and every answer traces back to a file I can correct. Fine-tuning was ruled out: the content changes, and I want to edit it in minutes by changing a file.

**Sonnet 5.5 rather than Haiku 4.5.** I started with Claude Haiku 4.5, which is cheaper. On my test suite, it added details that aren't in the profile and applied the redirect and flagging rules inconsistently. On the 33 hardest questions, Claude Sonnet 5.5 passed every check, with no invented fact on manual review. The extra cost is a few cents per session.

## How a question is handled

1. The visitor fills in the form (identity, consent, Turnstile check). The server creates a session and a signed cookie.
2. Each question goes through `/api/chat`. The server increments the counter, then sends the model the prompt, the conversation history and the question. **The visitor's identity is never sent to the model.**
3. The model streams its answer. It can use three tools:
   - `get_overlap`: computes in code the working-hours overlap with a team's city, for today's date, using official time zones (clock changes included);
   - `report_unanswered`: flags a question it can't answer, or a manipulation attempt;
   - the API's web search, reserved for market salary ranges (3 searches at most).
4. The server itself, without the model, adds the invitation to book a call after the 3rd and 6th answers, and the end-of-session message after the 9th.
5. The question and answer are stored. Slack alerts are sent in parallel, without slowing the answer down.

## The agent's rules

- It answers only from my profile and FAQ. It adds no fact, figure, date or name.
- It states limits in the same answer as the matching strength (for example: "Pipedrive migration: contribution, not leadership").
- It corrects a false statement before answering.
- Out of scope, it answers with a fixed message and points to me (Calendly, email, WhatsApp). "Not documented" doesn't mean "no".
- It refuses to change role, reveal its instructions, embellish my profile or give names of clients or colleagues.

## Safeguards

- API key server-side only, never in the browser or in the code.
- 9 questions per session, counted server-side atomically.
- Per-visitor rate limit (5 sessions and 10 questions per minute), based on a fingerprint of the IP address.
- Server-side Turnstile validation, questions capped at 1,000 characters, capped history.
- Signed session cookie that the page's JavaScript can't read; requests from other sites are rejected.
- A stalled model call is cut off after 60 seconds, and the question is then not counted.
- Anthropic's fallback: a question wrongly declined by a safety filter is retried on another model.
- Monthly spending cap set in the Anthropic console.

## Alerts and report

- **‼️ Unanswered question**, with a mention: the question, the reason, the topic, the time and the visitor's declared contact.
- **🚫 Refused request**: manipulation attempt or request for confidential data.
- **🔔 Limit reached**: a recruiter went up to the 9th question.
- **👋 New session.**
- **Daily report** at 7am (Cyprus time): every session, every question asked, and unanswered questions grouped under "To prepare for the interview". Nothing is sent on days without activity.
- **CSV export** of all questions, to prepare an interview.

## Visitor data

- **Stored**: first name, last name, company, job title, email, phone if provided, consent date, questions and answers, and a non-reversible fingerprint of the IP address (the address itself isn't kept).
- **Sent to the model**: only the questions and the conversation history, never the identity or contact details.
- **Retention**: 90 days, then automatic deletion. The "Delete my data" button erases the session immediately.
- **Slack**: notifications contain the identity and the questions. The button doesn't erase them: they are automatically deleted after 90 days, and immediately on request.
- No audience analytics, no cookie other than the session cookie.

## How it is tested

- A test suite asks the agent every question in my FAQ, 15 out-of-scope questions and 10 manipulation attempts. It checks each answer automatically: no internal URL, word-for-word redirect, contact block order, alerts emitted, figures never mixed up, formal address in French. I then review the answers one by one.
- The time zone tool has 25 automated tests: Paris, London, New York, San Francisco and Sydney, before and after each clock change.

## What it doesn't do

- It invents nothing and gives no salary expectation on my behalf.
- It makes no decision and doesn't replace an interview.
- It doesn't verify visitors' identity: it is self-declared.
- It has no access to any client data or internal tool from my assignments.

## Known limits

- An AI model can make mistakes. The rules and tests reduce that risk without removing it.
- No system is immune to every manipulation attempt: the goal is to limit what one could obtain, and there is nothing confidential to extract.
- Some points in my FAQ aren't documented yet: the agent then refers to me.
- Salary ranges found through web search are indicative.
- Measured cost: about 15 to 20 cents per 9-question session.
