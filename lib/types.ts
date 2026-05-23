export interface ProjectData {
  project_title: string;
  country_province: string;
  latitude: number;
  longitude: number;
  direct_beneficiaries: number;
  indirect_beneficiaries: number;
}

export interface Species {
  id: string;
  commonName: string;
  scientificName: string;
  category: string;
  taxonomicGroup: string;
  region: string;
  ecosystem: string;
  lat: number;
  lng: number;
  imageUrl: string;
  imageCredit: string;
  description?: string;
  endangerment?: string;
  ecosystemNeeds?: string;
  actions?: string;
  threatTypes: string[];
  iucnUrl?: string;
  range?: {
    type: string;
    coordinates: number[][][];
  };
  content: Record<string, Record<string, string>>;
}
