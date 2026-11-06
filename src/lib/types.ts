/** Shapes returned by eventspot-api (see prisma/schema.prisma). */

export type EventCategory =
  | 'food'
  | 'nightlife'
  | 'music'
  | 'sports'
  | 'art'
  | 'festival'
  | 'corporate'
  | 'community'
  | 'cinema'
  | 'wellness'
  | 'food_truck'
  | 'other';

export type EventStatus = 'draft' | 'published' | 'live' | 'finished' | 'cancelled';
export type AccountType = 'user' | 'business' | 'admin';

export interface User {
  id: string;
  username: string;
  email: string;
  avatarUrl: string | null;
  bio: string | null;
  accountType: AccountType;
  isVerified: boolean;
  createdAt: string;
}

export interface Location {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  country: string | null;
  latitude: number;
  longitude: number;
}

export interface EventSummary {
  id: string;
  title: string;
  description: string | null;
  coverUrl: string | null;
  category: EventCategory;
  status: EventStatus;
  isFree: boolean;
  price: number | null;
  currency: string | null;
  startAt: string;
  endAt: string;
  locationId: string;
  organizerId: string;
  maxCapacity: number | null;
  currentAttendees: number;
}

/** Rows from the geo queries (nearby / trending) carry flattened venue fields. */
export interface NearbyEvent extends EventSummary {
  locationName: string;
  locationAddress: string | null;
  latitude: number;
  longitude: number;
  distance_km?: number;
}

export interface EventDetail extends EventSummary {
  location: Location;
  tags: { tag: string }[];
  organizer: { id: string; username: string; avatarUrl: string | null };
  /** Set when published on behalf of a community. */
  community: CommunityRef | null;
}

export type EventWithLocation = EventSummary & { location: Location };

/** GET /users/me/feed row: an event plus who it comes from. */
export type FeedEvent = EventWithLocation & {
  community: CommunityRef | null;
  organizer: UserRef & { accountType: AccountType };
};

/** Groups users create from their profile; anyone can join, only the owner publishes. */
export interface Community {
  id: string;
  name: string;
  description: string | null;
  avatarUrl: string | null;
  category: EventCategory | null;
  ownerId: string;
  createdAt: string;
  membersCount: number;
}

export type CommunityRef = Pick<Community, 'id' | 'name' | 'avatarUrl'>;

/** GET /communities/:id — with the viewer's membership. */
export interface CommunityDetail extends Community {
  owner: UserRef;
  isMember: boolean;
  isOwner: boolean;
}

export interface MapPin {
  id: string;
  latitude: number;
  longitude: number;
  category: EventCategory;
  status: EventStatus;
  currentAttendees: number;
  title: string;
  startAt: string;
  endAt: string;
}

export interface Attendee {
  userId: string;
  user: { id: string; username: string; avatarUrl: string | null };
}

export interface Photo {
  id: string;
  eventId: string;
  uploaderId: string;
  url: string;
  thumbnailUrl: string | null;
  caption: string | null;
  likesCount: number;
  likedByMe: boolean;
  uploadedAt: string;
  uploader: UserRef;
}

/** The compact user shape embedded in other resources. */
export interface UserRef {
  id: string;
  username: string;
  avatarUrl: string | null;
}

/** GET /users/:id — another user's profile (email only present for yourself). */
export interface PublicUser extends Omit<User, 'email'> {
  email?: string;
  stats: UserStats;
  isFollowing: boolean;
}

export type NotificationType =
  | 'event_starting'
  | 'new_attendee'
  | 'event_updated'
  | 'event_cancelled'
  | 'new_photo'
  | 'new_follower'
  | 'event_recommendation';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  data: { eventId?: string; userId?: string; photoId?: string } | null;
  isRead: boolean;
  createdAt: string;
}

export interface Paginated<T> {
  data: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export interface UserStats {
  eventsAttended: number;
  /** Public events the user organizes (published, live or finished). */
  eventsCreated: number;
  photosShared: number;
  followers: number;
  following: number;
  savedEvents: number;
}

export interface Tokens {
  accessToken: string;
  refreshToken: string;
}

export interface CreateEventInput {
  title: string;
  description?: string;
  category: EventCategory;
  startAt: string;
  endAt: string;
  organizerType: 'user' | 'business';
  isFree?: boolean;
  price?: number;
  currency?: string;
  maxCapacity?: number;
  tags?: string[];
  /** Publish on behalf of a community the organizer owns. */
  communityId?: string;
  location: {
    name: string;
    address?: string;
    city?: string;
    latitude: number;
    longitude: number;
  };
}
