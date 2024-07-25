export const idleResultTemplate = {
  changed: "",
};

export const currentsongResultTemplate = {
  file: "",
  Album: "",
  AlbumArtist: "",
  Artist: "",
  Title: "",
  Track: 0,
  Time: 0,
};

export type PlaybackState = "play" | "stop" | "pause";
export const statusResultTemplate = {
  state: "" as PlaybackState,
  time: 0,
  elapsed: 0,
  songid: 0,
};

Object.freeze(idleResultTemplate);
Object.freeze(currentsongResultTemplate);
Object.freeze(statusResultTemplate);

export type IdleResult = typeof idleResultTemplate;
export type CurrentsongResult = typeof currentsongResultTemplate;
export type StatusResult = typeof statusResultTemplate;
