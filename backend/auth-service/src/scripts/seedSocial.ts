import "dotenv/config";

import bcrypt from "bcrypt";
import { prisma } from "@social/db";

const PASSWORD = "12345678";
const PASSWORD_ROUNDS = 12;
const USER_COUNT = 20;
const POSTS_PER_USER = 30;
const LIKES_PER_USER = 18;
const REPOSTS_PER_USER = 5;
const FOLLOWS_PER_USER = 6;

type ProfileSeed = {
  username: string;
  email: string;
  bio: string;
  location: string;
  isVerified: boolean;
};

const firstNames = [
  "Maya",
  "Daniel",
  "Ava",
  "Noah",
  "Sophia",
  "Liam",
  "Amara",
  "Ethan",
  "Zara",
  "Elijah",
  "Nia",
  "Caleb",
  "Ivy",
  "Lucas",
  "Layla",
  "Micah",
  "Aria",
  "Jonah",
  "Keira",
  "Milo",
];

const lastNames = [
  "Johnson",
  "Reed",
  "Hart",
  "Cole",
  "Parker",
  "Brooks",
  "Mensah",
  "Bennett",
  "Shaw",
  "Hayes",
  "Owens",
  "Turner",
  "Patel",
  "King",
  "Diaz",
  "Sloan",
  "Carter",
  "Bailey",
  "Young",
  "Stone",
];

const locations = [
  "Lagos, Nigeria",
  "Accra, Ghana",
  "Nairobi, Kenya",
  "Cape Town, South Africa",
  "London, UK",
  "Toronto, Canada",
  "Austin, USA",
  "Kigali, Rwanda",
  "Abuja, Nigeria",
  "Dakar, Senegal",
];

const bioFragments = [
  "building products and sharing the process",
  "taking photos, shipping features, and learning in public",
  "community-first creator with a soft spot for clean design",
  "coffee, code, and honest conversations",
  "writing about startup life and everyday wins",
  "music lover documenting moments that matter",
  "designer who notices the little details",
  "developer turning rough ideas into useful things",
  "marketing mind with a creator's curiosity",
  "always exploring what good digital spaces can feel like",
];

const postOpeners = [
  "Morning check-in",
  "Today I learned",
  "Quick thought",
  "Small win",
  "Behind the scenes",
  "Work in progress",
  "Weekend mood",
  "Community note",
  "Studio update",
  "Random reflection",
];

const postBodies = [
  "we finally tightened up the experience and it feels so much cleaner.",
  "sometimes the best progress is just removing friction for people.",
  "shipping consistently is more powerful than waiting for perfect conditions.",
  "good products feel calm even when they are doing a lot.",
  "I keep coming back to the idea that clarity is a feature.",
  "tiny improvements add up fast when the team stays patient.",
  "the feedback loop was worth it because the result feels more human.",
  "still learning, but the direction is finally making sense.",
  "making it simple took longer than I expected, but it was worth it.",
  "this is one of those updates users may not describe, but they will feel.",
];

const postClosers = [
  "#buildinpublic",
  "#socialapp",
  "#design",
  "#frontend",
  "#backend",
  "#product",
  "#community",
  "#devlife",
  "#ux",
  "#shipit",
];

function buildProfiles(): ProfileSeed[] {
  return Array.from({ length: USER_COUNT }, (_, index) => {
    const firstName = firstNames[index % firstNames.length];
    const lastName = lastNames[index % lastNames.length];
    const username = `${firstName.toLowerCase()}_${lastName.toLowerCase()}_${String(index + 1).padStart(2, "0")}`;
    const email = `seed.${username}@example.com`;

    return {
      username,
      email,
      bio: `${bioFragments[index % bioFragments.length]}.`,
      location: locations[index % locations.length],
      isVerified: index % 5 === 0,
    };
  });
}

function buildPostContent(username: string, userIndex: number, postIndex: number): string {
  const opener = postOpeners[(userIndex + postIndex) % postOpeners.length];
  const body = postBodies[(userIndex * 3 + postIndex) % postBodies.length];
  const closer = postClosers[(userIndex + postIndex * 2) % postClosers.length];
  const sequence = postIndex + 1;

  return `${opener}: ${body} ${closer} · ${username} update ${sequence}`;
}

function buildPostTimestamp(userIndex: number, postIndex: number): Date {
  const now = Date.now();
  const hoursAgo = postIndex * 7 + userIndex * 3 + 2;
  return new Date(now - hoursAgo * 60 * 60 * 1000);
}

