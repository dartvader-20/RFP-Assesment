import { GoogleGenAI } from "@google/genai";
import prisma from "../db/prismaClient.js";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

export async function generateStructuredRFP(prompt, userQuery, prevStructuredJson = null) {
  const model = "gemini-2.5-flash"; // FREE, FAST, PERFECT FOR THIS

  // STEP 1: Fetch active vendors from DB
  const vendors = await prisma.vendor.findMany({
    where: { isDeleted: false },
    select: { name: true, vendorType: true },
  });

  // STEP 2: System prompt (your original prompt with no changes)
  const systemPrompt = `
You are an AI assistant that generates and updates structured RFP JSON.
Always return VALID JSON only. No explanations.

=========================
      EXAMPLE INPUT
=========================
"I need to procure laptops and monitors for our new office. 
Budget is $50,000 total. Need delivery within 30 days. 
We need 20 laptops with 16GB RAM and 15 monitors 27-inch. 
Payment terms should be net 30, and we need at least 1 year warranty."

=========================
  EXPECTED JSON OUTPUT
=========================
{
  "title": "Procurement of Laptops and Monitors",
  "description": "Purchase of laptops and monitors for office setup including memory and size specifications.",
  "budget": 50000,
  "deliveryDays": 30,
  "items": [
    {
      "name": "Laptop",
      "quantity": 20,
      "specifications": {
        "ram": "16GB"
      }
    },
    {
      "name": "Monitor",
      "quantity": 15,
      "specifications": {
        "size": "27-inch"
      }
    }
  ],
  "terms": [
    "Payment terms: Net 30",
    "Warranty: Minimum 1 year"
  ],
  "vendorSuggestions": [
    {
      "vendorType": "IT",
      "reason": "Handles laptop and monitor supply.",
      "vendorNames": ["TechWave Solutions", "NextGen IT Solutions", "ByteHardware Inc."]
    }
  ]
}

1. ALWAYS RETURN VALID JSON ONLY. No: text, explanation, or markdown.
2. Currency values (e.g., $50,000, INR 40k, 15k rupees) MUST be converted to pure numbers (e.g., 50000).
3. Delivery time:
   - Convert phrases like "within 1 month", "in 3 weeks", "by next Friday", "ASAP" → numeric days.
   - If unclear, set deliveryDays to null.
4. Items:
   - Extract all products and map them into:
     { "name": "", "quantity": number, "specifications": {} }
   - Include specifications such as RAM, size, color, storage, model, warranty, etc.
   - If quantity missing, set quantity = null.
5. Terms:
   - Convert any business terms (warranty, payment terms, delivery terms) into readable list entries.
6. Title generation:
   - Always generate a clean, short RFP-style title summarizing the procurement.
7. If user provides follow-up queries (e.g., “change budget”, “add 5 more monitors”, “make RAM 32GB”):
   - Only update the relevant fields in the JSON.
   - Preserve all other previous fields.
8. If previous structured JSON is provided, update based on it; do not regenerate fields that the user didn’t modify.
9. Vendor Suggestions:
   - Based on the title, description, items, and domain, generate a list of relevant vendor categories.
   - For each vendorType, include a "vendorNames" array with 1–3 actual vendors from the provided vendor list.
   - Output MUST follow this structure:
     "vendorSuggestions": [
        {
          "vendorType": "IT",
          "reason": "Because the RFP is related to software, hardware, IT equipment, or technology procurement.",
          "vendorNames": ["Vendor A", "Vendor B"]
        }
     ]
   - vendorType MUST match one of the valid enum values:
     ["IT", "FURNITURE", "OFFICE_SUPPLIES", "EQUIPMENT", "LOGISTICS", "OTHER"]

Example expected structure:
{
  "title": "",
  "description": "",
  "budget": 0,
  "deliveryDays": 0,
  "items": [],
  "terms": [],
  "vendorSuggestions": []
}

If previous structured JSON is provided, update only the relevant fields.
If no previous JSON exists, generate a fresh one.
`;

  // STEP 3: Combine content for AI
  const content = `
SYSTEM PROMPT:
${systemPrompt}

USER QUERY:
${userQuery}

PREVIOUS STRUCTURED JSON:
${prevStructuredJson ? JSON.stringify(prevStructuredJson, null, 2) : "None"}

VENDOR LIST:
${JSON.stringify(vendors, null, 2)}
`;

  // STEP 4: Call AI
  const response = await ai.models.generateContent({
    model,
    contents: content,
  });

  // STEP 5: Parse response JSON safely
  try {
    const raw = response.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!raw) throw new Error("AI returned empty response");

    const structured = JSON.parse(raw);

    // Ensure vendorSuggestions array format
    if (structured.vendorSuggestions && Array.isArray(structured.vendorSuggestions)) {
      structured.vendorSuggestions = structured.vendorSuggestions.map((vs) => ({
        reason: vs.reason || "",
        vendorType: vs.vendorType || "OTHER",
        vendorNames: Array.isArray(vs.vendorNames) ? vs.vendorNames : [],
      }));
    }

    return structured;
  } catch (e) {
    console.error("JSON Parsing Failed:", e);
    throw new Error("AI returned invalid JSON");
  }
}

