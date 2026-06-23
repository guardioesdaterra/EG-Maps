export interface CrewRegionHistory {
  year: number
  activeCrews: number
  inactiveCrews: number
  members: number
  countries: number
}

export interface CrewRegionData {
  id: string
  region: string
  latitude: number
  longitude: number
  activeCrews: number
  inactiveCrews: number
  totalMembers: number
  countries: number
  history: CrewRegionHistory[]
}

export const allCrewRegionsData: CrewRegionData[] = [
  {
    id: 'north-america',
    region: 'North America',
    latitude: 40.0,
    longitude: -100.0,
    activeCrews: 13,
    inactiveCrews: 5,
    totalMembers: 146,
    countries: 3,
    history: [
      { year: 2022, activeCrews: 10, inactiveCrews: 0, members: 203, countries: 3 },
      { year: 2023, activeCrews: 12, inactiveCrews: 0, members: 91, countries: 3 },
      { year: 2024, activeCrews: 12, inactiveCrews: 5, members: 79, countries: 3 },
      { year: 2025, activeCrews: 12, inactiveCrews: 5, members: 79, countries: 3 },
      { year: 2026, activeCrews: 13, inactiveCrews: 5, members: 146, countries: 3 },
    ],
  },
  {
    id: 'south-america',
    region: 'South America',
    latitude: -15.0,
    longitude: -60.0,
    activeCrews: 7,
    inactiveCrews: 1,
    totalMembers: 55,
    countries: 4,
    history: [
      { year: 2022, activeCrews: 4, inactiveCrews: 0, members: 39, countries: 2 },
      { year: 2023, activeCrews: 5, inactiveCrews: 0, members: 40, countries: 2 },
      { year: 2024, activeCrews: 3, inactiveCrews: 1, members: 35, countries: 1 },
      { year: 2025, activeCrews: 5, inactiveCrews: 1, members: 40, countries: 2 },
      { year: 2026, activeCrews: 7, inactiveCrews: 1, members: 55, countries: 4 },
    ],
  },
  {
    id: 'europe',
    region: 'Europe',
    latitude: 50.0,
    longitude: 10.0,
    activeCrews: 8,
    inactiveCrews: 1,
    totalMembers: 87,
    countries: 5,
    history: [
      { year: 2022, activeCrews: 2, inactiveCrews: 0, members: 22, countries: 1 },
      { year: 2023, activeCrews: 4, inactiveCrews: 0, members: 59, countries: 2 },
      { year: 2024, activeCrews: 4, inactiveCrews: 1, members: 63, countries: 2 },
      { year: 2025, activeCrews: 5, inactiveCrews: 1, members: 80, countries: 2 },
      { year: 2026, activeCrews: 8, inactiveCrews: 1, members: 87, countries: 5 },
    ],
  },
  {
    id: 'africa',
    region: 'Africa',
    latitude: 2.0,
    longitude: 20.0,
    activeCrews: 80,
    inactiveCrews: 17,
    totalMembers: 782,
    countries: 25,
    history: [
      { year: 2022, activeCrews: 38, inactiveCrews: 0, members: 237, countries: 10 },
      { year: 2023, activeCrews: 22, inactiveCrews: 0, members: 265, countries: 10 },
      { year: 2024, activeCrews: 28, inactiveCrews: 18, members: 257, countries: 14 },
      { year: 2025, activeCrews: 68, inactiveCrews: 18, members: 681, countries: 20 },
      { year: 2026, activeCrews: 80, inactiveCrews: 17, members: 782, countries: 25 },
    ],
  },
  {
    id: 'east-asia',
    region: 'East Asia',
    latitude: 35.0,
    longitude: 120.0,
    activeCrews: 4,
    inactiveCrews: 2,
    totalMembers: 42,
    countries: 3,
    history: [
      { year: 2022, activeCrews: 3, inactiveCrews: 0, members: 30, countries: 2 },
      { year: 2023, activeCrews: 4, inactiveCrews: 0, members: 36, countries: 2 },
      { year: 2024, activeCrews: 3, inactiveCrews: 2, members: 38, countries: 2 },
      { year: 2025, activeCrews: 3, inactiveCrews: 2, members: 38, countries: 2 },
      { year: 2026, activeCrews: 4, inactiveCrews: 2, members: 42, countries: 3 },
    ],
  },
  {
    id: 'south-asia',
    region: 'South Asia',
    latitude: 22.0,
    longitude: 78.0,
    activeCrews: 13,
    inactiveCrews: 0,
    totalMembers: 121,
    countries: 7,
    history: [
      { year: 2022, activeCrews: 3, inactiveCrews: 0, members: 35, countries: 2 },
      { year: 2023, activeCrews: 3, inactiveCrews: 0, members: 50, countries: 2 },
      { year: 2024, activeCrews: 3, inactiveCrews: 0, members: 49, countries: 2 },
      { year: 2025, activeCrews: 10, inactiveCrews: 0, members: 120, countries: 4 },
      { year: 2026, activeCrews: 13, inactiveCrews: 0, members: 121, countries: 7 },
    ],
  },
  {
    id: 'oceania',
    region: 'Oceania',
    latitude: -25.0,
    longitude: 135.0,
    activeCrews: 0,
    inactiveCrews: 0,
    totalMembers: 0,
    countries: 0,
    history: [
      { year: 2022, activeCrews: 0, inactiveCrews: 0, members: 0, countries: 0 },
      { year: 2023, activeCrews: 0, inactiveCrews: 0, members: 0, countries: 0 },
      { year: 2024, activeCrews: 0, inactiveCrews: 0, members: 0, countries: 0 },
      { year: 2025, activeCrews: 0, inactiveCrews: 0, members: 0, countries: 0 },
      { year: 2026, activeCrews: 0, inactiveCrews: 0, members: 0, countries: 0 },
    ],
  },
]

export const crewOverallStats = {
  totalActiveCrews: 131,
  totalInactiveCrews: 26,
  totalMembers: 1241,
  totalCountries: 47,
  lastAuditDate: '2026-01-31',
}
