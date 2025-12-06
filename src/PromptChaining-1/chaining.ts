import 'dotenv/config'; // Load the GOOGLE_API_KEY from .env
import {ChatPromptTemplate} from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { RunnablePassthrough } from "@langchain/core/runnables";

import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

const llm = new ChatGoogleGenerativeAI({
    model: "gemini-2.5-flash",
    temperature: 0
});

const outputParser = new StringOutputParser();

//? Prompt 1 : Extract Information
const promptExtract = ChatPromptTemplate.fromTemplate(
    "Extract the technical specifications from the followwing text, and output only the comma-separated specs:\n\n{text_input}"
)

//? Prompt 2: Transform to JSON 
const promptTransform = ChatPromptTemplate.fromTemplate(
    "Transform the following specifications into a JSON object with 'cpu', 'memory', and 'storage' as keys. Output ONLY the valid JSON object.\n\nSpecifications:\n{specifications}"
);

//? Building the chain
//* .pipe() function send one prompt's information to other
const extractionChain = promptExtract.pipe(llm).pipe(outputParser);

//* RunnablePassthrough basically running the extractionChain -> setting the output inside specifications variable -> passing it to promptTransform -------> This is known as LCEL (Langchain Expression Language)  
const fullChain = RunnablePassthrough.assign({
    specifications: extractionChain,
}).pipe(promptTransform).pipe(llm).pipe(outputParser);

async function runChainingExample() {
    const input_text = "The new laptop model features a 3.5 GHz octa-core processor, 16GB of RAM, and a 1TB NVMe SSD.";
    
    console.log("--- Starting Prompt Chaining ---");

    // The input object matches the placeholder in the first prompt: {text_input}

    const finalResult = await fullChain.invoke({
        text_input: input_text,
    });

    console.log("\n--- Final JSON Output ---");
    console.log(finalResult);
}

runChainingExample();