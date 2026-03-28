interface count {
  likes: number;
  comments: number;
  reposts: number;
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
  feedEventId?: string;
  userId: string;
  content: string;
  mediaIds: string[];
  createdAt: Date;
  feedCreatedAt?: Date | string;
  repostedAt?: Date | string;
  updatedAt: Date;
  user: User;
  repostedBy?: {
    id: string;
    username: string;
    avatar?: string;
    isVerified?: boolean;
  };
  media: MediaItem[];
  _count: count;
  isLiked: boolean;
  isBookmarked: boolean;
  isReposted: boolean;
}

export interface PostResponse {
  success: boolean;
  message: string;
  data: {
    posts: PostTypes[];
    pagination: pagination;
  };
}

export interface SinglePostResponse {
  success: boolean;
  message: string;
  data: PostTypes;
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

export interface ToggleBookmarkResponse {
  success: boolean;
  message: string;
  data: {
    postId: string;
    bookmarked: boolean;
  };
}

export interface ToggleRepostResponse {
  success: boolean;
  message: string;
  data: {
    postId: string;
    reposted: boolean;
    repostsCount: number;
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
  headerPhoto?: string | undefined;
  bio?: string | undefined;
  location?: string | undefined;
  isVerified: boolean;
  isAdmin?: boolean;
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

export type NotificationType =
  | "LIKE"
  | "COMMENT"
  | "REPLY"
  | "FOLLOW"
  | "REPOST"
  | "MESSAGE";

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
  email?: string;
  avatar?: string;
  headerPhoto?: string;
  bio?: string;
  location?: string;
  isVerified: boolean;
  createdAt: string;
  isFollowing?: boolean;
  followsYou?: boolean;
  isBlocked?: boolean;
  isMuted?: boolean;
  _count: {
    posts: number;
    followers: number;
    following: number;
  };
}

export interface ProfileConnectionUser {
  id: string;
  username: string;
  avatar?: string;
  bio?: string;
  location?: string;
  isVerified: boolean;
  createdAt: string;
  connectedAt: string;
  isFollowing: boolean;
  followsYou: boolean;
  canMessage: boolean;
  _count: {
    posts: number;
    followers: number;
    following: number;
  };
}

export interface ProfileConnectionsResponse {
  success: boolean;
  data: {
    type: "followers" | "following";
    users: ProfileConnectionUser[];
  };
}

export interface ProfileResponse {
  success: boolean;
  data: {
    user: ProfileUser;
    posts: PostTypes[];
    likedPosts: PostTypes[];
    replies: ProfileReply[];
  };
}

export interface ProfileReply {
  id: string;
  content: string;
  createdAt: string;
  parentId?: string | null;
  user: CommentUser;
  post: {
    id: string;
    content: string;
    createdAt: string;
    user: CommentUser;
  };
}

export interface MessageParticipant {
  id: string;
  username: string;
  avatar?: string;
  isOnline: boolean;
}

export interface MessageItem {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  createdAt: string;
  media: MediaItem[];
}

export interface ConversationPreview {
  id: string;
  participant: MessageParticipant;
  lastMessage?: MessageItem;
  updatedAt: string;
  unreadCount: number;
}

export interface ConversationsResponse {
  success: boolean;
  data: ConversationPreview[];
}

export interface ConversationResponse {
  success: boolean;
  data: {
    id: string;
    participants: MessageParticipant[];
    messages: MessageItem[];
    updatedAt: string;
    unreadCount?: number;
    currentUserLastReadAt?: string;
    otherParticipantLastReadAt?: string;
  };
}

export interface TrendingTopic {
  label: string;
  searchValue: string;
  count: number;
}

export interface TrendingCreator {
  id: string;
  username: string;
  avatar?: string;
  count: number;
}

export interface TrendingDiscoveryResponse {
  success: boolean;
  data: {
    topics: TrendingTopic[];
    creators: TrendingCreator[];
  };
}

export interface AccountSecurityResponse {
  success: boolean;
  message: string;
  data?: User;
}

export type ReportReason =
  | "SPAM"
  | "ABUSE"
  | "HARASSMENT"
  | "MISINFORMATION"
  | "IMPERSONATION"
  | "OTHER";

export type ReportStatus = "OPEN" | "REVIEWED" | "DISMISSED";

export interface AdminReportItem {
  id: string;
  reason: ReportReason;
  details?: string | null;
  status: ReportStatus;
  createdAt: string;
  updatedAt: string;
  reporter: {
    id: string;
    username: string;
    avatar?: string;
  };
  targetUser?: {
    id: string;
    username: string;
    avatar?: string;
    isVerified?: boolean;
  } | null;
  targetPost?: {
    id: string;
    content: string;
    createdAt: string;
    user: CommentUser;
  } | null;
}

export interface AdminReportsResponse {
  success: boolean;
  message?: string;
  data: {
    reports: AdminReportItem[];
    pagination: pagination;
  };
}

export interface UpdateReportStatusResponse {
  success: boolean;
  message: string;
  data: {
    id: string;
    status: ReportStatus;
    updatedAt: string;
  };
}

export interface MediaUploadResponse {
  success: boolean;
  message?: string;
  data: {
    media: MediaItem[];
    urls: string[];
  };
}

export interface SearchResponse {
  success: boolean;
  data: {
    posts: PostTypes[];
    query: string;
    pagination: pagination;
  };
}

export interface SearchHistoryItem {
  id: string;
  query: string;
  createdAt: string;
}

export interface SearchHistoryResponse {
  success: boolean;
  data: SearchHistoryItem[];
}

export interface SearchUserResult {
  id: string;
  username: string;
  avatar?: string;
  headerPhoto?: string;
  bio?: string;
  location?: string;
  isVerified: boolean;
  createdAt: string;
  isFollowing: boolean;
  followsYou: boolean;
  canMessage: boolean;
  _count: {
    posts: number;
    followers: number;
    following: number;
  };
}

export interface SearchUsersResponse {
  success: boolean;
  data: {
    users: SearchUserResult[];
    query: string;
  };
}
