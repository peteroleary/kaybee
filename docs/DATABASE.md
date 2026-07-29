# We3 Database Architecture

## Firestore Structure

workspaces/{workspaceId}
├── boards/{boardId}
│   ├── lists/{listId}
│   │   └── cards/{cardId}
├── goals/{goalId}
├── threads/{threadId}
└── runs/{runId}


## Collection Definitions

* **`workspaces`**: Top-level tenant isolation container[cite: 2].
* **`boards`**: Individual workflow canvases containing ordered columns[cite: 1, 2].
* **`cards`**: The core execution unit containing title, payload, assigned agent, eligibility status, and feed-forward data[cite: 1, 2].
* **`runs`**: Event log tracking autonomous agent executions, token usage, and tool output streams[cite: 2].