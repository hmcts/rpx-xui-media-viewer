export type MediaAsset = {
  url: string;
  contentType: 'image' | 'pdf' | 'unsupported';
};

export const mediaAssets = {
  pdf: { url: 'assets/example.pdf', contentType: 'pdf' },
  image: { url: 'assets/example.jpg', contentType: 'image' },
  unsupported: { url: 'assets/unsupported.txt', contentType: 'unsupported' },
} as const satisfies Record<string, MediaAsset>;
