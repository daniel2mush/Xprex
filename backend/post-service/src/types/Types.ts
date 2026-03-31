export  interface PostCreatedEvent {
  postId: string;
  userId: string;
  content: string;
}

export  interface LikeCreatedEvent {
  likeId: string;
  postId: string;
  postOwnerId: string;
  likerId: string;
}

export  interface FollowCreatedEvent {
  followId: string;
  followerId: string;
  followingId: string;
}

export  interface RepostCreatedEvent {
  repostId: string;
  postId: string;   
  postOwnerId: string;
  repostedById: string;
}

export const feedUserSelect = {
  id: true,
  username: true,
  handle: true,
  avatar: true,
  isVerified: true,
} as const;