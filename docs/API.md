# We3 API Specification

## Endpoints

### 1. `POST /api/gemini`
Routes prompts and goal decompositions directly to Gemini[cite: 1, 2].

* **Request Body:**
```json
{
  "prompt": "Audit lease compliance for Unit 402",
  "context": { "workspaceId": "ws-123" }
}
Response:

JSON
{
  "status": "success",
  "plan": [
    { "title": "Extract Lease Terms", "agent": "real-estate-underwriter" },
    { "title": "Calculate Compliance Ratio", "agent": "legal-auditor" }
  ]
}
2. POST /api/parse
Parses unstructured documents, web links, or text blobs into structured JSON card schemas[cite: 2].

Request Body:

JSON
{
  "rawText": "[https://listing-site.com/property/1234](https://listing-site.com/property/1234)",
  "targetSchema": "underwriting_input"
}