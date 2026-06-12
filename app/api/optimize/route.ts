import 'dotenv/config';
import { NextResponse } from 'next/server';
import { Pinecone } from '@pinecone-database/pinecone';
import { ChatGroq } from '@langchain/groq';

// Strongly typed match interface to enforce clean data boundaries
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

// Build a highly targeted natural‑language query for Pinecone
function buildSearchQuery(concreteRatio: number, canopyCoverage: number): string {
  const concretePart = concreteRatio > 50 ? 'highly pollution‑resilient shade trees' : 'moderate shade trees';
  const canopyPart = canopyCoverage > 50 ? 'maximal canopy coverage' : 'modest canopy coverage';
  return `Find tree species suitable for urban environments with ${concretePart} and ${canopyPart}, focusing on cooling density.`;
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    // Defensive parameter destructuring matching frontend state variables perfectly
    const canopyCoverage = data.canopyCoverage ?? 50;
    const concreteRatio = data.concreteRatio ?? 30;
    const weather = data.weather || null;
    
    // Fallback coordinates locked natively to Kolkata Center
    const latitude = typeof data.lat === 'number' ? data.lat : 22.5726;
    const longitude = typeof data.lng === 'number' ? data.lng : 88.3639;

    if (canopyCoverage === undefined || concreteRatio === undefined) {
      return NextResponse.json({ error: 'Missing canopyCoverage or concreteRatio in payload' }, { status: 400 });
    }

    // Initialise Pinecone client securely
    const apiKey = process.env.PINECONE_API_KEY ?? '';
    const indexName = process.env.PINECONE_INDEX_NAME ?? '';
    
    if (!apiKey || !indexName) {
      return NextResponse.json({ error: 'Pinecone configuration or environment variables are missing' }, { status: 500 });
    }
    
    const pc = new Pinecone({ apiKey });
    const index = pc.index(indexName);

    // Perform integrated serverless text search (no external embedding overhead needed)
    const searchResponse: any = await index.searchRecords({
      query: {
        inputs: { text: buildSearchQuery(concreteRatio, canopyCoverage) },
        topK: 3
      }
    });
    
    const hits = searchResponse?.result?.hits || [];

    // Map the database hits cleanly into our strongly typed interface
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

    // Initialise the high-speed Groq LLM inference engine
    const llm = new ChatGroq({
      apiKey: process.env.GROQ_API_KEY ?? '',
      model: 'llama-3.3-70b-versatile'
    });

    // Inject live geographic context and meteorological telemetry directly into the AI's mind
    const weatherPart = weather
      ? `The current ambient outdoor meteorological telemetry at these exact coordinates is: Ambient Temperature: ${weather.temp}°C, Relative Humidity: ${weather.humidity}%, and Wind Speed: ${weather.wind} km/h. Synthesize these active climate indicators alongside our canopy coverage density parameters to recommend species that optimize water vapor cooling efficiency under these real-time structural stressors.`
      : '';

    const prompt = `You are an expert Environmental Data Analyst. Analyze this urban sector configuration:\n- Latitude: ${latitude}\n- Longitude: ${longitude}\n- Canopy Coverage: ${canopyCoverage}%\n- Concrete Ratio: ${concreteRatio}%\n${weatherPart}\n\nTop matching tree species:\n${matchedTrees
      .map((t, i) => `${i + 1}. ${t.metadata.name} – ${t.text}`)
      .join('\n')}\n\nProvide a concise action plan with:\n1. Recommended species deployment.\n2. Placement strategy for the given coordinates.\n3. Estimated cooling impact (°C).`;

    // Execute the model and parse the string payload safely with isolation for Groq errors
    let analysisText = "";
    try {
      const llmResponse = await llm.invoke(prompt);
      analysisText = typeof llmResponse.content === 'string' ? llmResponse.content : JSON.stringify(llmResponse.content);
    } catch (llmError: any) {
      console.error("GROQ API ERROR:", llmError);
      analysisText = `⚠️ Groq LLM Failure: ${llmError.message || "Unknown API Error"}`;
    }

    return NextResponse.json({ analysis: analysisText, matches: matchedTrees });
    
  } catch (err) {
    console.error('Optimization route error:', err);
    // Explicitly return the exact error message string directly to the frontend UI
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) }, 
      { status: 500 }
    );
  }
}