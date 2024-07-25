import GLib from "@girs/glib-2.0";
import Gio from "@girs/gio-2.0";
import St from "@girs/st-14";

import * as Main from "@girs/gnome-shell/ui/main";
import * as PanelMenu from "@girs/gnome-shell/ui/panelMenu";
import { PopupMenu } from "@girs/gnome-shell/ui/popupMenu";
import {
  Extension,
  ExtensionMetadata,
  gettext as _,
} from "@girs/gnome-shell/extensions/extension";

import Panel from "./panel.js";
import MPDClient from "./mpd/mpdClient.js";
import LyricsState from "./lyrics/lyricsState.js";
import LyricsFetcher from "./lyrics/lyricsFetcher.js";

export default class App extends Extension {
  private settings?: Gio.Settings;
  private indicator?: PanelMenu.Button;
  private panel?: InstanceType<typeof Panel>;
  private mpdClient?: MPDClient;
  private lyricsState?: LyricsState;

  constructor(metadata: ExtensionMetadata) {
    super(metadata);
  }

  private createIndicator() {
    this.indicator = new PanelMenu.Button(0.0, this.metadata.name, false);
    const icon = new St.Icon({
      iconName: "view-media-lyrics-symbolic",
      styleClass: "system-status-icon",
    });
    this.indicator.add_child(icon);
    const menu = this.indicator.menu as PopupMenu;
    menu.addAction(_("Settings"), () => this.openPreferences());
    menu.addAction(_("Reload Lyrics"), () =>
      this.lyricsState?.startFetchStatus()
    );
    menu.addAction(_("Toggle Lyrics"), () => this.panel?.toggleShouldShow());
    Main.panel.addToStatusArea(this.uuid, this.indicator);
  }

  private startMPDClient() {
    const onPlayerUpdate = async () => {
      const status = await this.mpdClient!.status();
      await this.lyricsState!.setStatus(status);
    };
    this.mpdClient = new MPDClient(onPlayerUpdate);
    this.mpdClient.connect(
      this.settings!.get_string("mpd-host"),
      this.settings!.get_int("mpd-port")
    );
    this.lyricsState = new LyricsState(
      this.mpdClient!,
      new LyricsFetcher(
        this.settings!.get_string("music-directory"),
        this.settings!.get_string("lyrics-file-name")
      )
    );
    onPlayerUpdate();

    this.settings!.connect("change-event", (settings, keys) => {
      if (!keys) return;
      const keyStrs = keys.map((key) => GLib.quark_to_string(key));
      if (["mpd-host", "mpd-port"].some((key) => keyStrs.includes(key))) {
        this.mpdClient!.connect(
          settings.get_string("mpd-host"),
          settings.get_int("mpd-port")
        );
        onPlayerUpdate();
      }
      if (
        ["music-directory", "lyrics-file-name"].some((key) =>
          keyStrs.includes(key)
        )
      ) {
        this.lyricsState!.setLyricsFetcher(
          new LyricsFetcher(
            settings.get_string("music-directory"),
            settings.get_string("lyrics-file-name")
          )
        );
      }
      if (
        [
          "lyrics-font",
          "lyrics-font-color",
          "lyrics-background-color",
          "lyrics-position",
          "lyrics-margin",
        ].some((key) => keyStrs.includes(key))
      ) {
        this.panel!.setAppearance(
          settings.get_string("lyrics-font"),
          settings.get_value("lyrics-font-color").deepUnpack(),
          settings.get_value("lyrics-background-color").deepUnpack(),
          settings.get_int("lyrics-position"),
          settings.get_int("lyrics-margin")
        );
      }
    });
  }

  enable() {
    this.settings = this.getSettings();
    this.createIndicator();
    this.startMPDClient();

    const action = Gio.SimpleAction.new(
      "panelAction",
      GLib.VariantType.new_tuple([
        GLib.VariantType.new("i"),
        GLib.VariantType.new("s"),
      ])
    );
    this.lyricsState?.setPanelAction(action);
    this.panel = new Panel(
      action,
      this.settings.get_string("lyrics-font"),
      this.settings.get_value("lyrics-font-color").deepUnpack(),
      this.settings.get_value("lyrics-background-color").deepUnpack(),
      this.settings.get_int("lyrics-position"),
      this.settings.get_int("lyrics-margin")
    );
    Main.uiGroup.add_child(this.panel);
  }

  disable() {
    this.settings = undefined;
    this.indicator?.destroy();
    this.indicator = undefined;
    this.panel?.destroy();
    this.panel = undefined;
    this.mpdClient?.disconnect();
    this.mpdClient = undefined;
    this.lyricsState = undefined;
  }
}
