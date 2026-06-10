import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import * as d3 from 'd3-geo';

const prisma = new PrismaClient();

// Generate a random pleasant color
function getRandomColor() {
  const hue = Math.floor(Math.random() * 360);
  const saturation = 60 + Math.floor(Math.random() * 40); // 60-100%
  const lightness = 40 + Math.floor(Math.random() * 20);  // 40-60%
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

async function main() {
  console.log("Cleaning up database...");
  await prisma.cityContribution.deleteMany({});
  await prisma.cityLeader.deleteMany({});
  await prisma.purchase.deleteMany({});
  await prisma.userCosmetic.deleteMany({});
  await prisma.pixel.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.city.deleteMany({});

  console.log("Loading GeoJSON...");
  const geojsonPath = path.join(__dirname, '..', 'tr-cities.json');
  const trData = JSON.parse(fs.readFileSync(geojsonPath, 'utf8'));

  console.log("Seeding cities...");
  const createdCities = new Map<string, number>();
  
  // Extract unique cities from GeoJSON and standardize names
  const features = trData.features;
  for (const feature of features) {
    let name = feature.properties.name;
    // Map some alternative names if needed (usually tr-cities.json is clean)
    if (!createdCities.has(name)) {
      const city = await prisma.city.create({
        data: { name, color: getRandomColor() }
      });
      createdCities.set(name, city.id);
    }
  }

  console.log("Generating 50k Pixel Grid using Real Borders...");
  // 450x200 grid bounding box ~ 90,000 pixels. Turkey shape is ~45% of its bounding box.
  // This yields roughly 40,000 - 45,000 land pixels!
  const MAP_WIDTH = 450;
  const MAP_HEIGHT = 200;

  // Set up D3 projection to fit the map exactly into our grid
  const projection = d3.geoMercator().fitSize([MAP_WIDTH, MAP_HEIGHT], trData);

  const pixelsToInsert = [];

  for (let y = 0; y < MAP_HEIGHT; y++) {
    for (let x = 0; x < MAP_WIDTH; x++) {
      // Invert pixel coordinate back to lon/lat
      const lonlat = projection.invert!([x, y]);
      if (!lonlat) continue;

      // Find which feature (province) contains this point
      let foundCityName = null;
      for (const feature of features) {
        if (d3.geoContains(feature, lonlat)) {
          foundCityName = feature.properties.name;
          break;
        }
      }

      if (foundCityName) {
        const cityId = createdCities.get(foundCityName);
        if (cityId) {
          pixelsToInsert.push({ x, y, cityId });
        }
      }
    }
  }

  console.log(`Found ${pixelsToInsert.length} land pixels.`);

  console.log(`Inserting ${pixelsToInsert.length} pixels to DB... (This might take a moment)`);
  const CHUNK_SIZE = 5000;
  for (let i = 0; i < pixelsToInsert.length; i += CHUNK_SIZE) {
    const chunk = pixelsToInsert.slice(i, i + CHUNK_SIZE);
    await prisma.pixel.createMany({ data: chunk });
    console.log(`Inserted chunk ${Math.floor(i / CHUNK_SIZE) + 1} / ${Math.ceil(pixelsToInsert.length / CHUNK_SIZE)}`);
  }

  console.log("Seeding complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
