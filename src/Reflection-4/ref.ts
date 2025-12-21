import 'dotenv/config'; // Load the GOOGLE_API_KEY from .env
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { 
    SystemMessage, 
    HumanMessage, 
    BaseMessage 
} from "@langchain/core/messages";

const llm = new ChatGoogleGenerativeAI({
    model: "gemini-2.5-flash",
    temperature:0,
})

//? Reflection code
async function runReflectionLoop() {
    //* --- The Core Task ---
    const taskPrompt = `
    Your task is to create a Typescript function named \`calculate_factorial\`.
    This function should do the following:
    1.  Accept a single integer \`n\` as input.
    2.  Calculate its factorial (n!).
    3.  Include a clear docstring explaining what the function does.
    4.  Handle edge cases: The factorial of 0 is 1.
    5.  Handle invalid input: Raise a ValueError if the input is a negative number.
    `;

    //* The Reflection Loop
    const maxIteration = 3;
    let currentCode = "";

    //* Conversation history to provide context in each step
    const messageHistory: BaseMessage[] = [new HumanMessage(taskPrompt)]; 

    for (let i = 0; i < maxIteration; i++){
        console.log(`\n${"=".repeat(25)} REFLECTION LOOP: ITERATION ${i + 1} ${"=".repeat(25)}`);

        //? 1. Generate/Refine stage
        let response;
        if (i === 0) {
            console.log("\n>>> Stage 1: GENERATING initial code...");
            response = await llm.invoke(messageHistory);
        } else {
            console.log("\n>>> Stage 2: REFINING code based on previous critique...");
            messageHistory.push(new HumanMessage("Please refine the code using the critiques provided."))
            response = await llm.invoke(messageHistory);
        }

        currentCode = response.content as string;
        console.log(`\n--- Generated Code (v${i + 1}) ---\n${currentCode}`);

        //* Add the generated code to history
        messageHistory.push(response);

        //? 2. REFLECT STAGE
        console.log("\n>>> STAGE 2: REFLECTING on the generated code...");

        //* Create a specific prompt for the reflector agent.
        const reflectorPrompt = [
            new SystemMessage(`
                You are a senior software engineer and an expert in Typescript.
                Your role is to perform a meticulous code review.
                Critically evaluate the provided Typescript code based on the original task requirements.
                Look for bugs, style issues, missing edge cases, and areas for improvement.
                If the code is perfect and meets all requirements, respond with the single phrase 'CODE_IS_PERFECT'.
                Otherwise, provide a bulleted list of your critiques.
            `),
            new HumanMessage(`Original Task:\n${taskPrompt}\n\nCode to Review:\n${currentCode}`)
        ];

        const critiqueResponse = await llm.invoke(reflectorPrompt);
        const critique = critiqueResponse.content as string;

        //? 3. Stopping condition
        if (critique.includes("CODE_IS_PERFECT")) {
            console.log("\n--- Critique ---\nNo further critiques found. The code is satisfactory.");
            break;
        }

        console.log("\n--- Critique ---\n" + critique);
        
        //* Add the critique to the history for the next refinement loop
        messageHistory.push(new HumanMessage(`Critique of the previous code:\n${critique}`));
    }

    console.log(`\n${"=".repeat(30)} FINAL RESULT ${"=".repeat(30)}`);
    console.log("\nFinal refined code after the reflection process:\n");
    console.log(currentCode);
}

runReflectionLoop().catch(console.error);