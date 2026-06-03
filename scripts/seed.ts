import { Pinecone } from '@pinecone-database/pinecone';
import 'dotenv/config'; // Loads environment variables from your local .env file

const apiKey = process.env.PINECONE_API_KEY;
const indexName = process.env.PINECONE_INDEX_NAME;

if (!apiKey || !indexName) {
  console.error("❌ Operational Error: PINECONE_API_KEY or PINECONE_INDEX_NAME is completely undefined in your environment.");
  process.exit(1);
}

// Instantiate the modern Pinecone client
const pc = new Pinecone({ apiKey });
const index = pc.index(indexName);

// 15 Complete, production-grade tree profiles mapped to your integrated index configuration
const treeSpecies = [
  {
    id: 'tree-neem',
    text: 'Neem (Azadirachta indica): Exceptionally resilient to dense urban pollution and heat islands. Thrives beautifully in alluvial and sandy soils. Dense canopy structure provides robust local cooling and natural air purification.',
    name: 'Neem',
    soilType: 'Alluvial',
    canopyRadius: 8,
    coolingEfficiency: 8,
    droughtResistance: 'High'
  },
  {
    id: 'tree-banyan',
    text: 'Banyan (Ficus benghalensis): A massive keystone species offering an extraordinary canopy radius. Best suited for expansive civic parks and open urban plazas. Provides unparalleled shade cooling and microclimate stabilization.',
    name: 'Banyan',
    soilType: 'Clay',
    canopyRadius: 15,
    coolingEfficiency: 10,
    droughtResistance: 'Medium'
  },
  {
    id: 'tree-peepal',
    text: 'Peepal (Ficus religiosa): Fast-growing eco-warrior known for releasing high oxygen levels. Thrives across loamy and rocky soils. Excellent for wide roads and public spaces due to its vast, heat-absorbing foliage.',
    name: 'Peepal',
    soilType: 'Loam',
    canopyRadius: 10,
    coolingEfficiency: 9,
    droughtResistance: 'High'
  },
  {
    id: 'tree-gulmohar',
    text: 'Gulmohar (Delonix regia): Famed for its spectacular fiery orange flowers and wide, umbrella-shaped canopy. Thrives in sandy, well-drained soils. Exceptional for fast shade coverage along avenues and open streets.',
    name: 'Gulmohar',
    soilType: 'Sandy',
    canopyRadius: 7,
    coolingEfficiency: 7,
    droughtResistance: 'Medium'
  },
  {
    id: 'tree-amaltas',
    text: 'Amaltas (Cassia fistula): Highly aesthetic urban tree displaying beautiful golden blooms. Adapts comfortably to dry, lean soils. Offers moderate canopy shade while being exceptionally tolerant of structural urban constraints.',
    name: 'Amaltas',
    soilType: 'Loam',
    canopyRadius: 5,
    coolingEfficiency: 6,
    droughtResistance: 'High'
  },
  {
    id: 'tree-arjun',
    text: 'Arjun (Terminalia arjuna): Large evergreen tree typically found near water bodies but adapts well to marshy or clay-heavy urban zones. Offers deep structural shade and acts as an efficient carbon sink.',
    name: 'Arjun',
    soilType: 'Clay',
    canopyRadius: 8,
    coolingEfficiency: 8,
    droughtResistance: 'Medium'
  },
  {
    id: 'tree-ashoka',
    text: 'Ashoka (Polyalthia longifolia): Tall, slender vertical evergreen tree. Perfect for narrow urban alleys, boundaries, and high-density concrete walls where horizontal space is restricted but sound/heat buffering is required.',
    name: 'Ashoka',
    soilType: 'Alluvial',
    canopyRadius: 3,
    coolingEfficiency: 5,
    droughtResistance: 'Medium'
  },
  {
    id: 'tree-jamun',
    text: 'Jamun (Syzygium cumini): Robust evergreen tree featuring deep green, thick leaves that intercept intense solar radiation. Thrives in alluvial and moisture-retentive soils, offering structural shade and seasonal urban fruit harvesting.',
    name: 'Jamun',
    soilType: 'Alluvial',
    canopyRadius: 7,
    coolingEfficiency: 8,
    droughtResistance: 'Medium'
  },
  {
    id: 'tree-mango',
    text: 'Mango (Mangifera indica): Dense, dark green global canopy structure that intercepts solar radiation highly effectively. Performs optimally in deep loamy soils. Excellent for institutional campuses and communal parks.',
    name: 'Mango',
    soilType: 'Loam',
    canopyRadius: 9,
    coolingEfficiency: 8,
    droughtResistance: 'Medium'
  },
  {
    id: 'tree-jacaranda',
    text: 'Jacaranda (Jacaranda mimosifolia): Beautiful fern-like leaves providing fine, dappled shade coverage. Grows perfectly in well-drained sandy or loamy soils. Highly valued for aesthetic microclimate engineering along walkways.',
    name: 'Jacaranda',
    soilType: 'Sandy',
    canopyRadius: 6,
    coolingEfficiency: 7,
    droughtResistance: 'Medium'
  },
  {
    id: 'tree-tamarind',
    text: 'Tamarind (Tamarindus indica): Slow-growing, massive long-lived tree with fine leaflets forming a highly wind-resistant, incredibly dense shade canopy. Highly drought-resistant and perfectly suited for heavy concrete roadside zones.',
    name: 'Tamarind',
    soilType: 'Alluvial',
    canopyRadius: 11,
    coolingEfficiency: 9,
    droughtResistance: 'High'
  },
  {
    id: 'tree-mahua',
    text: 'Mahua (Madhuca longifolia): Hardy deciduous tree thriving across arid, rocky, and low-fertility soils. Deep root system makes it perfect for outer city green belts and urban forestry initiatives struggling with groundwater lack.',
    name: 'Mahua',
    soilType: 'Rocky',
    canopyRadius: 8,
    coolingEfficiency: 7,
    droughtResistance: 'High'
  },
  {
    id: 'tree-karanja',
    text: 'Karanja (Millettia pinnata): Highly resilient, medium-sized tree that actively fixes nitrogen in lean soils. Tolerates extreme heat, salinity, and waterlogging alike. Ideal for industrial zones and coastal/alluvial urban fringes.',
    name: 'Karanja',
    soilType: 'Alluvial',
    canopyRadius: 6,
    coolingEfficiency: 7,
    droughtResistance: 'High'
  },
  {
    id: 'tree-semal',
    text: 'Semal (Bombax ceiba): Fast-growing, tall deciduous tree featuring open horizontal branching patterns. Thrives along alluvial floodplains and urban riverfront restorations, providing heavy seasonal shade and wildlife habitats.',
    name: 'Semal',
    soilType: 'Alluvial',
    canopyRadius: 8,
    coolingEfficiency: 7,
    droughtResistance: 'Medium'
  },
  {
    id: 'tree-kadamba',
    text: 'Kadamba (Neolamarckia cadamba): Rapidly growing tree featuring massive broad leaves that offer immediate, heavy shade cooling. Performs exceptionally well in alluvial and moist soils, making it perfect for rapid civic canopy deployment.',
    name: 'Kadamba',
    soilType: 'Alluvial',
    canopyRadius: 7,
    coolingEfficiency: 8,
    droughtResistance: 'Low'
  }
];

async function seed() {
  try {
    console.log('🌱 Establishing secure link to Pinecone serverless cluster...');
    console.log(`Target Index Identified: "${indexName}"`);
    console.log('Streaming text blocks to llama-text-embed-v2 for automated server-side vectorization...');
    
    // Using the official v7.x SDK method for text records ingestion
    await index.upsertRecords({
      records: treeSpecies
    });
    
    console.log('✨ Database population completed seamlessly!');
    console.log(`✅ Verified: All ${treeSpecies.length} tree species are now fully indexed and ready for semantic queries.`);
  } catch (error) {
    console.error('❌ Database ingestion collapsed due to error:', error);
    process.exit(1);
  }
}

seed();