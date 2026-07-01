const DISPOSAL_TIPS: Record<string, string> = {
  Paper_Cardboard:
    'Flatten cardboard boxes and keep paper clean and dry before placing in the blue recycling bin (tong kitar semula). Remove plastic tape, staples, and plastic windows. Tissue, paper towels, and food-soiled paper/cardboard cannot be recycled — dispose as general waste.',
  Plastic:
    'Check the resin code. Rigid plastic (bottles, containers) marked 1 (PET) or 2 (HDPE) goes into the blue recycling bin — rinse first and remove caps if possible. Soft plastic (bags, wrappers, cling film) is not accepted by most kerbside recycling; reuse or look for a soft-plastic drop-off bin at major supermarkets.',
  Glass:
    'Rinse clean. Glass bottles and jars are accepted at most Malaysian recycling centres. Wrap any broken glass in newspaper before disposal for safety. Do not mix with other recyclables if broken.',
  Metal:
    'Rinse and crush food and drink cans before recycling — aluminium cans have high resale value, always recycle them. Aerosol cans must be completely empty before recycling; if still pressurised, treat as hazardous waste.',
  Fabric_Shoes:
    'Wearable clothes and shoes in good condition can be donated to Salvation Army, Junk Trunk, or Kloth Cares drop-off bins. H&M and Uniqlo stores accept worn clothing for textile recycling. Torn, heavily stained, or damaged items that cannot be donated should go to general waste.',
  Bulky_Furniture:
    'Large non-electrical furniture (sofas, tables, wardrobes, bed frames) cannot go in the regular bin. Schedule a bulky waste pickup with Alam Flora (1-800-88-1199) or your local council. Some items in good condition may be accepted by second-hand shops or NGOs.',
  E_Waste:
    'Anything with a plug, battery, or circuit board must NOT go in the regular bin — it contains toxic materials. Drop off at an e-waste collection point: AEON, Giant, and many local councils run scheduled e-waste drives. Larger appliances (fridges, TVs) can be returned via manufacturer take-back programmes or scheduled for collection by Alam Flora.',
  Organic_Waste:
    'Compost vegetable peels, food scraps, and garden waste if possible — it reduces methane from landfill. Otherwise, seal in a bag and dispose as general waste. Never mix with recyclables as food contamination ruins entire batches of recyclable material.',
  General_Trash:
    'Dispose in the general waste bin. Before discarding, check if any clean metal, glass, or plastic parts can be separated for recycling. Composite items (mixed materials that cannot be separated) such as styrofoam, heavily soiled packaging, and multilayer pouches go here.',
  'Composite Item':
    'This item appears to contain mixed materials. Separate the components where possible and dispose of each part according to its own category.',
};

const CLASS_RECYCLABILITY: Record<string, 'Recyclable' | 'Non-recyclable'> = {
  Paper_Cardboard:  'Recyclable',
  Plastic:          'Recyclable',
  Glass:            'Recyclable',
  Metal:            'Recyclable',
  Fabric_Shoes:     'Non-recyclable',
  Bulky_Furniture:  'Non-recyclable',
  E_Waste:          'Non-recyclable',
  Organic_Waste:    'Non-recyclable',
  General_Trash:    'Non-recyclable',
};

// User-friendly display names shown in the UI (model uses underscore class names internally)
const UI_LABELS: Record<string, string> = {
  Paper_Cardboard: 'Paper & Cardboard',
  Plastic:         'Plastics',
  Glass:           'Glass',
  Metal:           'Metals & Aluminium',
  Fabric_Shoes:    'Textiles & Shoes',
  Bulky_Furniture: 'Bulky Waste',
  E_Waste:         'E-Waste',
  Organic_Waste:   'Organic / Food Waste',
  General_Trash:   'General Trash',
};

export interface BinInfo {
  hex: string;    // bin color
  label: string;  // bin name shown to user
}

// Malaysian 3-bin system: Blue (paper), Brown (glass), Orange (plastic+metal)
// Special categories use purple to signal they need a separate drop-off point
const BIN_INFO: Record<string, BinInfo> = {
  Paper_Cardboard: { hex: '#3b82f6', label: 'Blue Bin' },
  Plastic:         { hex: '#f97316', label: 'Orange Bin' },
  Metal:           { hex: '#f97316', label: 'Orange Bin' },
  Glass:           { hex: '#92400e', label: 'Brown Bin' },
  Organic_Waste:   { hex: '#374151', label: 'General Waste Bin' },
  General_Trash:   { hex: '#374151', label: 'General Waste Bin' },
  E_Waste:         { hex: '#7c3aed', label: 'E-Waste Collection Point' },
  Fabric_Shoes:    { hex: '#7c3aed', label: 'Donation / Drop-off' },
  Bulky_Furniture: { hex: '#7c3aed', label: 'Council Bulky Pickup' },
};

export function getDisposalTip(label: string): string {
  return DISPOSAL_TIPS[label] ?? 'Check with your nearest recycling centre for the correct disposal method.';
}

export function getRecyclability(label: string): 'Recyclable' | 'Non-recyclable' | null {
  return CLASS_RECYCLABILITY[label] ?? null;
}

export function getUILabel(label: string): string {
  return UI_LABELS[label] ?? label.replace(/_/g, ' ');
}

export function getBinInfo(label: string): BinInfo | null {
  return BIN_INFO[label] ?? null;
}