async function seedUsers() {
  const profiles = buildProfiles();
  const hashedPassword = await bcrypt.hash(PASSWORD, PASSWORD_ROUNDS);

  for (const profile of profiles) {
    await prisma.user.upsert({
      where: { email: profile.email },
      update: {
        username: profile.username,
        password: hashedPassword,
        bio: profile.bio,
        location: profile.location,
        isVerified: profile.isVerified,
      },
      create: {
        username: profile.username,
        email: profile.email,
        password: hashedPassword,
        bio: profile.bio,
        location: profile.location,
        isVerified: profile.isVerified,
      },
    });
  }

  return prisma.user.findMany({
    where: {
      email: {
        in: profiles.map((profile) => profile.email),
      },
    },
    orderBy: { username: "asc" },
    select: {
      id: true,
      username: true,
      email: true,
    },
  });
}

async function seedPosts(users: Array<{ id: string; username: string; email: string }>) {
  for (const [userIndex, user] of users.entries()) {
    const currentPostCount = await prisma.post.count({
      where: { userId: user.id },
    });

    if (currentPostCount >= POSTS_PER_USER) {
      continue;
    }

    const missingCount = POSTS_PER_USER - currentPostCount;
    const postsToCreate = Array.from({ length: missingCount }, (_, offset) => {
      const postIndex = currentPostCount + offset;

      return {
        userId: user.id,
        content: buildPostContent(user.username, userIndex, postIndex),
        createdAt: buildPostTimestamp(userIndex, postIndex),
        updatedAt: buildPostTimestamp(userIndex, postIndex),
      };
    });

    await prisma.post.createMany({
      data: postsToCreate,
    });
  }
}

async function seedFollows(users: Array<{ id: string }>) {
  const follows = users.flatMap((user, userIndex) =>
    Array.from({ length: FOLLOWS_PER_USER }, (_, offset) => {
      const followingUser = users[(userIndex + offset + 1) % users.length];

      return {
        followerId: user.id,
        followingId: followingUser.id,
      };
    }),
  );

  await prisma.follow.createMany({
    data: follows,
    skipDuplicates: true,
  });
}

async function seedLikesAndReposts(users: Array<{ id: string }>) {
  const posts = await prisma.post.findMany({
    where: {
      user: {
        email: {
          startsWith: "seed.",
        },
      },
    },
    select: {
      id: true,
      userId: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const likes = users.flatMap((user, userIndex) => {
    const candidatePosts = posts.filter((post) => post.userId !== user.id);

    return Array.from({ length: Math.min(LIKES_PER_USER, candidatePosts.length) }, (_, offset) => {
      const post = candidatePosts[(userIndex * 11 + offset * 7) % candidatePosts.length];

      return {
        userId: user.id,
        postId: post.id,
      };
    });
  });

  const reposts = users.flatMap((user, userIndex) => {
    const candidatePosts = posts.filter((post) => post.userId !== user.id);

    return Array.from({ length: Math.min(REPOSTS_PER_USER, candidatePosts.length) }, (_, offset) => {
      const post = candidatePosts[(userIndex * 5 + offset * 13) % candidatePosts.length];

      return {
        userId: user.id,
        postId: post.id,
      };
    });
  });

  await prisma.like.createMany({
    data: likes,
    skipDuplicates: true,
  });

  await prisma.repost.createMany({
    data: reposts,
    skipDuplicates: true,
  });
}

async function main() {
  const users = await seedUsers();
  await seedPosts(users);
  await seedFollows(users);
  await seedLikesAndReposts(users);

  const [userCount, postCount, followCount, likeCount, repostCount] = await Promise.all([
    prisma.user.count({
      where: {
        email: {
          startsWith: "seed.",
        },
      },
    }),
    prisma.post.count({
      where: {
        user: {
          email: {
            startsWith: "seed.",
          },
        },
      },
    }),
    prisma.follow.count({
      where: {
        follower: {
          email: {
            startsWith: "seed.",
          },
        },
      },
    }),
    prisma.like.count({
      where: {
        user: {
          email: {
            startsWith: "seed.",
          },
        },
      },
    }),
    prisma.repost.count({
      where: {
        user: {
          email: {
            startsWith: "seed.",
          },
        },
      },
    }),
  ]);

  console.log("Social seed complete.");
  console.log(`Users: ${userCount}`);
  console.log(`Posts: ${postCount}`);
  console.log(`Follows: ${followCount}`);
  console.log(`Likes: ${likeCount}`);
  console.log(`Reposts: ${repostCount}`);
  console.log(`Login password for seeded users: ${PASSWORD}`);
}

main()
  .catch((error) => {
    console.error("Social seed failed.");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
