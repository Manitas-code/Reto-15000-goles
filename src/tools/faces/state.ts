export interface Candidate {
  t: string;
  u: string;
}
export interface ImageResponse {
  query?: {
    pages?: Record<
      string,
      {
        title: string;
        imageinfo?: { mime: string; thumburl: string }[];
      }
    >;
  };
}
