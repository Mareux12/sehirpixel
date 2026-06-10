"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const CITIES = [
    "Adana", "Adıyaman", "Afyonkarahisar", "Ağrı", "Amasya", "Ankara", "Antalya", "Artvin", "Aydın", "Balıkesir",
    "Bilecik", "Bingöl", "Bitlis", "Bolu", "Burdur", "Bursa", "Çanakkale", "Çankırı", "Çorum", "Denizli",
    "Diyarbakır", "Edirne", "Elazığ", "Erzincan", "Erzurum", "Eskişehir", "Gaziantep", "Giresun", "Gümüşhane", "Hakkari",
    "Hatay", "Isparta", "Mersin", "İstanbul", "İzmir", "Kars", "Kastamonu", "Kayseri", "Kırklareli", "Kırşehir",
    "Kocaeli", "Konya", "Kütahya", "Malatya", "Manisa", "Kahramanmaraş", "Mardin", "Muğla", "Muş", "Nevşehir",
    "Niğde", "Ordu", "Rize", "Sakarya", "Samsun", "Siirt", "Sinop", "Sivas", "Tekirdağ", "Tokat",
    "Trabzon", "Tunceli", "Şanlıurfa", "Uşak", "Van", "Yozgat", "Zonguldak", "Aksaray", "Bayburt", "Karaman",
    "Kırıkkale", "Batman", "Şırnak", "Bartın", "Ardahan", "Iğdır", "Yalova", "Karabük", "Kilis", "Osmaniye", "Düzce"
];
// Generate a random pleasant color
function getRandomColor() {
    const hue = Math.floor(Math.random() * 360);
    const saturation = 60 + Math.floor(Math.random() * 40); // 60-100%
    const lightness = 40 + Math.floor(Math.random() * 20); // 40-60%
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}
async function main() {
    console.log("Cleaning up database...");
    await prisma.pixel.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.city.deleteMany({});
    console.log("Seeding cities...");
    const createdCities = [];
    for (const name of CITIES) {
        const city = await prisma.city.create({
            data: {
                name,
                color: getRandomColor(),
            }
        });
        createdCities.push(city);
    }
    console.log("Generating Turkey map pixels...");
    // Let's create a 160x80 map for better resolution
    const MAP_WIDTH = 160;
    const MAP_HEIGHT = 80;
    // Approximate realistic Turkey shape polygon (scaled to 160x80)
    // Polygon coordinates: [x, y]
    const turkeyPolygon = [
        [5, 25], [15, 15], [25, 18], [40, 10], [55, 8], [75, 4],
        [100, 5], [120, 10], [135, 15], [150, 20], [155, 30],
        [155, 40], [145, 45], [130, 55], [120, 50], [110, 65],
        [95, 60], [80, 75], [60, 70], [45, 65], [30, 75],
        [20, 65], [10, 55], [5, 45], [0, 35]
    ];
    function isPointInPolygon(point, vs) {
        let x = point[0], y = point[1];
        let inside = false;
        for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
            let xi = vs[i][0], yi = vs[i][1];
            let xj = vs[j][0], yj = vs[j][1];
            let intersect = ((yi > y) != (yj > y))
                && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
            if (intersect)
                inside = !inside;
        }
        return inside;
    }
    const validLandPixels = [];
    for (let y = 0; y < MAP_HEIGHT; y++) {
        for (let x = 0; x < MAP_WIDTH; x++) {
            if (isPointInPolygon([x, y], turkeyPolygon)) {
                validLandPixels.push({ x, y });
            }
        }
    }
    console.log(`Found ${validLandPixels.length} land pixels.`);
    // Pick 81 random points as city centers
    const cityCenters = [];
    const shuffled = [...validLandPixels].sort(() => 0.5 - Math.random());
    for (let i = 0; i < CITIES.length; i++) {
        cityCenters.push({
            cityId: createdCities[i].id,
            x: shuffled[i].x,
            y: shuffled[i].y
        });
    }
    // Assign each pixel to the nearest city center
    console.log("Assigning pixels to cities (Voronoi)...");
    const pixelsToInsert = [];
    for (const p of validLandPixels) {
        let nearestCenter = cityCenters[0];
        let minDist = Infinity;
        for (const center of cityCenters) {
            const dist = Math.sqrt(Math.pow(center.x - p.x, 2) + Math.pow(center.y - p.y, 2));
            if (dist < minDist) {
                minDist = dist;
                nearestCenter = center;
            }
        }
        pixelsToInsert.push({
            x: p.x,
            y: p.y,
            cityId: nearestCenter.cityId
        });
    }
    console.log(`Inserting ${pixelsToInsert.length} pixels to DB... (This might take a moment)`);
    const CHUNK_SIZE = 2000;
    for (let i = 0; i < pixelsToInsert.length; i += CHUNK_SIZE) {
        const chunk = pixelsToInsert.slice(i, i + CHUNK_SIZE);
        await prisma.pixel.createMany({
            data: chunk
        });
        console.log(`Inserted chunk ${i / CHUNK_SIZE + 1} / ${Math.ceil(pixelsToInsert.length / CHUNK_SIZE)}`);
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
