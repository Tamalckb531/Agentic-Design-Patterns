import 'dotenv/config'; // Loads GOOGLE_API_KEY
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatPromptTemplate} from "@langchain/core/prompts";
import { BaseMessage } from "@langchain/core/messages";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { 
    RunnablePassthrough, 
    RunnableBranch, 
    RunnableSequence, 
    RunnableMap 
} from "@langchain/core/runnables";

//? --- 1. Initialize the Language Model ---

const llm = new ChatGoogleGenerativeAI({
    model: "gemini-2.5-flash",
    temperature:0,
})

if (!process.env.GOOGLE_API_KEY) {
    console.error("Error: GOOGLE_API_KEY not found in environment variables.");
    process.exit(1);
}

//? --- 2. Define Simulated Sub-Agent Handlers (The Actions) ---

const booking_handler = (request: string): string => {
    console.log("\n--- DELEGATING TO BOOKING HANDLER ---");
    return `Booking Handler processed request: '${request}'. Result: Simulated booking action.`;
};

const info_handler = (request: string): string => {
    console.log("\n--- DELEGATING TO INFO HANDLER ---");
    return `Info Handler processed request: '${request}'. Result: Simulated information retrieval.`;
};

const unclear_handler = (request: string): string => {
    console.log("\n--- HANDLING UNCLEAR REQUEST ---");
    return `Coordinator could not delegate request: '${request}'. Please clarify.`;
};

//? --- 3. Define Coordinator Router Chain (The Decision Maker) ---
// The Prompt is the same, using the ChatPromptTemplate.fromMessages syntax.
const coordinatorRouterPrompt = ChatPromptTemplate.fromMessages([
    ["system", `Analyze the user's request and determine which specialist handler should process it.
    - If the request is related to booking flights or hotels, output 'booker'.
    - For all other general information questions, output 'info'.
    - If the request is unclear or doesn't fit either category, output 'unclear'.
    ONLY output one word: 'booker', 'info', or 'unclear'.`],
    ["user", "{request}"],
]);

//* LCEL Chain: Prompt -> LLM -> String (The decision keyword)
const coordinatorRouterChain = coordinatorRouterPrompt.pipe(llm).pipe(new StringOutputParser());

//? --- 4. Define the Delegation Logic (The Routing Switch) ---
// The `branches` now hold RunnableSequences that wrap the TypeScript functions.
// We use a RunnableMap to define the specialized handlers for cleaner branching definition.

const branches = {
    "booker": RunnablePassthrough.assign({
        output: (x: any) => booking_handler(x.request.request)
    }),
    "info": RunnablePassthrough.assign({
        output: (x: any) => info_handler(x.request.request)
    }),
    "unclear": RunnablePassthrough.assign({
        output: (x: any) => unclear_handler(x.request.request)
    }),
}

// The RunnableBranch handles the conditional routing.
// Note the conditional function syntax: it checks the 'decision' key.
const delegationBranch = RunnableBranch.from([
    // Condition 1 : Check if the decision is 'booker'
    [
        (x: any) => x.decision.trim() === 'booker',
        branches.booker
    ],
    // COndition 2 : Check if the decision is 'info'
    [

        (x: any) => x.decision.trim() === 'info',
        branches.info
    ],
    // Default path : handles 'unclear' or any other unexpected output
    branches.unclear
]);

// The final Coordinator Agent Chai.
// Equivalent to: { "decision": router } | delegation | (extract output)

const coordinatorAgent = RunnableSequence.from([
    // Step 1: Execute the router chain and pass the original request through
    {
        // Execute the router chain and name its output 'decision'
        decision: coordinatorRouterChain,
        // Pass the original input object through unchanged
        request: new RunnablePassthrough()
    },
    // Step 2: Route the execution based on the 'decision' key
    delegationBranch,
    // Step 3: Extract the final 'output' key from the resulting object
    (x: any) => x.output
]);

async function main() {
    console.log("--- Running with a booking request ---");
    const req_a = "Book me a flight to London.";
    const res_a = await coordinatorAgent.invoke({ request: req_a }); // getting the x.output from coordinatorAgent
    console.log(`Final Result A :, ${res_a}`);

    console.log("\n--- Running with a info request ---");
    const req_b = "What is the capital of Italy?";
    const res_b = await coordinatorAgent.invoke({ request: req_b });
    console.log(`Final Result B :, ${res_b}`);
    
    console.log("\n--- Running with a unclear request ---");
    const req_c = "Tell me about quantum physics.";
    const res_c = await coordinatorAgent.invoke({ request: req_c });
    console.log(`Final Result C :, ${res_c}`);
}

main();