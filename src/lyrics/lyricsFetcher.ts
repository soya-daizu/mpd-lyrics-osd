import GLib from "@girs/glib-2.0";
import Gio from "@girs/gio-2.0";

import { parse } from "clrc";

const readFile = (file: Gio.File) =>
  new Promise<string>((resolve, reject) => {
    const exists = file.query_exists(null);
    if (!exists) {
      reject("File does not exist");
      return;
    }

    file.load_contents_async(null, (file, res, _data) => {
      if (!file) {
        reject("Failed to read file");
        return;
      }

      const [success, contents] = file.load_contents_finish(res);
      if (!success) {
        reject("Failed to read file");
        return;
      }

      const decoder = new TextDecoder();
      const contentsString = decoder.decode(contents);

      resolve(contentsString);
    });
  });

export default class LyricsFetcher {
  private musicDirectory: string;
  private lyricsFileNameTemplate: string;

  constructor(musicDirectory: string, lyricsFileName: string) {
    this.musicDirectory = musicDirectory;
    this.lyricsFileNameTemplate = lyricsFileName;
  }

  public async fetchLyrics(songFilePath: string) {
    const songFileFullPath = GLib.build_filenamev([
      this.musicDirectory,
      songFilePath,
    ]);
    const songFile = Gio.File.new_for_path(songFileFullPath);

    const songFileName = songFile.get_basename()?.replace(/\.[^\/.]+$/, "");
    if (!songFileName) throw new Error("Invalid song file path");
    const songFileDirPath = songFile.get_parent()?.get_path();
    if (!songFileDirPath) throw new Error("Invalid song file path");

    const template = this.lyricsFileNameTemplate;
    const lyricsFilePath = GLib.build_filenamev([
      songFileDirPath,
      template.replaceAll("{songfilename}", songFileName),
    ]);
    const lyricsFile = Gio.File.new_for_path(lyricsFilePath);
    const content = await readFile(lyricsFile);

    const lyrics = parse(content).filter((line) => line.type === "lyric");
    return lyrics;
  }
}
