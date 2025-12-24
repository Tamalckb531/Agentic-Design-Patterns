import 'dotenv/config';
import { Agent, Task, Crew } from 'crewai-js';
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

/**
 * Setup Environment and LLM
 */
if (!process.env.GOOGLE_API_KEY) {
    throw new Error("GOOGLE_API_KEY not found. Please set it in your .env file.");
}

// Initialize Gemini 2.0 Flash
const llm = new ChatGoogleGenerativeAI({
    model: "gemini-2.0-flash",
    apiKey: process.env.GOOGLE_API_KEY,
});

//? Crew Agent with identity
const researcher = new Agent({
    name: 'Research Analyst',
    role: 'Senior Research Analyst',
    goal: 'Find and summarize the latest trends in AI for 2024-2025.',
    backstory: 'You are an experienced research analyst with a knack for identifying key trends and synthesizing information.',
    llm: "gemini-2.0-flash", 
    verbose: true
});

const writer = new Agent({
    name: 'Technical Writer',
    role: 'Technical Content Writer',
    goal: 'Write a clear and engaging blog post based on research findings.',
    backstory: 'You are a skilled writer who can translate complex technical topics into accessible content.',
    llm: "gemini-2.0-flash",
    verbose: true
});

//? Task for agent
const researchTask = new Task({
    description: 'Research the top 3 emerging trends in Artificial Intelligence in 2024-2025. Focus on practical applications and potential impact.',
    agent: researcher,
    outputFormat: 'raw'
});

const writingTask = new Task({
    description: 'Write a 500-word blog post based on the research findings. The post should be engaging and easy for a general audience to understand.',
    agent: writer,
    outputFormat: 'raw'
});

//? Crew fully run the flow with multiple agents
const blogCreationCrew = new Crew({
    name: 'AI Blog Writing Crew',
    agents: [researcher, writer],
    tasks: [researchTask, writingTask],
    verbose: true
});

async function runCrew() {
    console.log("## Running the blog creation crew with Gemini 2.0 Flash... ##");
    
    try {  
        const result = blogCreationCrew.kickoff();
        
        console.log("\n------------------\n");
        console.log("## Crew Final Output ##");
        console.log(result);
    } catch (error) {
        console.error(`\n🛑 An unexpected error occurred: ${error}`);
    }
}

runCrew();