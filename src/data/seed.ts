import type { Comment, Template, User, Video } from '@/types';

// Starter content so the feed is not empty on first launch.
// When the cloud backend is connected, this comes from the server instead.

export const SEED_USERS: User[] = [
  { id: 'u_nova', username: 'nova.films', displayName: 'Nova', avatarColor: '#FF3D7F', bio: 'Tiny clips, big dreams.', followers: 48200 },
  { id: 'u_kai', username: 'kai_creates', displayName: 'Kai', avatarColor: '#8B5CF6', bio: 'Space nerd. Every video is a trip.', followers: 12900 },
  { id: 'u_lumi', username: 'lumi.family', displayName: 'Lumi', avatarColor: '#38BDF8', bio: 'Bedtime adventures for the whole family.', followers: 30750 },
  { id: 'u_rex', username: 'rex.directs', displayName: 'Rex', avatarColor: '#F59E0B', bio: 'AI director. Fantasy worlds daily.', followers: 7600 },
  { id: 'u_mira', username: 'mira.north', displayName: 'Mira', avatarColor: '#10B981', bio: 'Chasing northern lights, one clip at a time.', followers: 21400 },
  { id: 'u_omar', username: 'omar.dunes', displayName: 'Omar', avatarColor: '#F97316', bio: 'Desert stories and golden hours.', followers: 15800 },
  { id: 'u_zoe', username: 'zoe.glitch', displayName: 'Zoe', avatarColor: '#8B5CF6', bio: 'Neon, glitches and dance clips.', followers: 63100 },
  { id: 'u_leo', username: 'leo.wild', displayName: 'Leo', avatarColor: '#22C55E', bio: 'Forest explorer. Dinosaurs welcome.', followers: 9300 },
  { id: 'u_ana', username: 'ana.sketches', displayName: 'Ana', avatarColor: '#EC4899', bio: 'Watercolor worlds and calm vibes.', followers: 4700 },
  { id: 'u_theo', username: 'theo.outdoors', displayName: 'Theo', avatarColor: '#4D7C5B', bio: 'Real places, filmed slow. Waterfalls, rivers and quiet trails.', followers: 18300 },
  { id: 'u_jay', username: 'jay.speed', displayName: 'Jay', avatarColor: '#38BDF8', bio: 'Superhero clips, fast and loud.', followers: 37900 },
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
  {
    id: 'v_aurora', creatorId: 'u_mira', title: 'Dancing under the aurora',
    prompt: 'I dance under green northern lights on a frozen lake',
    source: { clip: 'aurora' }, likes: 15230, shares: 1210, remixAllowed: true,
    tags: ['aurora', 'nature', 'calm'], visibility: 'public', createdAt: now - 4 * hour,
  },
  {
    id: 'v_aurora2', creatorId: 'u_mira', title: 'Ice castle at midnight',
    prompt: 'I walk into a glowing ice castle under the arctic sky',
    source: { clip: 'aurora' }, likes: 5320, shares: 280, remixAllowed: true,
    tags: ['aurora', 'fantasy', 'winter'], visibility: 'public', createdAt: now - 40 * hour,
  },
  {
    id: 'v_desert', creatorId: 'u_omar', title: 'Golden hour on the dunes',
    prompt: 'I ride a camel across golden sand dunes at sunset',
    source: { clip: 'desert' }, likes: 8840, shares: 640, remixAllowed: true,
    tags: ['desert', 'travel', 'sunset'], visibility: 'public', createdAt: now - 9 * hour,
  },
  {
    id: 'v_desert2', creatorId: 'u_omar', title: 'The lost desert city',
    prompt: 'I find a hidden city buried in the sand. Then the gates open',
    source: { clip: 'desert' }, likes: 3120, shares: 150, remixAllowed: false,
    tags: ['desert', 'adventure', 'mystery'], visibility: 'public', createdAt: now - 60 * hour,
  },
  {
    id: 'v_neon', creatorId: 'u_zoe', title: 'Glitch dance',
    prompt: 'I dance in a neon club where the walls turn into code',
    source: { clip: 'neon' }, likes: 41200, shares: 5300, remixAllowed: true,
    tags: ['neon', 'dance', 'scifi'], visibility: 'public', createdAt: now - 2 * hour,
  },
  {
    id: 'v_neon2', creatorId: 'u_zoe', title: 'Hacker in the matrix',
    prompt: 'I am a hacker falling through glowing purple code',
    source: { clip: 'neon' }, likes: 12100, shares: 900, remixAllowed: true,
    tags: ['neon', 'scifi', 'action'], visibility: 'public', createdAt: now - 20 * hour,
  },
  {
    id: 'v_forest', creatorId: 'u_leo', title: 'A dinosaur in my garden',
    prompt: 'A friendly dinosaur walks out of the forest into my garden',
    source: { clip: 'forest' }, likes: 7400, shares: 820, remixAllowed: true,
    tags: ['forest', 'family', 'dinosaur'], visibility: 'public', createdAt: now - 6 * hour,
  },
  {
    id: 'v_forest2', creatorId: 'u_ana', title: 'Watercolor forest walk',
    prompt: 'A calm watercolor walk through a magical forest',
    source: { clip: 'forest' }, likes: 2600, shares: 90, remixAllowed: true,
    tags: ['forest', 'calm', 'art'], visibility: 'public', createdAt: now - 30 * hour,
  },
  {
    id: 'v_jay', creatorId: 'u_jay', title: 'My version: I saved New York',
    prompt: 'I am a superhero flying over New York and saving a cat from a rooftop',
    source: { clip: 'hero' }, likes: 11800, shares: 700, remixAllowed: true, remixOfId: 'v_hero',
    tags: ['superhero', 'action', 'newyork'], visibility: 'public', createdAt: now - 5 * hour,
  },
  {
    id: 'v_ana', creatorId: 'u_ana', title: 'My version: sleigh ride',
    prompt: 'A child rides in Santa’s sleigh over snowy rooftops, in watercolor',
    source: { clip: 'christmas' }, likes: 3900, shares: 210, remixAllowed: true, remixOfId: 'v_xmas',
    tags: ['christmas', 'art', 'family'], visibility: 'public', createdAt: now - 12 * hour,
  },
  {
    id: 'v_zoe3', creatorId: 'u_zoe', title: 'My version: Mars dance party',
    prompt: 'I land on Mars and start a dance party in the red canyon',
    source: { clip: 'mars' }, likes: 22600, shares: 2400, remixAllowed: true, remixOfId: 'v_mars',
    tags: ['space', 'dance', 'mars'], visibility: 'public', createdAt: now - 8 * hour,
  },
  {
    id: 'v_mira3', creatorId: 'u_mira', title: 'My version: whales under the ice',
    prompt: 'I swim with whales under an icy ocean',
    source: { clip: 'ocean' }, likes: 6100, shares: 330, remixAllowed: true, remixOfId: 'v_ocean',
    tags: ['ocean', 'calm', 'aurora'], visibility: 'public', createdAt: now - 26 * hour,
  },
  {
    id: 'v_waterfall', creatorId: 'u_theo', title: 'Morning at the hidden waterfall',
    prompt: 'A quiet waterfall deep in the mountains, just after sunrise',
    source: { clip: 'waterfall' }, likes: 19800, shares: 1430, remixAllowed: true,
    tags: ['nature', 'waterfall', 'calm', 'real'], visibility: 'public', createdAt: now - 1.5 * hour,
    credit: 'Video: Arie m den toom · CC BY 4.0 · Wikimedia Commons',
  },
  {
    id: 'v_waterfall2', creatorId: 'u_theo', title: 'Stand under it with me',
    prompt: 'I stand under a cold mountain waterfall. Then I climb the rocks beside it',
    source: { clip: 'waterfall' }, likes: 6400, shares: 380, remixAllowed: true,
    tags: ['nature', 'waterfall', 'adventure', 'real'], visibility: 'public', createdAt: now - 33 * hour,
    credit: 'Video: Arie m den toom · CC BY 4.0 · Wikimedia Commons',
  },
];

