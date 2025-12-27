import { LlmAgent, SequentialAgent, FunctionTool } from "@google/adk";
import { z } from "zod";

//? Define tools
const get_precise_location_info = new FunctionTool({
    name: "get_precise_location_info",
    description: "Gets precise location information for a specific address.",
    parameters: z.object({
        address: z.string().describe("The user's provided address"),
    }),
    function: async ({ address}:any) => {
        return { status: "success", location: "123 Main St, NY" };
    }
})

const get_general_area_info = new FunctionTool({
  name: "get_general_area_info",
  description: "Gets general area information for a city.",
  parameters: z.object({
    city: z.string().describe("The city name extracted from the query"),
  }),
  function: async ({ city }:any) => {
    // Implementation for general area fallback
    return { status: "success", area: `General information for ${city}` };
  },
});

//? main agent
const primary_handler = new LlmAgent({
  name: "primary_handler",
  model: "gemini-2.0-flash-exp",
  instruction: "Your job is to get precise location information. Use the get_precise_location_info tool with the user's provided address.",
  tools: [get_precise_location_info],
});

//? Fallback agent
const fallback_handler = new LlmAgent({
  name: "fallback_handler",
  model: "gemini-2.0-flash-exp",
  instruction: `
Check if the primary location lookup failed by looking at state["primary_location_failed"].
- If it is True, extract the city from the user's original query and use the get_general_area_info tool.
- If it is False, do nothing.
  `,
  tools: [get_general_area_info],
});

//? Agent 3: Response Agent
const response_agent = new LlmAgent({
  name: "response_agent",
  model: "gemini-2.0-flash-exp",
  instruction: `
Review the location information stored in state["location_result"].
Present this information clearly and concisely to the user.
If state["location_result"] does not exist or is empty, apologize that you could not retrieve the location.
  `,
  tools: [], // Only reasons over state
});

// --- 3. The Sequential Agent (Orchestrator) ---

export const robust_location_agent = new SequentialAgent({
  name: "robust_location_agent",
  subAgents: [primary_handler, fallback_handler, response_agent],
});