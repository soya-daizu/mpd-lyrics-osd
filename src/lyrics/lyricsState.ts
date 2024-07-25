import GLib from "@girs/glib-2.0";
import Gio from "@girs/gio-2.0";

import MPDClient from "../mpd/mpdClient.js";
import { PlaybackState, StatusResult } from "../mpd/mpdTypes.js";
import LyricsFetcher from "./lyricsFetcher.js";

import { LyricLine } from "clrc";

type MPDStatus = {
  lastReportedElapsedSecond: number;
  elapsedMillisecond: number;
  state: PlaybackState;
  songid: number;
};

const DEFAULT_AUDIO_BUFFER_SIZE = 0.5;
const floorToNearestBufferStep = (value: number, step: number) =>
  Math.floor(value / step) * step;
const ceilToNearestBufferStep = (value: number, step: number) =>
  Math.ceil(value / step) * step;

export default class LyricsState {
  public lines: LyricLine[] = [];
  public lineIndex: number = 0;
  public status: MPDStatus = {
    lastReportedElapsedSecond: 0,
    elapsedMillisecond: 0,
    state: "stop",
    songid: 0,
  };

  private mpdClient: MPDClient;
  private lyricsFetcher: LyricsFetcher;
  private currentSourceId?: number;
  private panelAction?: Gio.SimpleAction;

  constructor(mpdClient: MPDClient, lyricsFetcher: LyricsFetcher) {
    this.mpdClient = mpdClient;
    this.lyricsFetcher = lyricsFetcher;
  }

  public startFetchStatus() {
    this.mpdClient.status().then(async (status) => {
      await this.updateLyrics();
      this.setStatus(status);
    });
  }

  public setLyricsFetcher(lyricsFetcher: LyricsFetcher) {
    this.lyricsFetcher = lyricsFetcher;
    this.startFetchStatus();
  }

  public setPanelAction(action: Gio.SimpleAction) {
    this.panelAction = action;
  }

  public async setStatus(status: StatusResult) {
    if (this.status.songid !== status.songid) {
      console.debug("songid:", this.status.songid, status.songid);
      this.status.songid = status.songid;

      await this.updateLyrics();
    }
    if (this.status.lastReportedElapsedSecond !== status.elapsed) {
      console.debug(
        "elapsed:",
        `${this.status.lastReportedElapsedSecond / 1000}(lastReported)`,
        `${this.status.elapsedMillisecond}(local)`,
        status.elapsed
      );
      let elapsed;
      if (status.state === "play")
        elapsed = floorToNearestBufferStep(
          status.elapsed,
          DEFAULT_AUDIO_BUFFER_SIZE
        );
      else
        elapsed = ceilToNearestBufferStep(
          status.elapsed,
          DEFAULT_AUDIO_BUFFER_SIZE
        );

      this.status.lastReportedElapsedSecond = elapsed;
      this.status.elapsedMillisecond = elapsed * 1000;

      const oldLineIndex = this.lineIndex;
      this.updateLineIndex();
      if (oldLineIndex !== this.lineIndex) {
        const line = this.lines[this.lineIndex - 1];
        this.displayLine(line);
      }

      if (this.status.state === "play") {
        this.cancelNextLine();
        this.scheduleNextLine();
      }
    }
    if (this.status.state !== status.state) {
      console.debug("state:", this.status.state, status.state);
      this.status.state = status.state;

      if (status.state === "play") this.scheduleNextLine();
      else this.cancelNextLine();
    }
  }

  private async updateLyrics() {
    const currentsong = await this.mpdClient.currentsong();
    this.lines = await this.lyricsFetcher
      .fetchLyrics(currentsong.file)
      .catch(() => []);
  }

  private updateLineIndex() {
    // find the next line to show
    this.lineIndex = this.lines.findIndex(
      (line) => line.startMillisecond >= this.status.elapsedMillisecond
    );
  }

  private scheduleNextLine() {
    const line = this.lines[this.lineIndex];
    if (!line) {
      this.currentSourceId = undefined;
      return;
    }

    const startTime = Math.floor(GLib.get_monotonic_time() / 1000);
    this.currentSourceId = GLib.timeout_add(
      GLib.PRIORITY_HIGH,
      line.startMillisecond - this.status.elapsedMillisecond,
      () => {
        this.lineIndex++;
        const currentTime = Math.floor(GLib.get_monotonic_time() / 1000);
        this.status.elapsedMillisecond += currentTime - startTime;
        this.scheduleNextLine();

        //console.debug(line.startMillisecond, this.status.elapsedMillisecond);
        this.displayLine(line);

        return GLib.SOURCE_REMOVE;
      }
    );
  }

  private cancelNextLine() {
    if (!this.currentSourceId) return;
    GLib.source_remove(this.currentSourceId);
    this.currentSourceId = undefined;
  }

  private displayLine(line?: LyricLine) {
    console.debug(line?.raw);
    this.panelAction?.activate(
      GLib.Variant.new_tuple([
        GLib.Variant.new_int32(line?.lineNumber ?? 0),
        GLib.Variant.new_string(line?.content.trim() ?? ""),
      ])
    );
  }
}
