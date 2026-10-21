export interface DateResultItem {
  id: string;
  startsAt: Date;
  createdAt: Date;
  changedAt: Date;
  count: number;
  percentage: number;
  voterNames: string[];
  isTop: boolean;
  isTie: boolean;
  isAllFree: boolean;
  isEdited: boolean;
}

export interface PlaceResultItem {
  id: string;
  name: string;
  url: string | null;
  note: string | null;
  createdAt: Date;
  changedAt: Date;
  count: number;
  percentage: number;
  voterNames: string[];
  isTop: boolean;
  isTie: boolean;
  isEdited: boolean;
}

export interface GatheringsResults {
  totalParticipants: number;
  dates: DateResultItem[];
  places: PlaceResultItem[];
  bestDates: DateResultItem[];
  bestPlaces: PlaceResultItem[];
}

export interface RawDateOptionInput {
  id: string;
  startsAt: Date;
  createdAt: Date;
  changedAt: Date;
  votes: {
    participant: {
      id: string;
      name: string;
    };
  }[];
}

export interface RawPlaceOptionInput {
  id: string;
  name: string;
  url: string | null;
  note: string | null;
  createdAt: Date;
  changedAt: Date;
  votes: {
    participant: {
      id: string;
      name: string;
    };
  }[];
}

export interface RawParticipantInput {
  id: string;
  name: string;
  nameKey: string;
}

export function calculateResults(
  rawDates: RawDateOptionInput[],
  rawPlaces: RawPlaceOptionInput[],
  rawParticipants: RawParticipantInput[]
): GatheringsResults {
  const totalParticipants = rawParticipants.length;

  const dateItems: DateResultItem[] = rawDates.map((d) => {
    const voterNames = d.votes.map((v) => v.participant.name);
    const count = voterNames.length;
    const percentage = totalParticipants > 0 ? Math.round((count / totalParticipants) * 100) : 0;
    const isEdited = new Date(d.changedAt).getTime() > new Date(d.createdAt).getTime();

    return {
      id: d.id,
      startsAt: new Date(d.startsAt),
      createdAt: new Date(d.createdAt),
      changedAt: new Date(d.changedAt),
      count,
      percentage,
      voterNames,
      isTop: false,
      isTie: false,
      isAllFree: totalParticipants > 0 && count === totalParticipants,
      isEdited,
    };
  });

  // Sort dates: count descending, then startsAt ascending
  dateItems.sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return a.startsAt.getTime() - b.startsAt.getTime();
  });

  const maxDateCount = dateItems.length > 0 ? Math.max(...dateItems.map((d) => d.count)) : 0;
  const topDates = maxDateCount > 0 ? dateItems.filter((d) => d.count === maxDateCount) : [];
  const isDateTie = topDates.length > 1;

  for (const d of dateItems) {
    if (maxDateCount > 0 && d.count === maxDateCount) {
      d.isTop = true;
      d.isTie = isDateTie;
    }
  }

  // Process places
  const placeItems: PlaceResultItem[] = rawPlaces.map((p) => {
    const voterNames = p.votes.map((v) => v.participant.name);
    const count = voterNames.length;
    const percentage = totalParticipants > 0 ? Math.round((count / totalParticipants) * 100) : 0;
    const isEdited = new Date(p.changedAt).getTime() > new Date(p.createdAt).getTime();

    return {
      id: p.id,
      name: p.name,
      url: p.url,
      note: p.note,
      createdAt: new Date(p.createdAt),
      changedAt: new Date(p.changedAt),
      count,
      percentage,
      voterNames,
      isTop: false,
      isTie: false,
      isEdited,
    };
  });

  // Sort places: count descending, then createdAt ascending
  placeItems.sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return a.createdAt.getTime() - b.createdAt.getTime();
  });

  const maxPlaceCount = placeItems.length > 0 ? Math.max(...placeItems.map((p) => p.count)) : 0;
  const topPlaces = maxPlaceCount > 0 ? placeItems.filter((p) => p.count === maxPlaceCount) : [];
  const isPlaceTie = topPlaces.length > 1;

  for (const p of placeItems) {
    if (maxPlaceCount > 0 && p.count === maxPlaceCount) {
      p.isTop = true;
      p.isTie = isPlaceTie;
    }
  }

  return {
    totalParticipants,
    dates: dateItems,
    places: placeItems,
    bestDates: topDates,
    bestPlaces: topPlaces,
  };
}
