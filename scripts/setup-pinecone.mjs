// Setup Pinecone index for KnowFlow AI
import { Pinecone } from '@pinecone-database/pinecone';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load .env.local file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const PINECONE_API_KEY = process.env.PINECONE_API_KEY;
const INDEX_NAME = process.env.PINECONE_INDEX_NAME || 'knowflow-ai';
const DIMENSION = 1536; // text-embedding-ada-002 dimension
const METRIC = 'cosine';
const CLOUD = 'aws';
const REGION = 'us-east-1';

async function setupPinecone() {
    if (!PINECONE_API_KEY) {
        console.error('❌ PINECONE_API_KEY is not set in environment variables');
        process.exit(1);
    }

    console.log('🔧 Initializing Pinecone...');
    const pinecone = new Pinecone({
        apiKey: PINECONE_API_KEY,
    });

    try {
        // Check if index exists
        console.log(`\n📋 Checking if index "${INDEX_NAME}" exists...`);
        const indexes = await pinecone.listIndexes();
        const existingIndex = indexes.indexes?.find(idx => idx.name === INDEX_NAME);

        if (existingIndex) {
            console.log(`✅ Index "${INDEX_NAME}" already exists!`);
            console.log('\nIndex details:');
            console.log(`  - Name: ${existingIndex.name}`);
            console.log(`  - Dimension: ${existingIndex.dimension}`);
            console.log(`  - Metric: ${existingIndex.metric}`);
            console.log(`  - Host: ${existingIndex.host}`);
            console.log(`  - Status: ${existingIndex.status?.state || 'Ready'}`);
            
            if (existingIndex.dimension !== DIMENSION) {
                console.log(`\n⚠️  Warning: Index dimension (${existingIndex.dimension}) doesn't match expected dimension (${DIMENSION})`);
                console.log('   You may need to delete and recreate the index with correct dimension.');
            }
        } else {
            console.log(`⚠️  Index "${INDEX_NAME}" does not exist. Creating...`);
            
            await pinecone.createIndex({
                name: INDEX_NAME,
                dimension: DIMENSION,
                metric: METRIC,
                spec: {
                    serverless: {
                        cloud: CLOUD,
                        region: REGION,
                    },
                },
            });

            console.log(`✅ Index "${INDEX_NAME}" created successfully!`);
            console.log('\nIndex configuration:');
            console.log(`  - Name: ${INDEX_NAME}`);
            console.log(`  - Dimension: ${DIMENSION}`);
            console.log(`  - Metric: ${METRIC}`);
            console.log(`  - Cloud: ${CLOUD}`);
            console.log(`  - Region: ${REGION}`);
            console.log('\n⏳ Note: It may take a few moments for the index to be fully ready.');
        }

        console.log('\n✨ Pinecone setup complete!');

    } catch (error) {
        console.error('❌ Error setting up Pinecone:', error.message);
        
        if (error.message?.includes('401') || error.message?.includes('API key')) {
            console.log('\n💡 Tip: Check that your PINECONE_API_KEY is correct');
        } else if (error.message?.includes('quota') || error.message?.includes('limit')) {
            console.log('\n💡 Tip: You may have reached your Pinecone account limits');
            console.log('   Visit https://app.pinecone.io/ to check your usage');
        }
        
        process.exit(1);
    }
}

setupPinecone();
