import { ChatMessageHistory } from "@langchain/classic/memory";
import { BufferMemory } from "@langchain/classic/memory";
import 'dotenv/config';
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { LLMChain } from "@langchain/classic/chains";
import {
    ChatPromptTemplate,
    MessagesPlaceholder,
    SystemMessagePromptTemplate,
    HumanMessagePromptTemplate,
} from "@langchain/core/prompts";

const llm = new ChatGoogleGenerativeAI({
    model: "gemini-2.5-flash",
    temperature:0,
})


//! Manual Memory Management 
//? Short term memory. But stores details about chat. Mostly use to load old chat from database
async function runMemoryExample() {
    //? Instance to store chat memory
    const history = new ChatMessageHistory();

    await history.addUserMessage("Hello This is Tamal");
    await history.addAIMessage("Hi Tamal! This is AgentX");

    const messages = await history.getMessages();

    console.log("--- Current Message History ---");
    console.log(messages);
}

// runMemoryExample().catch(console.error);

//! Automated Memory for Chains
//? Short term memory. Mostly use as current memory chain. It just store the chat in one single string to give a context to the agent. 
async function BufferMemoryExample() {
    const memory = new BufferMemory();
    memory.saveContext({ "input": "What's the weather like ?" }, { "output": "It's sunny today." });
    memory.saveContext({ "input": "What up dude?" }, { "output": "Good you?" });

    const result = await memory.loadMemoryVariables({});
    console.log(result);
}

// BufferMemoryExample().catch(console.error);

//! Integration to llm chain (Short term memory)
async function runConversation() {
    //? Define prompt Template
    const prompt = ChatPromptTemplate.fromMessages([
        SystemMessagePromptTemplate.fromTemplate("You are a friendly assistant."),
        new MessagesPlaceholder("chat_history"),
        HumanMessagePromptTemplate.fromTemplate("{question}"),
    ]);
    
    //? configure memory
    const memory = new BufferMemory({
        memoryKey: "chat_history",
        returnMessages: true
    });

    //? Build Chain
    const conversation = new LLMChain({
        llm,
        prompt,
        memory
    });
    //* LLMChain workflow: Go to memory and get history -> paste history to the prompt -> send it to gemini -> get gemini answer and save it back to the memory 

    //? Run the conversation
    console.log("--- First Turn (Saying my name is Tamal) ---");
    const response1 = await conversation.call({ question: "Hi, I'm Tamal." });
    console.log("AI:", response1.text);

    console.log("\n--- Second Turn (Asking if it remember my name)---");
    const response2 = await conversation.call({ question: "Do you remember my name?" });
    console.log("AI:", response2.text);
}

runConversation().catch(console.error);
