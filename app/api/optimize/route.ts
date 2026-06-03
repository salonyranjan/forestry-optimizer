import 'dotenv/config';
import { NextResponse } from 'next/server';
import { Pinecone } from '@pinecone-database/pinecone';
import { ChatGroq } from '@langchain/groq';

// Strongly typed match interface
interface TreeMatch {
  id: string;
  text: string;
  metadata: {
    name: string;
    soilType: string;
    canopyRadius: number;
    coolingEfficiency: number;
    droughtResistance: string;
  };
}

// Build natural‑language query for Pinecone
function buildSearchQuery(concreteRatio: number, canopyCoverage: number): string {
  const concretePart = concreteRatio > 50 ? 'highly pollution‑resilient shade trees' : 'moderate shade trees';
  const canopyPart = canopyCoverage > 50 ? 'maximal canopy coverage' : 'modest canopy coverage';
  return `Find tree species suitable for urban environments with ${concretePart} and ${canopyPart}, focusing on cooling density.`;
}

export async function POST(request: Request) {
  try {
    const { canopyCoverage, concreteRatio, lat, lng } = await request.json();
    if (canopyCoverage === undefined || concreteRatio === undefined) {
      return NextResponse.json({ error: 'Missing canopyCoverage or concreteRatio' }, { status: 400 });
    }
    // Default coordinates if none supplied
    const latitude = typeof lat === 'number' ? lat : 25.6126;
    const longitude = typeof lng === 'number' ? lng : 85.1589;

    // Initialise Pinecone client
    const apiKey = process.env.PINECONE_API_KEY ?? '';
    const indexName = process.env.PINECONE_INDEX_NAME ?? '';
    if (!apiKey || !indexName) {
      return NextResponse.json({ error: 'Pinecone configuration missing' }, { status: 500 });
    }
    const pc = new Pinecone({ apiKey });
    const index = pc.index(indexName);

    // Perform integrated text search (no external embedding needed)
    const searchResponse: any = await index.searchRecords({
      query: {
        inputs: { text: buildSearchQuery(concreteRatio, canopyCoverage) },
        topK: 3
      }
    });
    const hits = searchResponse?.result?.hits || [];

    const matchedTrees: TreeMatch[] = hits.map((hit: any): TreeMatch => {
      const fields = hit.fields || {};
      return {
        id: hit._id ?? '',
        text: fields.text ?? '',
        metadata: {
          name: fields.name ?? '',
          soilType: fields.soilType ?? '',
          canopyRadius: Number(fields.canopyRadius ?? 0),
          coolingEfficiency: Number(fields.coolingEfficiency ?? 0),
          droughtResistance: fields.droughtResistance ?? 'Medium'
        }
      };
    });

    // Initialise Groq LLM
    const llm = new ChatGroq({
      apiKey: process.env.GROQ_API_KEY ?? '',
      model: 'llama-3.3-70b-versatile'
    });

    // Prompt including geographic context
    const prompt = `You are an expert Environmental Data Analyst. Analyze this urban sector configuration:\n- Latitude: ${latitude}\n- Longitude: ${longitude}\n- Canopy Coverage: ${canopyCoverage}%\n- Concrete Ratio: ${concreteRatio}%\n\nTop matching tree species:\n${matchedTrees
      .map((t, i) => `${i + 1}. ${t.metadata.name} – ${t.text}`)
      .join('\n')}\n\nProvide a concise action plan with:\n1. Recommended species deployment.\n2. Placement strategy for the given coordinates.\n3. Estimated cooling impact (°C).`;

    const response = await llm.invoke(prompt);
    const analysis = typeof response.content === 'string' ? response.content : JSON.stringify(response.content);

    return NextResponse.json({ analysis, matches: matchedTrees });
  } catch (err) {
    console.error('Optimization route error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
