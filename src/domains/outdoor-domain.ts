import { DomainConfig } from './domain-config';

// Outdoor/Adventure domain configuration (legacy support)
export const OUTDOOR_DOMAIN: DomainConfig = {
  name: 'outdoor',
  description: 'Outdoor adventure and gear configuration',
  
  usernameSuffixes: [
    'hiker', 'climber', 'explorer', 'wanderer', 'adventurer', 
    'camper', 'backpacker', 'outdoors', 'trails', 'peaks',
    'wild', 'summit', 'trek', 'journey', 'roam'
  ],
  
  bioTemplates: [
    'Passionate {activity} enthusiast. Love exploring {location}.',
    'Weekend warrior with a passion for {activity}. Always planning the next adventure!',
    '{activity} addict from {location}. Sharing my gear setups and trail stories.',
    'Outdoor photographer and {activity} enthusiast. Based in {location}.',
  ],
  
  activities: [
    'hiking', 'backpacking', 'camping', 'overlanding', 'rock climbing',
    'mountaineering', 'van life', 'car camping', 'ultralight backpacking',
    'bushcraft', 'photography', 'wildlife watching'
  ],
  
  locations: [
    'the Pacific Northwest', 'Colorado Rockies', 'California Sierra',
    'Appalachian Mountains', 'Utah desert', 'Alaska wilderness',
    'Canadian Rockies', 'Cascade Range', 'Great Smoky Mountains'
  ],
  
  categories: [
    { name: 'Shelter', description: 'Tents, tarps, and protective gear' },
    { name: 'Sleep System', description: 'Sleeping bags, pads, and comfort items' },
    { name: 'Cooking', description: 'Stoves, cookware, and food preparation' },
    { name: 'Navigation', description: 'Maps, compass, GPS, and wayfinding tools' },
    { name: 'Safety', description: 'First aid, emergency, and safety equipment' },
    { name: 'Clothing', description: 'Base layers, shells, and outdoor apparel' },
    { name: 'Electronics', description: 'Lights, batteries, communication devices' },
    { name: 'Tools', description: 'Knives, multi-tools, and utility items' },
    { name: 'Hydration', description: 'Water bottles, filters, and treatment' },
    { name: 'Vehicle', description: 'Overland and camping vehicle modifications' },
  ],
  
  setupTypes: {
    'Vehicle': [
      'Weekend Car Camping',
      'Extended Overland Trip',
      'Daily Driver + Adventure',
      'Base Camp Setup',
      'Minimalist Mobile',
      'Full-Time Van Life',
      'Expedition Rig',
      'Hunting/Fishing Mobile Base'
    ],
    'Backpack': [
      'Day Hiking Essentials',
      'Overnight Backpacking',
      'Multi-day Wilderness Trek',
      'Ultralight Minimalist',
      'Photography Hiking Kit',
      'Peak Bagging Setup',
      'Winter Backpacking',
      'Desert Adventure Pack'
    ]
  },
  
  setupDescriptors: {
    'Vehicle': [
      'Overland', 'Adventure', 'Expedition', 'Journey', 'Explorer',
      'Wanderer', 'Nomad', 'Trail', 'Backcountry', 'Wilderness'
    ],
    'Backpack': [
      'Minimalist', 'Ultralight', 'Essential', 'Complete', 'Tested',
      'Proven', 'Reliable', 'Compact', 'Versatile', 'Optimized'
    ]
  },
  
  titleDescriptors: {
    'Vehicle': [
      'Overland', 'Adventure', 'Expedition', 'Journey', 'Explorer',
      'Wanderer', 'Nomad', 'Trail', 'Backcountry', 'Wilderness'
    ],
    'Backpack': [
      'Minimalist', 'Ultralight', 'Essential', 'Complete', 'Tested',
      'Proven', 'Reliable', 'Compact', 'Versatile', 'Optimized'
    ],
    'General': [
      'Adventure', 'Essential', 'Complete', 'Tested', 'Proven',
      'Reliable', 'Versatile', 'Optimized', 'Custom', 'Professional'
    ]
  },
  
  experiences: [
    'after several seasons of testing',
    'refined through multiple adventures',
    'proven on countless trips',
    'optimized for reliability and comfort',
    'developed through trial and error',
    'battle-tested in various conditions'
  ],
  
  contexts: [
    'mountain trails', 'desert landscapes', 'forest backroads', 
    'coastal routes', 'alpine environments', 'wilderness areas',
    'national parks', 'backcountry locations'
  ],
  
  contentPatterns: {
    titles: [
      'My {descriptor} {type} Setup',
      '{descriptor} Gear for {activity}',
      'The Ultimate {type} Configuration',
      '{season} {activity} Essentials',
      'Budget-Friendly {type} Build'
    ],
    descriptions: [
      'Everything needed for {activity} adventures',
      'Carefully curated gear for {location} exploration',
      'Time-tested setup for serious {activity} enthusiasts',
      'Lightweight and efficient {type} configuration',
      'Perfect balance of comfort and functionality'
    ]
  }
};