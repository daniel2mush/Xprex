interface count {
  likes: number;
  comments: number;
}

interface pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

export interface PostTypes {
  id: string;
  userId: string;
  content: string;
  mediaIds: string[];
  createdAt: Date;
  updatedAt: Date;
  user: User;
  media: MediaItem[];
  _count: count;
  isLiked: boolean;
  isBookmarked: boolean;
}

export interface PostResponse {
  success: boolean;
  message: string;
  data: {
    posts: PostTypes[];
  };
  pagination: pagination;
}

export interface ToggleLikeResponse {
  success: boolean;
  message: string;
  data: {
    postId: string;
    liked: boolean;
    likesCount: number;
  };
}

export interface RegisterProps {
  email: string;
  username: string;
  password: string;
}

interface postCounts {
  posts: number;
  followers: number;
  following: number;
}

export interface User {
  id: string;
  email: string;
  username: string;
  avatar?: string | undefined;
  bio?: string | undefined;
  isVerified: boolean;
  createdAt?: string;
  _count?: postCounts;
}

// export interface ProfileResponse {
//   success: boolean;
//   message: string;
//   data: {
//     user: User;
//     posts: PostTypes[];
//   };
// }

export interface AuthResponse {
  message: string;
  success: boolean;
  data: {
    accessToken: string;
    refreshToken: string;
    user: User;
  };
}

export interface MediaItem {
  id: string;
  url: string;
  type: "IMAGE" | "VIDEO" | "GIF"; // match the DB enum exactly
  alt?: string;
}

export interface CreatePostTypes {
  content: string;
  mediaUrls: string[];
}

export interface CommentUser {
  id: string;
  username: string;
  avatar?: string;
  isVerified?: boolean;
}

export interface ReplyTypes {
  id: string;
  content: string;
  createdAt: string;
  user: CommentUser;
}

export interface CommentTypes {
  id: string;
  content: string;
  createdAt: string;
  user: CommentUser;
  _count: { replies: number };
  replies: ReplyTypes[]; // preview — 3 max
}

export interface CommentResponse {
  success: boolean;
  data: {
    comments: CommentTypes[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasMore: boolean;
    };
  };
}

export type NotificationType = "LIKE" | "COMMENT" | "REPLY" | "FOLLOW";

export interface NotificationTypes {
  id: string;
  type: NotificationType;
  read: boolean;
  createdAt: string;
  actor: {
    id: string;
    username: string;
    avatar?: string;
  };
  post?: {
    id: string;
    content: string;
  };
  comment?: {
    id: string;
    content: string;
  };
}

export interface NotificationResponse {
  success: boolean;
  data: NotificationTypes[];
}

export interface ProfileUser {
  id: string;
  username: string;
  avatar?: string;
  bio?: string;
  isVerified: boolean;
  createdAt: string;
  isFollowing?: boolean;
  _count: {
    posts: number;
    followers: number;
    following: number;
  };
}

export interface ProfileResponse {
  success: boolean;
  data: {
    user: ProfileUser;
    posts: PostTypes[];
  };
}
