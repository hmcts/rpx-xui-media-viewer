type NonPdfMediaAsset = {
  url: string;
  contentType: 'image' | 'mp3' | 'mp4' | 'unsupported';
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
  audio: { url: 'assets/multimedia/audio_test.mp3', contentType: 'mp3' },
  video: { url: 'assets/multimedia/movie.mp4', contentType: 'mp4' },
  unsupported: { url: 'assets/unsupported.txt', contentType: 'unsupported' },
} as const satisfies Record<string, MediaAsset>;
