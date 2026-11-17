type NonPdfMediaAsset = {
  url: string;
  contentType: 'image' | 'mp3' | 'mp4' | 'unsupported' | 'word';
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
  outlinePdf: { url: 'assets/documents/pdf/04666097-eb32-4b2b-9bec-8e9ce8057560', contentType: 'pdf', pageCount: 22 },
  image: { url: 'assets/example.jpg', contentType: 'image' },
  audio: { url: 'assets/multimedia/audio_test.mp3', contentType: 'mp3' },
  video: { url: 'assets/multimedia/movie.mp4', contentType: 'mp4' },
  officeDocument: { url: '/documents/playwright-office-document/binary', contentType: 'word' },
  unsupported: { url: 'assets/unsupported.txt', contentType: 'unsupported' },
} as const satisfies Record<string, MediaAsset>;
