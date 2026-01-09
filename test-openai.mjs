// Test OpenAI API connectivity
import { OpenAIEmbeddings } from '@langchain/openai';

async function testOpenAI() {
    try {
        console.log('Testing OpenAI API connection...');
        console.log('API Key:', process.env.OPENAI_API_KEY ? '✓ Found' : '✗ Missing');
        
        const embeddings = new OpenAIEmbeddings({
            openAIApiKey: process.env.OPENAI_API_KEY,
            modelName: "text-embedding-ada-002",
        });

        console.log('\nGenerating test embedding...');
        const testText = "Hello, this is a test.";
        const vector = await embeddings.embedQuery(testText);
        
        console.log('✓ Success!');
        console.log('Vector dimension:', vector.length);
        console.log('First 5 values:', vector.slice(0, 5));
    } catch (error) {
        console.error('✗ Error:', error);
        console.error('Error details:', {
            message: error.message,
            status: error.status,
            code: error.code,
            name: error.name
        });
    }
}

testOpenAI();