/**
 * Update proposal structured JSON based on vendor reply.
 * It uses the RFP json + vendor email content to produce revised quotation.
 */
export async function updateProposalFromVendorReply(proposalId, vendorMessage, attachmentsText = "") {
  const model = "gemini-2.5-flash";

  // Fetch existing proposal + structured RFP data
  const proposal = await prisma.proposal.findUnique({
    where: { proposalId },
    include: { rfp: true },
  });

  const previous = proposal.structured || proposal.rfp.structured;

  const vendorPrompt = `
You are an AI assistant that extracts vendor proposal details and updates the RFP JSON.

RULES:
1. Always return ONLY valid JSON. Do NOT include any markdown, code fences, backticks, or explanations.
2. Keep all fields from the previous JSON unless the vendor explicitly modifies them.
3. Convert prices to numbers, delivery times to numeric days.
4. Extract all relevant details: item specifications, unit price, total price, delivery commitments, and terms.

INPUTS:
- Original RFP JSON:
${JSON.stringify(previous, null, 2)}

- Vendor reply email text:
${vendorMessage}

- Extracted attachment contents:
${attachmentsText || "No attachments"}

EXPECTED JSON SCHEMA:
{
  "title": "",
  "description": "",
  "budget": number,
  "deliveryDays": number,
  "items": [
    { 
      "name": "", 
      "quantity": number, 
      "unitPrice": number|null, 
      "totalPrice": number|null, 
      "specifications": {} 
    }
  ],
  "terms": [],
  "vendorQuoteSummary": "" // 3–5 line summary of vendor quotation
}

SAMPLE VENDOR EMAIL AND PROCESSING:

Vendor email:
"We are happy to offer the Azure Cloud Migration Service for $98,000 with delivery in 55 days. Post-migration support for 6 months is included."

Processed JSON output:
{
  "title": "Azure Cloud Migration Services for CRM and Internal Tools",
  "description": "Procurement of a certified partner to handle planning, migration, and testing of CRM and internal tools to Microsoft Azure, including post-migration support.",
  "budget": 98000,
  "deliveryDays": 55,
  "items": [
    {
      "name": "Azure Cloud Migration Service",
      "quantity": 1,
      "unitPrice": 98000,
      "totalPrice": 98000,
      "specifications": {
        "scope": "Planning, Migration, Testing",
        "platform": "Microsoft Azure",
        "partnerCertification": "Required"
      }
    }
  ],
  "terms": [
    "Post-migration support for 6 months"
  ],
  "vendorQuoteSummary": "Vendor offers Azure Cloud Migration Service for $98,000 with delivery in 55 days including 6 months post-migration support."
}
`;

  const res = await ai.models.generateContent({
    model,
    contents: vendorPrompt,
  });

  let raw = res.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!raw) throw new Error("AI returned empty response");

  // Strip any code fences or markdown just in case
  raw = raw.replace(/```json|```/gi, "").trim();

  let updatedStructured;
  try {
    updatedStructured = JSON.parse(raw);
  } catch (e) {
    console.error("JSON Parsing Failed:", e, "\nRaw AI output:", raw);
    throw new Error("AI returned invalid JSON");
  }

  // Save updated JSON into Proposal
  await prisma.proposal.update({
    where: { proposalId },
    data: {
      structured: updatedStructured,
      status: "UNDER_REVIEW",
    },
  });

  return updatedStructured;
}

/**
 * Compare multiple vendor structured JSON proposals.
 * Input: array of structured JSONs (vendor A, vendor B, vendor C...)
 * Output: insights, comparison table, and final recommendation.
 */
