import 'dotenv/config'; // Load the GOOGLE_API_KEY from .env
import { 
    ChatPromptTemplate, 
    BasePromptTemplate, 
} from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { 
    Runnable, 
    RunnableParallel, 
    RunnablePassthrough, 
    RunnableSequence 
} from "@langchain/core/runnables";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

//? --- 1. Initialize the Language Model ---

const llm = new ChatGoogleGenerativeAI({
    model: "gemini-2.5-flash",
    temperature:0,
})

if (!process.env.GOOGLE_API_KEY) {
    console.error("Error: GOOGLE_API_KEY not found in environment variables.");
    process.exit(1);
}

//? --- Define Independent Chains ---

//* Helper function to create the simple Prompt -> LLM -> Parser chain
const createChain = (systemInstruction: string): Runnable => {
    const prompt = ChatPromptTemplate.fromMessages([
        ["system", systemInstruction],
        ["user", "{topic}"]
    ]);

    return prompt.pipe(llm).pipe(new StringOutputParser());
}

const summarizeChain: Runnable = createChain("Summarize the following topic concisely");
const questionsChain: Runnable = createChain("Generate three interesting questions about the following topic: ");
const termsChain: Runnable = createChain("Identify 5-10 key terms from the following topic, separated by commas: ");

//? --- Build the Parallel + Synthesis Chain ---

//? 1. Define the block of tasks to run in parallel (RunnableParallel is Python's RunnableParallel/RunnableMap)

const mapChain: RunnableParallel<any> = RunnableParallel.from({
    //These are running in parallel 
    summary: summarizeChain,
    questions: questionsChain,
    key_terms: termsChain,

    // Pass the original input
    topic: new RunnablePassthrough(),
})

//? 3. Define the final synthesis prompt which will combine the parallel results.
const synthesisPrompt: BasePromptTemplate = ChatPromptTemplate.fromMessages([
    ["system", `Based on the following information:
    Summary: {summary}
    Related Questions: {questions}
    Key Terms: {key_terms}
    Synthesize a comprehensive answer.`],
    ["user", "Original topic: {topic}"],
]);

//? 4. Construct the full chain by piping the parallel results directly
//    into the synthesis prompt, followed by the LLM and output parser.
// Note: mapChain's output {summary, questions, key_terms, topic} is piped into synthesisPrompt
const fullParallelChain: RunnableSequence<any, string> = RunnableSequence.from([
    // Step 1: The Parallel Execution Block
    mapChain, 
    // Step 2: Synthesis Prompt Formatting
    synthesisPrompt, 
    // Step 3: LLM Call
    llm, 
    // Step 4: Output Parsing
    new StringOutputParser(),
]);

//? Run the chain

async function runParallelExample(topic:string):Promise<void> {
    console.log(`\n--- Running Parallel LangChain Example for Topic: '${topic}' ---`);

    try {
        const response: string = await fullParallelChain.invoke({topic});
        console.log("\n--- Final Response ---");
        console.log(response);
    } catch (e) {
        console.error(`\nAn error occurred during chain execution: ${e}`);
    }
}

//? Execute the async function
const testTopic: string = "The history of space exploration";
runParallelExample(testTopic); 