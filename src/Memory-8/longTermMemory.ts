//? Semantic Memory (Remembering Facts) : It is used to ground an agent's responses, leading to more personalized and relevant interactions.
//? Episodic Memory (Remembering Experiences) : Tt's frequently implemented through few-shot example prompting , where an agent learns from past successful interaction sequences to perform tasks correctly.
//? Procedural Memory (Remembering Rules) : This is the memory of how to perform tasks—the agent's core instructions and behaviors, often contained in its system prompt.

import 'dotenv/config';
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { InMemoryStore } from "@langchain/langgraph";

const store = new InMemoryStore({
  index: {
    dims: 1536,
    embeddings: new GoogleGenerativeAIEmbeddings({ modelName: "text-embedding-004" }),
  }
});

async function runMemoryStore() {
    const namespace = ["user_123", "preferences"];

    //? 2. STORE: Save data with "Metadata" (fields you can filter by)
    await store.put(
        namespace, 
        "fav_food", 
        { 
            text: "I absolutely love eating spicy Italian pasta.",
            category: "food",
            sentiment: "positive"
        }
    );

    //? 3. RETRIEVE: Get by exact ID
    const directItem = await store.get(namespace, "fav_food");
    console.log("Direct Retrieval:", directItem?.value);

    // 4. SEMANTIC SEARCH: Search by meaning + Filter by category
    const searchResults = await store.search(namespace, {
        query: "What does the user like to eat?", // Meaning-based search
        filter: { category: "food" },             // Hard filter
        limit: 1
    });

    console.log("Semantic Search Result:", searchResults[0]?.value.text);
}

runMemoryStore();