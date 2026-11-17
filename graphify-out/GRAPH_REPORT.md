# Graph Report - app-mesa-farta  (2026-11-17)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 58 nodes · 103 edges · 10 communities (8 shown, 2 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `5be110e9`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Package Metadata
- Subtitle Cue Rendering
- Frontend App Flow
- Summary Report Formatting
- Summary API Handler
- Highlight Clip Extraction
- SDK and Validation Dependencies
- Repository Info
- Bug Tracker URL
- Test Scripts

## God Nodes (most connected - your core abstractions)
1. `run()` - 10 edges
2. `fmt()` - 8 edges
3. `showSummary()` - 6 edges
4. `makeRenderer()` - 5 edges
5. `cueAt()` - 5 edges
6. `summaryMarkdown()` - 5 edges
7. `transcriptText()` - 5 edges
8. `sendApiError()` - 5 edges
9. `readTranscript()` - 5 edges
10. `@anthropic-ai/sdk` - 5 edges

## Surprising Connections (you probably didn't know these)
- `run()` --calls--> `makeCues()`  [EXTRACTED]
  app.js → cues.js
- `addCard()` --calls--> `fmt()`  [EXTRACTED]
  app.js → report.js
- `run()` --calls--> `fmt()`  [EXTRACTED]
  app.js → report.js
- `handler()` --calls--> `sendApiError()`  [EXTRACTED]
  api/highlights.js → api/_shared.js
- `handler()` --calls--> `readTranscript()`  [EXTRACTED]
  api/summary.js → api/_shared.js

## Import Cycles
- None detected.

## Communities (10 total, 2 thin omitted)

### Community 0 - "Package Metadata"
Cohesion: 0.18
Nodes (10): author, description, homepage, keywords, license, main, name, private (+2 more)

### Community 1 - "Subtitle Cue Rendering"
Cohesion: 0.33
Nodes (5): makeRenderer(), draw(), wrap(), cueAt(), makeCues()

### Community 2 - "Frontend App Flow"
Cohesion: 0.39
Nodes (5): addCard(), api(), decodeAudio(), run(), status()

### Community 3 - "Summary Report Formatting"
Cohesion: 0.62
Nodes (5): el(), showSummary(), fmt(), summaryMarkdown(), transcriptText()

### Community 4 - "Summary API Handler"
Cohesion: 0.53
Nodes (4): client, sendApiError(), handler(), Summary

### Community 5 - "Highlight Clip Extraction"
Cohesion: 0.60
Nodes (4): clampClips(), Clips, handler(), readTranscript()

### Community 6 - "SDK and Validation Dependencies"
Cohesion: 0.40
Nodes (5): dependencies, @anthropic-ai/sdk@^1.8.0, zod@^4.6.7, @anthropic-ai/sdk, zod

### Community 7 - "Repository Info"
Cohesion: 0.67
Nodes (3): repository, type, url

## Knowledge Gaps
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `@anthropic-ai/sdk` connect `SDK and Validation Dependencies` to `Package Metadata`, `Summary API Handler`, `Highlight Clip Extraction`?**
  _High betweenness centrality (0.088) - this node is a cross-community bridge._
- **Why does `zod` connect `SDK and Validation Dependencies` to `Package Metadata`, `Summary API Handler`, `Highlight Clip Extraction`?**
  _High betweenness centrality (0.069) - this node is a cross-community bridge._
- **Why does `repository` connect `Repository Info` to `Package Metadata`?**
  _High betweenness centrality (0.039) - this node is a cross-community bridge._