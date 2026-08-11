type NonPdfMediaAsset = {
  url: string;
  contentType: 'image' | 'unsupported';
};

export type MediaAsset =
  | NonPdfMediaAsset
  | {
      url: string;
      contentType: 'pdf';
      pageCount: number;
    };

export const mediaAssets = {
  pdf: { url: 'assets/example.pdf', contentType: 'pdf', pageCount: 14 },
  replacementPdf: { url: 'assets/example2.pdf', contentType: 'pdf', pageCount: 6 },
  image: { url: 'assets/example.jpg', contentType: 'image' },
  unsupported: { url: 'assets/unsupported.txt', contentType: 'unsupported' },
} as const satisfies Record<string, MediaAsset>;
