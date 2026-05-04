export interface InstagramProfile {
  username: string;
  fullName: string;
  bio: string;
  avatar: string;
  followers: number;
  following: number;
  postCount: number;
}

export interface InstagramMedia {
  id: string;
  url: string;
  isVideo: boolean;
  videoUrl: string | null;
  caption: string;
  type: 'Post' | 'Reel' | 'Story';
  likes: number;
  comments: number;
}

export type Category = 'All' | 'Post' | 'Reel' | 'Story';