export const SEED_COMMENTS: Comment[] = [
  { id: 'c1', videoId: 'v_hero', userId: 'u_kai', text: 'The cat deserves a medal 😂', createdAt: now - 2 * hour },
  { id: 'c2', videoId: 'v_hero', userId: 'u_rex', text: 'Making my version right now', createdAt: now - hour },
  { id: 'c3', videoId: 'v_xmas', userId: 'u_nova', text: 'This is so sweet ❤️', createdAt: now - 20 * hour },
  { id: 'c4', videoId: 'v_mars', userId: 'u_lumi', text: 'What is in the cave?!', createdAt: now - 6 * hour },
  { id: 'c5', videoId: 'v_neon', userId: 'u_jay', text: 'The walls turning into code 🤯', createdAt: now - hour },
  { id: 'c6', videoId: 'v_neon', userId: 'u_mira', text: 'Teach me this dance', createdAt: now - hour },
  { id: 'c7', videoId: 'v_aurora', userId: 'u_ana', text: 'So peaceful 💚', createdAt: now - 3 * hour },
  { id: 'c8', videoId: 'v_forest', userId: 'u_lumi', text: 'My kids would love this one', createdAt: now - 5 * hour },
  { id: 'c10', videoId: 'v_waterfall', userId: 'u_mira', text: 'I can almost hear it 💧', createdAt: now - hour },
  { id: 'c11', videoId: 'v_waterfall', userId: 'u_leo', text: 'Where is this? Adding it to my list', createdAt: now - 0.5 * hour },
  { id: 'c9', videoId: 'v_zoe3', userId: 'u_kai', text: 'Best remix of my Mars clip so far!', createdAt: now - 7 * hour },
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
