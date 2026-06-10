import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import { Server } from 'socket.io';

const prisma = new PrismaClient();

export function getCurrentCycleStart() {
  const now = new Date();
  const hour = now.getHours();
  const cycleHour = Math.floor(hour / 6) * 6;
  const start = new Date(now);
  start.setHours(cycleHour, 0, 0, 0);
  return start;
}

export function getNextCycleStart() {
  const start = getCurrentCycleStart();
  start.setHours(start.getHours() + 6);
  return start;
}

export function startCronJobs(io: Server) {
  // Run at minute 0 past every 6th hour: 00:00, 06:00, 12:00, 18:00
  cron.schedule('0 0,6,12,18 * * *', async () => {
    console.log('Running City Leader computation cycle...');
    try {
      // The cycle that just ended
      const cycleStart = new Date();
      cycleStart.setHours(cycleStart.getHours() - 6);
      cycleStart.setMinutes(0, 0, 0);

      const nextCycleStart = new Date(cycleStart);
      nextCycleStart.setHours(nextCycleStart.getHours() + 6);

      const cities = await prisma.city.findMany();

      for (const city of cities) {
        // Find the top contributor for this city in the just-ended cycle
        const topContributor = await prisma.cityContribution.findFirst({
          where: {
            cityId: city.id,
            cycleStart: cycleStart
          },
          orderBy: {
            pixelsPlaced: 'desc'
          }
        });

        if (topContributor) {
          // Record the new leader
          await prisma.cityLeader.upsert({
            where: {
              cityId_cycleStart: {
                cityId: city.id,
                cycleStart: nextCycleStart // the cycle they are leading is the NEW cycle
              }
            },
            update: {
              userId: topContributor.userId,
              cycleEnd: new Date(nextCycleStart.getTime() + 6 * 60 * 60 * 1000)
            },
            create: {
              cityId: city.id,
              userId: topContributor.userId,
              cycleStart: nextCycleStart,
              cycleEnd: new Date(nextCycleStart.getTime() + 6 * 60 * 60 * 1000)
            }
          });
        }
      }

      console.log('City Leader computation finished.');

      // Fetch the updated leaders to broadcast
      const currentCycle = getCurrentCycleStart();
      const currentLeaders = await prisma.cityLeader.findMany({
        where: { cycleStart: currentCycle },
        include: { user: true, city: true }
      });

      // Broadcast new leaders
      io.emit('new_leaders', currentLeaders.map(l => ({
        cityId: l.cityId,
        cityName: l.city.name,
        userId: l.userId,
        username: l.user.username,
        displayName: l.user.displayName,
        cycleEnd: l.cycleEnd
      })));

    } catch (err) {
      console.error('Error computing city leaders:', err);
    }
  });
}