export async function compareStructuredProposals(structuredProposals = []) {
  const model = "gemini-2.5-flash";

  if (!structuredProposals || structuredProposals.length === 0) {
    throw new Error("No structured proposals provided for comparison.");
  }

  // Normalize minimal input shape for AI to consume
  const normalized = structuredProposals.map((p, i) => ({
    idx: i + 1,
    vendorName: p.vendorName || `Vendor ${i + 1}`,
    structured: p.structured || null,
  }));

  const systemPrompt = `
You are an expert procurement analyst. You will receive an array of vendor proposals in a strict JSON input format (see INPUT EXAMPLE). Your job is to:

1) Analyze each proposal and produce short, factual "strengths" and "weaknesses" lists.
2) Produce a concise procurement comparison across budgets, delivery days, and item/spec coverage.
3) Recommend exactly ONE proposal as the best choice, and provide a one-sentence reason.

CRITICAL RULES:
- RETURN VALID JSON ONLY. Absolutely NO Markdown, NO explanations, NO code fences, NO surrounding text.
- JSON must match the EXACT OUTPUT SCHEMA shown below.
- Do not invent vendor names beyond the provided vendorName field.
- When comparing budgets and delivery days, treat null/missing as "unknown".
- If two proposals tie on value, explicitly state tie in the "reason" field of recommendedProposal and pick the one with better delivery or completeness if possible.
- RETURN ONLY JSON.
- DO NOT include code fences or any markdown anywhere.
- DO NOT include markdown.
- DO NOT include explanations or text outside JSON.
- Your output MUST begin with '{' and end with '}'.

OUTPUT SCHEMA (strict):
{
  "proposalInsights": [
    {
      "vendorName": "",        // string
      "strengths": [],        // array of short strings
      "weaknesses": [],       // array of short strings
      "summary": ""           // short 1-2 sentence summary
    }
  ],
  "comparisonSummary": {
    "budgetComparison": "",   // 1-2 sentence comparison of budgets (cheapest/most expensive/notes)
    "deliveryComparison": "", // 1-2 sentence comparison of delivery days (fastest/slowest/notes)
    "specComparison": ""      // 1-2 sentence about spec compliance and differences
  },
  "recommendedProposal": {
    "vendorName": "",         // one vendorName chosen from inputs
    "reason": ""              // one-sentence reason why (value, speed, completeness)
  }
}

INPUT EXAMPLE:
[
  {
    "vendorName": "TechWorld Distributors",
    "structured": {
      "title": "Procurement of Laptops and Monitors",
      "description": "Purchase of laptops and monitors...",
      "budget": 45000,
      "deliveryDays": 25,
      "items": [
        {"name":"Laptop", "quantity":20, "specifications":{"ram":"16GB"}, "unitPrice":2250, "totalPrice":45000},
        {"name":"Monitor", "quantity":15, "specifications":{"size":"27-inch"}}
      ],
      "terms": ["Net 30", "1 year warranty"],
      "vendorQuoteSummary": "We can deliver within 25 days for $45,000."
    }
  },
  {
    "vendorName": "FastPC Ltd",
    "structured": {
      "title": "Procurement of Laptops and Monitors",
      "budget": 48000,
      "deliveryDays": 20,
      "items": [
        {"name":"Laptop", "quantity":20, "specifications":{"ram":"16GB"}, "unitPrice":2400, "totalPrice":48000},
        {"name":"Monitor", "quantity":15, "specifications":{"size":"27-inch"}}
      ],
      "terms": ["Net 30", "6 months warranty"],
      "vendorQuoteSummary": "Faster delivery in 20 days at $48,000."
    }
  }
]

EXAMPLE OUTPUT (must follow this shape exactly):
{
  "proposalInsights": [
    {
      "vendorName": "TechWorld Distributors",
      "strengths": ["Lowest price", "Full 1 year warranty"],
      "weaknesses": ["Delivery 25 days (slower than fastest)"],
      "summary": "Lowest-cost vendor offering full warranty; slightly slower delivery."
    },
    {
      "vendorName": "FastPC Ltd",
      "strengths": ["Fastest delivery (20 days)"],
      "weaknesses": ["Higher price than TechWorld"],
      "summary": "Offers quickest delivery but at a higher cost."
    }
  ],
  "comparisonSummary": {
    "budgetComparison": "TechWorld is the cheapest at $45,000; FastPC is $48,000 (higher).",
    "deliveryComparison": "FastPC is fastest (20 days); TechWorld is 25 days.",
    "specComparison": "Both vendors meet the specified item quantities and core specs (16GB RAM, 27-inch monitors); TechWorld includes 1 year warranty while FastPC provides 6 months."
  },
  "recommendedProposal": {
    "vendorName": "TechWorld Distributors",
    "reason": "Best price-to-value: lowest cost and full 1-year warranty while meeting required specs."
  }
}
`;

  const content = `
SYSTEM PROMPT:
${systemPrompt}

STRUCTURED_PROPOSALS:
${JSON.stringify(normalized, null, 2)}
`;

  const response = await ai.models.generateContent({
    model,
    contents: content,
  });

  try {
    const raw = response.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!raw) throw new Error("AI returned empty comparison JSON");

    // AI sometimes outputs stray characters — trim whitespace
    const trimmed = raw.trim();

    // Parse JSON safely
    const parsed = JSON.parse(trimmed);
    return parsed;
  } catch (e) {
    console.error("AI Comparison JSON Parse Failed:", e, "raw response:", e?.raw || "n/a");
    throw new Error("AI returned invalid comparison JSON");
  }
}