---
name: review-slack-thread
description: Review a Slack thread using slack-thread-extract — pull down messages, process screenshots and media, and summarize the conversation. Use when the user shares a Slack URL and wants to review it, says "review this slack thread", "pull down this thread", "extract this slack thread", "what's this thread about", or asks to use the slack thread extractor on a link.
argument-hint: "<slack-thread-url>"
---

# Review Slack Thread

Extract a Slack thread, process any attached media (screenshots, videos), and present a clear summary. This is a **read and summarize** workflow — no codebase investigation, no work items.

$ARGUMENTS

## Step 1: Extract

The argument should contain a Slack URL matching `https://*.slack.com/archives/*/p*`. If no URL is provided, ask the user for one.

1. Run `slack-thread-extract <url>`. Note the output directory path.
2. If the output directory contains a `media/` folder with files, run `process-media <output-dir>` (the parent directory containing `media/`) to generate AI descriptions of images and videos.
3. Read `transcript.md` from the output directory.
4. If `process-media` ran, read any generated description files in `media/` to understand screenshots and videos.

## Step 2: Summarize

Read the full transcript and media descriptions, then present:

**Thread Summary**
- **Channel / participants / date**
- **Topic**: One-sentence summary of what the thread is about

**What Was Discussed**: Narrative summary of the conversation — who said what, what was shared, how it progressed. Reference media where relevant.

**Key Takeaways**: Bullet list of the important points.

**Action Items**: Any explicit asks, requests, or next steps. "None identified" if none.

**Open Questions**: Anything unresolved. "None" if none.

## Done

After presenting the summary, stop. Ask the user if they want to do anything further — triage it, file a work item, dig into the codebase, etc. Do not assume a next step.
