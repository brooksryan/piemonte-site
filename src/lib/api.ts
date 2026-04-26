import { getActiveUser } from './user';

export type Favorite = {
  id: string;
  user_name: 'brooks' | 'angela';
  entity_type: string;
  entity_slug: string;
  created_at: string;
};

export type ItineraryItem = {
  id: string;
  user_name: 'brooks' | 'angela';
  entity_type: string | null;
  entity_slug: string | null;
  position: number;
  note: string | null;
  custom_title: string | null;
  custom_body: string | null;
  time_anchor: string | null;
  created_at: string;
};

export type CalendarItem = {
  id: string;
  user_name: 'brooks' | 'angela';
  entity_type: string | null;
  entity_slug: string | null;
  on_date: string; // YYYY-MM-DD
  time_anchor: string | null;
  note: string | null;
  custom_title: string | null;
  custom_body: string | null;
  created_at: string;
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const method = init?.method ?? 'GET';
  const headers: Record<string, string> = {
    'x-user-name': getActiveUser(),
    ...(init?.headers as Record<string, string> | undefined),
  };
  if (method !== 'GET' && method !== 'DELETE') {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(path, { ...init, headers });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`API ${method} ${path} failed: ${res.status} ${text}`);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return res.json() as Promise<T>;
}

// Favorites

export function listFavorites(): Promise<Favorite[]> {
  return request<Favorite[]>('/api/favorites');
}

export function addFavorite(body: { entity_type: string; entity_slug: string }): Promise<Favorite> {
  return request<Favorite>('/api/favorites', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function removeFavorite(id: string): Promise<void> {
  return request<void>(`/api/favorites/${id}`, { method: 'DELETE' });
}

// Itinerary

export function listItinerary(): Promise<ItineraryItem[]> {
  return request<ItineraryItem[]>('/api/itinerary');
}

export function addItineraryItem(
  body: Partial<Pick<ItineraryItem, 'entity_type' | 'entity_slug' | 'note' | 'custom_title' | 'custom_body' | 'time_anchor'>>,
): Promise<ItineraryItem> {
  return request<ItineraryItem>('/api/itinerary', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function updateItineraryItem(
  id: string,
  body: Partial<Pick<ItineraryItem, 'position' | 'note' | 'custom_title' | 'custom_body' | 'time_anchor'>>,
): Promise<ItineraryItem> {
  return request<ItineraryItem>(`/api/itinerary/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export function removeItineraryItem(id: string): Promise<void> {
  return request<void>(`/api/itinerary/${id}`, { method: 'DELETE' });
}

// Calendar

export function listCalendar(opts?: { from?: string; to?: string }): Promise<CalendarItem[]> {
  const params = new URLSearchParams();
  if (opts?.from) params.set('from', opts.from);
  if (opts?.to) params.set('to', opts.to);
  const qs = params.toString();
  return request<CalendarItem[]>(`/api/calendar${qs ? `?${qs}` : ''}`);
}

export function addCalendarItem(body: {
  on_date: string;
  entity_type?: string | null;
  entity_slug?: string | null;
  time_anchor?: string | null;
  note?: string | null;
  custom_title?: string | null;
  custom_body?: string | null;
}): Promise<CalendarItem> {
  return request<CalendarItem>('/api/calendar', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function updateCalendarItem(
  id: string,
  body: Partial<Pick<CalendarItem, 'on_date' | 'time_anchor' | 'note' | 'custom_title' | 'custom_body'>>,
): Promise<CalendarItem> {
  return request<CalendarItem>(`/api/calendar/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export function removeCalendarItem(id: string): Promise<void> {
  return request<void>(`/api/calendar/${id}`, { method: 'DELETE' });
}
