const { PrismaClient } = require('@prisma/client');
const { io } = require('socket.io-client');
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst();
  if (!user) {
    console.log("No user found in DB");
    return;
  }

  // Create notification in DB
  const notif = await prisma.notification.create({
    data: {
      userId: user.id,
      title: "Test Real-time Notification",
      desc: "This notification was sent via Socket.io!",
    }
  });

  console.log("Created notification in DB:", notif);

  // We can't easily connect a raw socket to emit from the backend's perspective without importing the server.
  // Instead, the notification service should emit it. Let's just create it in the DB. If the frontend is polling or we want to test sockets, we need the backend to emit it.
  
  // Actually, to test the full loop, we should add an endpoint `/api/test/notification` that calls the service and emits.
}

main().catch(console.error).finally(() => prisma.$disconnect());
