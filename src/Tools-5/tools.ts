import 'dotenv/config';
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { tool } from "@langchain/core/tools";
import { AgentExecutor, createToolCallingAgent } from "@langchain/classic/agents";
import { z } from "zod"; // Required for tool schema definition

//? --- 1. Initialize the Language Model ---

const llm = new ChatGoogleGenerativeAI({
    model: "gemini-2.5-flash",
    temperature:0,
})

if (!process.env.GOOGLE_API_KEY) {
    console.error("Error: GOOGLE_API_KEY not found in environment variables.");
    process.exit(1);
}

//? --- 2. Define a tool ---
const searchInformation = tool(
    async ({ query }) => {
        console.log(`\n------- Tool called: search_information with query : '${query}' -------`);
        
        const simulatedResults: Record<string, string> = {
            "weather in london": "The weather in London is currently cloudy with a temperature of 15°C.",
            "capital of france": "The capital of France is Paris.",
            "population of earth": "The estimated population of Earth is around 8 billion people.",
            "tallest mountain": "Mount Everest is the tallest mountain above sea level.",
        };

        const result = simulatedResults[query.toLowerCase()] ||
            `Simulated search result for '${query}': No specific information found, but the topic seems interesting.`;

        console.log(`--- TOOL RESULT: ${result} ---`);
        return result;
    },
    {
        name: "search_information",
        description: "Provides factual information on a given topic. Use this tool to find answers to phrases like 'capital of France' or 'weather in London?'.",
        schema: z.object({
            query: z.string().describe("The search query to look up factual information"),
        }),
    } //! Metadata
);

const tools = [searchInformation];

//? --- 3. Create the Tool Calling Agent ---

async function initializeAgent() {
    const agentPrompt = ChatPromptTemplate.fromMessages([
        ["system", "You are a helpful assistant."],
        ["human", "{input}"],
        ["placeholder", "{agent_scratchpad}"], //! It stores the tool result so that llm can pair it's own result for a hybrid query 
    ]);

    //* Create the agent
    const agent = createToolCallingAgent({
        llm,
        tools, //! Holding the metadata
        prompt: agentPrompt,
    });

    //* Create the executor
    return new AgentExecutor({
        agent,
        tools, //! Holding the code
    })
}

//? --- 4. Run the Agent ---

async function runAgentWithTool(executor: AgentExecutor, query: string) {
  console.log(`\n--- 🏃 Running Agent with Query: '${query}' ---`);
  try {
    const response = await executor.invoke({ input: query });
    console.log("\n--- ✅ Final Agent Response ---");
    console.log(response.output);
  } catch (error) {
    console.error(`\n🛑 An error occurred during agent execution: ${error}`);
  }
}

async function main() {
  const agentExecutor = await initializeAgent();

  console.log(`✅ Language model initialized: ${llm.model}`);

  await Promise.all([
    runAgentWithTool(agentExecutor, "What is the capital of France?"),
    runAgentWithTool(agentExecutor, "What's the weather like in London?"),
    runAgentWithTool(agentExecutor, "Tell me something about dogs.")
  ]);
}

main().catch(console.error);