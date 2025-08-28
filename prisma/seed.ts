import { faker } from '@faker-js/faker';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const users = Array.from({ length: 10 }, () => ({
  email: faker.internet.email(),
  name: faker.person.fullName(),
  password: faker.internet.password(),
}));

async function main() {
  for (const user of users) {
    return await prisma.user.create({ data: user });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });