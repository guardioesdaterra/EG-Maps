export interface CarouselItem {
  title: string;
  description: string;
  id: number;
  icon: string;
  path?: string;
  path2d?: string;
  path3d?: string;
  color?: string;
}

export interface CarouselProps {
  items?: CarouselItem[];
  baseWidth?: number;
  autoplay?: boolean;
  autoplayDelay?: number;
  pauseOnHover?: boolean;
  loop?: boolean;
  round?: boolean;
}

export const DEFAULT_ITEMS: CarouselItem[] = [
  { title: 'Project Grants', description: 'Explore global grant initiatives and their impact on communities worldwide.', id: 1, icon: 'tabler:heart', path2d: '/project-grants', path3d: '/project-grants/3d', color: '#10bfae' },
  { title: 'Endangered Species', description: 'Discover critically endangered species and their habitats around the world.', id: 2, icon: 'tabler:feather', path2d: '/endangered-species', path3d: '/endangered-species/3d', color: '#22c55e' },
  { title: 'Vulcan Observatory', description: 'Brazil rare earth mining claims — capital invasion, corporate networks, military interests & socio-environmental impact.', id: 3, icon: 'tabler:volcano', path2d: '/vulcan-observatory', path3d: '/vulcan-observatory/3d', color: '#f59e0b' },
  { title: 'Crews Map', description: 'Explore Earth Guardians crews across 7 regions worldwide.', id: 4, icon: 'tabler:users', path: '/active-crews', color: '#38bdf8' },
  { title: 'Large Scale Projects', description: 'Large-scale and small-scale projects led by EG Crews around the world.', id: 5, icon: 'tabler:rocket', path: '/crew-projects', color: '#a78bfa' },
];
