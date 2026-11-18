# Graph Report - app-mesa-farta  (2026-11-18)

## Corpus Check
- 14 files · ~59,026 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 1 file(s) not represented in the graph (top: (none) 1)

## Summary
- 67 nodes · 109 edges · 10 communities (6 shown, 4 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `71ec530c`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Package Metadata
- Subtitle Cue Rendering
- Frontend App Flow
- markitdown
- highlights.js
- session-start.sh
- Repository Info
- Bug Tracker URL
- Test Scripts

## God Nodes (most connected - your core abstractions)
1. `run()` - 10 edges
2. `fmt()` - 8 edges
3. `showSummary()` - 6 edges
4. `readTranscript()` - 5 edges
5. `sendApiError()` - 5 edges
6. `makeRenderer()` - 5 edges
7. `cueAt()` - 5 edges
8. `@anthropic-ai/sdk` - 5 edges
9. `transcriptText()` - 5 edges
10. `summaryMarkdown()` - 5 edges

## Surprising Connections (you probably didn't know these)
- `run()` --calls--> `makeCues()`  [EXTRACTED]
  app.js → cues.js
- `handler()` --calls--> `readTranscript()`  [EXTRACTED]
  api/highlights.js → api/_shared.js
- `handler()` --calls--> `readTranscript()`  [EXTRACTED]
  api/summary.js → api/_shared.js
- `handler()` --calls--> `sendApiError()`  [EXTRACTED]
  api/highlights.js → api/_shared.js
- `handler()` --calls--> `sendApiError()`  [EXTRACTED]
  api/summary.js → api/_shared.js

## Import Cycles
- None detected.

## Communities (10 total, 4 thin omitted)

### Community 0 - "Package Metadata"
Cohesion: 0.18
Nodes (10): author, description, homepage, keywords, license, main, name, private (+2 more)

### Community 1 - "Subtitle Cue Rendering"
Cohesion: 0.33
Nodes (5): makeRenderer(), draw(), wrap(), cueAt(), makeCues()

### Community 2 - "Frontend App Flow"
Cohesion: 0.31
Nodes (10): addCard(), api(), decodeAudio(), el(), run(), showSummary(), status(), fmt() (+2 more)

### Community 3 - "markitdown"
Cohesion: 0.50
Nodes (3): uvx, markitdown, markitdown-mcp

### Community 4 - "highlights.js"
Cohesion: 0.25
Nodes (13): clampClips(), Clips, handler(), client, readTranscript(), sendApiError(), handler(), Summary (+5 more)

### Community 7 - "Repository Info"
Cohesion: 0.67
Nodes (3): repository, type, url

## Knowledge Gaps
- **3 isolated node(s):** `PATH`, `uvx`, `markitdown-mcp`
  These have ≤1 connection - possible missing edges. (Counts symbols only; 25 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `@anthropic-ai/sdk` connect `highlights.js` to `Package Metadata`?**
  _High betweenness centrality (0.066) - this node is a cross-community bridge._
- **What connects `PATH`, `uvx`, `markitdown-mcp` to the rest of the system?**
  _3 weakly-connected nodes found - possible missing edges._
- **Why does `zod` connect `highlights.js` to `Package Metadata`?**
  _High betweenness centrality (0.052) - this node is a cross-community bridge._
- **Why does `repository` connect `Repository Info` to `Package Metadata`?**
  _High betweenness centrality (0.029) - this node is a cross-community bridge._