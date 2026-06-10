import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const storeProducts = [
  // Frames
  { id: 'frame_gold', name: 'Altın Çerçeve', type: 'frame', price: 50, stripePriceId: 'price_test_goldframe' },
  { id: 'frame_diamond', name: 'Elmas Çerçeve', type: 'frame', price: 100, stripePriceId: 'price_test_diamondframe' },
  { id: 'frame_neon', name: 'Neon Çerçeve', type: 'frame', price: 75, stripePriceId: 'price_test_neonframe' },
  { id: 'frame_fire', name: 'Ateş Efekti Çerçeve', type: 'frame', price: 150, stripePriceId: 'price_test_fireframe' },
  
  // Badges
  { id: 'badge_founder', name: 'Kurucu', type: 'badge', price: 200, stripePriceId: 'price_test_founderbadge' },
  { id: 'badge_supporter', name: 'Destekçi', type: 'badge', price: 30, stripePriceId: 'price_test_supporterbadge' },
  { id: 'badge_legend', name: 'Efsane', type: 'badge', price: 300, stripePriceId: 'price_test_legendbadge' },
  { id: 'badge_hero', name: 'Şehir Kahramanı', type: 'badge', price: 120, stripePriceId: 'price_test_herobadge' },

  // Name Colors
  { id: 'name_gold', name: 'Altın İsim', type: 'nameColor', price: 80, stripePriceId: 'price_test_goldname' },
  { id: 'name_neon', name: 'Neon İsim', type: 'nameColor', price: 90, stripePriceId: 'price_test_neonname' },
  { id: 'name_rainbow', name: 'Gökkuşağı İsim', type: 'nameColor', price: 180, stripePriceId: 'price_test_rainbowname' },

  // Supporter System (Monthly Subscription)
  { id: 'sub_premium', name: 'Premium Destekçi (Aylık)', type: 'supporter', price: 50, stripePriceId: 'price_test_premiumsub' }
];

async function main() {
  console.log("Seeding Store Products...");
  
  for (const product of storeProducts) {
    await prisma.product.upsert({
      where: { id: product.id },
      update: product,
      create: product,
    });
  }

  console.log("Store Seeding complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
