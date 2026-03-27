export interface CommentCreatedEvent {
  commentId: string;
  postId: string;
  postOwnerId: string;
  commenterId: string;
  parentId: string | null;
  content: string;
}

export interface LikeCreatedEvent {
  likeId: string;
  postId: string;
  postOwnerId: string;
  likerId: string;
}

export interface FollowCreatedEvent {
  followId: string;
  followerId: string;
  followingId: string;
}
