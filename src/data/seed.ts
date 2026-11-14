import type { Comment, Template, User, Video } from '@/types';

// Starter content so the feed is not empty on first launch.
// When the cloud backend is connected, this comes from the server instead.

export const SEED_USERS: User[] = [
  { id: 'u_nova', username: 'nova.films', displayName: 'Nova', avatarColor: '#FF3D7F', bio: 'Tiny movies, big dreams.', followers: 48200 },
  { id: 'u_kai', username: 'kai_creates', displayName: 'Kai', avatarColor: '#8B5CF6', bio: 'Space nerd. Every video is a trip.', followers: 12900 },
  { id: 'u_lumi', username: 'lumi.family', displayName: 'Lumi', avatarColor: '#38BDF8', bio: 'Bedtime adventures for the whole family.', followers: 30750 },
  { id: 'u_rex', username: 'rex.directs', displayName: 'Rex', avatarColor: '#F59E0B', bio: 'AI director. Fantasy worlds daily.', followers: 7600 },
];

const hour = 3600_000;
const now = Date.now();

export const SEED_VIDEOS: Video[] = [
  {
    id: 'v_hero', creatorId: 'u_nova', title: 'I saved New York (kind of)',
    prompt: 'I am a superhero flying over New York and saving a cat from a rooftop',
    source: { clip: 'hero' }, likes: 18432, shares: 950, remixAllowed: true,
    tags: ['superhero', 'newyork', 'action'], visibility: 'public', createdAt: now - 3 * hour,
  },
  {
    id: 'v_mars', creatorId: 'u_kai', title: 'First steps on Mars',
    prompt: 'I am an astronaut landing on Mars. Then I find a glowing cave',
    source: { clip: 'mars' }, likes: 9211, shares: 410, remixAllowed: true,
    tags: ['space', 'mars', 'scifi'], visibility: 'public', createdAt: now - 7 * hour,
  },
  {
    id: 'v_xmas', creatorId: 'u_lumi', title: 'A sleigh ride with Santa',
    prompt: 'A child rides in Santa’s sleigh over snowy rooftops on Christmas Eve',
    source: { clip: 'christmas' }, likes: 25120, shares: 3020, remixAllowed: true,
    tags: ['christmas', 'family', 'magic'], visibility: 'public', createdAt: now - 26 * hour,
  },
  {
    id: 'v_fantasy', creatorId: 'u_rex', title: 'The portal behind my house',
    prompt: 'I open a door and fall into a fractal fantasy world full of colour',
    source: { clip: 'fantasy' }, likes: 4410, shares: 120, remixAllowed: false,
    tags: ['fantasy', 'portal', 'trippy'], visibility: 'public', createdAt: now - 30 * hour,
  },
  {
    id: 'v_ocean', creatorId: 'u_lumi', title: 'Swimming with whales',
    prompt: 'I dive into a glowing ocean and swim next to friendly whales',
    source: { clip: 'ocean' }, likes: 13008, shares: 860, remixAllowed: true,
    tags: ['ocean', 'family', 'calm'], visibility: 'public', createdAt: now - 50 * hour,
  },
  {
    id: 'v_city', creatorId: 'u_kai', title: 'Neon city of tiny robots',
    prompt: 'A city of neon lights where tiny robots build everything overnight',
    source: { clip: 'city' }, likes: 6720, shares: 300, remixAllowed: true,
    tags: ['robots', 'city', 'scifi'], visibility: 'public', createdAt: now - 70 * hour,
  },
];

export const SEED_COMMENTS: Comment[] = [
  { id: 'c1', videoId: 'v_hero', userId: 'u_kai', text: 'The cat deserves a medal 😂', createdAt: now - 2 * hour },
  { id: 'c2', videoId: 'v_hero', userId: 'u_rex', text: 'Making my version right now', createdAt: now - hour },
  { id: 'c3', videoId: 'v_xmas', userId: 'u_nova', text: 'This is so sweet ❤️', createdAt: now - 20 * hour },
  { id: 'c4', videoId: 'v_mars', userId: 'u_lumi', text: 'What is in the cave?!', createdAt: now - 6 * hour },
];

export const TEMPLATES: Template[] = [
  { id: 't_hero', title: 'Superhero rescue', prompt: 'I am a superhero flying over the city. Then I rescue someone from danger. Finally the crowd cheers', style: 'Cinematic', clip: 'hero', familyFriendly: true },
  { id: 't_mars', title: 'Astronaut on Mars', prompt: 'I am an astronaut landing on Mars. Then I explore a red canyon. Finally I plant a flag', style: 'Sci-fi', clip: 'mars', familyFriendly: true },
  { id: 't_santa', title: 'Christmas with Santa', prompt: 'I meet Santa at the North Pole. Then we ride the sleigh over snowy rooftops. Finally we deliver presents', style: 'Animated 3D', clip: 'christmas', familyFriendly: true },
  { id: 't_fantasy', title: 'Fantasy hero', prompt: 'I am the hero of a fantasy kingdom. Then I tame a friendly dragon. Finally I am crowned', style: 'Fantasy', clip: 'fantasy', familyFriendly: true },
  { id: 't_ocean', title: 'Ocean explorer', prompt: 'I dive into a glowing ocean. Then I swim with whales. Finally I find a sunken treasure', style: 'Cinematic', clip: 'ocean', familyFriendly: true },
  { id: 't_noir', title: 'Detective noir', prompt: 'I am a detective in a rainy city at night. Then I find a mysterious clue. Finally I solve the case', style: 'Noir', clip: 'city', familyFriendly: false },
  { id: 't_anime', title: 'Anime opening', prompt: 'I run across a rooftop at sunset. Then my friends join me. Finally we look at the sky together', style: 'Anime', clip: 'city', familyFriendly: true },
];
