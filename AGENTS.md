# Agent instructions

## Keep the prompt history up to date

`site/prompt-history.html` is a public page that records every prompt the
owner has given an AI agent in this repository. After **every** user prompt,
before you finish your turn, add that prompt to the page and commit it along
with the rest of the turn's work (or in its own commit if the turn changed
nothing else).

- **Group by conversation.** Each conversation (session) is one
  `<section class="conversation">`. If the current conversation already has a
  section, append to its `<ol class="prompts">`; otherwise add a new section
  at the bottom, after the last one.
- **Section heading:** a short title for the conversation, then a `.meta` line
  with the date (YYYY-MM-DD), the agent, and a link to the session if you have
  one, e.g. `Claude Code (web) · 2026-10-12 · <a href="…">session</a>`.
- **Agent:** name the agent and where it ran, such as `Claude Code (web)`,
  `Claude Code (Android app)`, `Claude Code (CLI)`, `Codex`, `Cursor`. If a
  single prompt ran on a different agent from the rest of its conversation,
  add `<span class="agent">…</span>` to that prompt's `<li>`.
- **Prompt text:** copy it verbatim, only HTML-escaped (`&`, `<`, `>`). Keep
  line breaks; the page uses `white-space: pre-wrap`. Leave out tool output,
  system messages and anything the user did not type. Never include secrets,
  tokens or personal contact details; replace them with `[redacted]`.
- Each prompt is
  `<li><time datetime="ISO-8601">HH:MM UTC</time><p>…prompt…</p></li>`.
- Keep the rest of the page as it is. Don't add a prompt twice.
