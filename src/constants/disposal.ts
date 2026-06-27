const DISPOSAL_TIPS: Record<string, string> = {
  Battery:
    'Drop at an e-waste collection point (Giant, AEON, or your local council scheduled collection). Never throw in a regular bin — batteries contain toxic heavy metals.',
  Biological:
    'Compost vegetable and food scraps if possible. Otherwise, seal in a bag and dispose as general waste. Never mix with recyclables.',
  Cardboard:
    'Flatten before placing in the blue recycling bin (tong kitar semula). Remove tape and plastic windows. Wet or heavily soiled cardboard goes to general waste.',
  Clothes:
    'Wearable items in good condition can be donated to Salvation Army, Junk Trunk, or charity bins. H&M and Uniqlo stores also accept worn clothing for recycling. Torn or heavily stained clothing cannot be donated — look for a textile recycling bin, or dispose as general waste if none is available.',
  Glass:
    'Rinse clean. Glass bottles and jars are accepted at most Malaysian recycling centres. Wrap any broken glass in newspaper before disposal for safety.',
  Metal:
    'Rinse and crush food and drink cans before recycling — aluminium cans have high resale value, always recycle them. Aerosol cans must be completely empty before recycling; if still pressurised, treat as hazardous waste instead.',
  Paper:
    'Clean, dry paper (newspaper, office paper, envelopes without plastic windows) goes straight into the blue recycling bin. Tissue, paper towels, and food-soiled paper cannot be recycled — these go to general waste.',
  Plastic:
    'Check what kind of plastic it is. Rigid plastic (bottles, containers) with resin code 1 (PET) or 2 (HDPE) goes into the blue recycling bin — rinse first and remove caps if possible. Soft plastic (bags, wrappers, cling film) is rejected by most kerbside recycling; reuse it, or look for a dedicated soft-plastic drop-off bin at major supermarkets.',
  Shoes:
    'Shoes are made from rubber, leather, textile, and adhesive composites that cannot be separated by standard recycling machinery. Donate wearable pairs in good condition to charity bins, or return them via Adidas/Nike in-store take-back programs. Heavily worn or damaged shoes should be disposed as general waste.',
  Trash:
    'Dispose as general waste. Before discarding, check if any metal or clean plastic parts can be separated for recycling.',
  recyclable:
    'Place in the blue recycling bin (tong kitar semula). Ensure the item is clean and dry — contaminated recyclables end up in landfill.',
  'non-recyclable':
    'Dispose in the general waste bin. If unsure about an item, contact your local council (pihak berkuasa tempatan) for guidance.',
  'Composite Item':
    'This item contains mixed materials. Separate the components where possible and dispose of each part according to its own category.'
};

// Practical recycling-stream classification for each of the 10 advanced-mode classes.
// "Recyclable" = accepted in standard kerbside/blue-bin recycling.
// "Non-recyclable" = needs special handling (e-waste, compost) or goes to general waste.
const CLASS_RECYCLABILITY: Record<string, 'Recyclable' | 'Non-recyclable'> = {
  Battery: 'Non-recyclable',
  Biological: 'Non-recyclable',
  Cardboard: 'Recyclable',
  Clothes: 'Recyclable',
  Glass: 'Recyclable',
  Metal: 'Recyclable',
  Paper: 'Recyclable',
  Plastic: 'Recyclable',
  Shoes: 'Non-recyclable',
  Trash: 'Non-recyclable'
};

export function getDisposalTip(label: string): string {
  return DISPOSAL_TIPS[label] ?? 'Check with your nearest recycling centre for the correct disposal method.';
}

export function getRecyclability(label: string): 'Recyclable' | 'Non-recyclable' | null {
  return CLASS_RECYCLABILITY[label] ?? null;
}
