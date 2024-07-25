import GObject from "@girs/gobject-2.0";
import GLib from "@girs/glib-2.0";
import Gtk from "@girs/gtk-4.0";
import Adw from "@girs/adw-1";
import Gio from "@girs/gio-2.0";
import Pango from "@girs/pango-1.0";
import Gdk from "@girs/gdk-4.0";

import {
  ExtensionPreferences,
  gettext as _,
} from "@girs/gnome-shell/extensions/prefs";

const GeneralPrefs = GObject.registerClass(
  {
    GTypeName: "MPDGeneralPrefs",
    Template: GLib.Uri.resolve_relative(
      import.meta.url,
      "ui/general.ui",
      GLib.UriFlags.NONE
    ),
    InternalChildren: [
      "mpdHostRow",
      "mpdPortRow",
      "musicDirectoryRow",
      "lyricsFileNameRow",
      "lyricsFontRow",
      "lyricsFontColorRow",
      "lyricsBackgroundColorRow",
      "lyricsPositionRow",
      "lyricsMarginRow",

      "mpdHostEntry",
      "mpdPortEntry",
      "mpdConnectionApplyButton",

      "musicDirectoryEntry",
      "musicDirectoryChooseButton",
      "lyricsFileNameEntry",
      "lyricsFetchingApplyButton",

      "lyricsFontChooseButton",
      "lyricsFontColorChooseButton",
      "lyricsBackgroundColorChooseButton",
      "lyricsPositionDropDown",
      "lyricsMarginSpin",
      "lyricsAppearanceApplyButton",
    ],
  },
  class GeneralPreferences extends Adw.PreferencesPage {
    private declare _mpdHostRow: Adw.ActionRow;
    private declare _mpdPortRow: Adw.ActionRow;
    private declare _musicDirectoryRow: Adw.ActionRow;
    private declare _lyricsFileNameRow: Adw.ActionRow;
    private declare _lyricsFontRow: Adw.ActionRow;
    private declare _lyricsFontColorRow: Adw.ActionRow;
    private declare _lyricsBackgroundColorRow: Adw.ActionRow;
    private declare _lyricsPositionRow: Adw.ActionRow;
    private declare _lyricsMarginRow: Adw.ActionRow;

    private declare _mpdHostEntry: Gtk.Entry;
    private declare _mpdPortEntry: Gtk.Entry;
    private declare _mpdConnectionApplyButton: Gtk.Button;

    private declare _musicDirectoryEntry: Gtk.Entry;
    private declare _musicDirectoryChooseButton: Gtk.Button;
    private declare _lyricsFileNameEntry: Gtk.Entry;
    private declare _lyricsFetchingApplyButton: Gtk.Button;

    private declare _lyricsFontChooseButton: Gtk.FontDialogButton;
    private declare _lyricsFontColorChooseButton: Gtk.ColorDialogButton;
    private declare _lyricsBackgroundColorChooseButton: Gtk.ColorDialogButton;
    private declare _lyricsPositionDropDown: Gtk.DropDown;
    private declare _lyricsMarginSpin: Gtk.SpinButton;
    private declare _lyricsAppearanceApplyButton: Gtk.Button;

    private setActivatableWidgets() {
      this._mpdHostRow.activatableWidget = this._mpdHostEntry;
      this._mpdPortRow.activatableWidget = this._mpdPortEntry;
      this._musicDirectoryRow.activatableWidget = this._musicDirectoryEntry;
      this._lyricsFileNameRow.activatableWidget = this._lyricsFileNameEntry;
      this._lyricsFontRow.activatableWidget = this._lyricsFontChooseButton;
      this._lyricsFontColorRow.activatableWidget =
        this._lyricsFontColorChooseButton;
      this._lyricsBackgroundColorRow.activatableWidget =
        this._lyricsBackgroundColorChooseButton;
      this._lyricsPositionRow.activatableWidget = this._lyricsPositionDropDown;
      this._lyricsMarginRow.activatableWidget = this._lyricsMarginSpin;
    }

    private setMPDConnectionGroup(prefs: Prefs) {
      const settings = prefs.settings!;

      this._mpdHostEntry.text = settings.get_string("mpd-host");
      this._mpdPortEntry.text = settings.get_int("mpd-port").toString();

      this._mpdHostEntry.connect("notify::text", () => {
        this._mpdConnectionApplyButton.sensitive = true;
      });
      this._mpdPortEntry.connect("notify::text", () => {
        this._mpdConnectionApplyButton.sensitive = true;
      });

      this._mpdConnectionApplyButton.connect("clicked", () => {
        const parsedPort = Number(this._mpdPortEntry.text);
        if (
          isNaN(parsedPort) ||
          !Number.isInteger(parsedPort) ||
          parsedPort < 0 ||
          parsedPort > 65535
        )
          this._mpdPortEntry.text = settings.get_int("mpd-port").toString();

        const address = Gio.NetworkAddress.parse(
          this._mpdHostEntry.text,
          Number(this._mpdPortEntry.text)
        );
        if (!address) this._mpdHostEntry.text = settings.get_string("mpd-host");

        settings.set_string("mpd-host", this._mpdHostEntry.text);
        settings.set_int("mpd-port", parsedPort);
        this._mpdConnectionApplyButton.sensitive = false;
      });
    }

    private setMusicDirectoryGroup(prefs: Prefs) {
      const settings = prefs.settings!;
      const window = prefs.window!;

      this._musicDirectoryEntry.text = settings.get_string("music-directory");
      this._lyricsFileNameEntry.text = settings.get_string("lyrics-file-name");

      this._musicDirectoryEntry.connect("notify::text", () => {
        this._lyricsFetchingApplyButton.sensitive = true;
      });
      this._lyricsFileNameEntry.connect("notify::text", () => {
        this._lyricsFetchingApplyButton.sensitive = true;
      });
      this._musicDirectoryChooseButton.connect("clicked", () => {
        const dialog = new Gtk.FileDialog({
          title: _("Select music directory"),
          initialFolder: Gio.File.new_for_path(this._musicDirectoryEntry.text),
        });
        // @ts-ignore
        dialog.select_folder(window, null, (dialog, res) => {
          const file = dialog.select_folder_finish(res);
          if (file) this._musicDirectoryEntry.text = file.get_path() || "";
        });
      });

      this._lyricsFetchingApplyButton.connect("clicked", () => {
        settings.set_string("music-directory", this._musicDirectoryEntry.text);
        settings.set_string("lyrics-file-name", this._lyricsFileNameEntry.text);
        this._lyricsFetchingApplyButton.sensitive = false;
      });
    }

    private setLyricsAppearanceGroup(prefs: Prefs) {
      const settings = prefs.settings!;

      this._lyricsFontChooseButton.set_font_desc(
        Pango.FontDescription.from_string(settings.get_string("lyrics-font"))
      );
      this._lyricsFontColorChooseButton.set_rgba(
        new Gdk.RGBA(settings.get_value("lyrics-font-color").deepUnpack())
      );
      this._lyricsBackgroundColorChooseButton.set_rgba(
        new Gdk.RGBA(settings.get_value("lyrics-background-color").deepUnpack())
      );
      this._lyricsPositionDropDown.set_selected(
        settings.get_int("lyrics-position")
      );
      this._lyricsMarginSpin.set_value(settings.get_int("lyrics-margin"));

      this._lyricsFontChooseButton.set_dialog(
        new Gtk.FontDialog({
          title: _("Select font"),
        })
      );
      this._lyricsFontColorChooseButton.set_dialog(
        new Gtk.ColorDialog({
          title: _("Select font color"),
        })
      );
      this._lyricsBackgroundColorChooseButton.set_dialog(
        new Gtk.ColorDialog({
          title: _("Select background color"),
        })
      );

      this._lyricsFontChooseButton.connect("notify::font-desc", () => {
        this._lyricsAppearanceApplyButton.sensitive = true;
      });
      this._lyricsFontColorChooseButton.connect("notify::rgba", () => {
        this._lyricsAppearanceApplyButton.sensitive = true;
      });
      this._lyricsBackgroundColorChooseButton.connect("notify::rgba", () => {
        this._lyricsAppearanceApplyButton.sensitive = true;
      });
      this._lyricsPositionDropDown.connect("notify::selected", () => {
        this._lyricsAppearanceApplyButton.sensitive = true;
      });
      this._lyricsMarginSpin.connect("notify::value", () => {
        this._lyricsAppearanceApplyButton.sensitive = true;
      });

      this._lyricsAppearanceApplyButton.connect("clicked", () => {
        const font = this._lyricsFontChooseButton.get_font_desc();
        if (font) settings.set_string("lyrics-font", font.to_string());

        const fontColor = this._lyricsFontColorChooseButton.get_rgba();
        const backgroundColor =
          this._lyricsBackgroundColorChooseButton.get_rgba();
        settings.set_value(
          "lyrics-font-color",
          GLib.Variant.parse(
            GLib.VariantType.new("a{sd}"),
            JSON.stringify({
              red: fontColor.red,
              green: fontColor.green,
              blue: fontColor.blue,
              alpha: fontColor.alpha,
            }),
            null,
            null
          )
        );
        settings.set_value(
          "lyrics-background-color",
          GLib.Variant.parse(
            GLib.VariantType.new("a{sd}"),
            JSON.stringify({
              red: backgroundColor.red,
              green: backgroundColor.green,
              blue: backgroundColor.blue,
              alpha: backgroundColor.alpha,
            }),
            null,
            null
          )
        );

        settings.set_int(
          "lyrics-position",
          this._lyricsPositionDropDown.selected
        );

        settings.set_int("lyrics-margin", this._lyricsMarginSpin.value);

        this._lyricsAppearanceApplyButton.sensitive = false;
      });
    }

    constructor(prefs: Prefs) {
      super({});

      this.setActivatableWidgets();
      this.setMPDConnectionGroup(prefs);
      this.setMusicDirectoryGroup(prefs);
      this.setLyricsAppearanceGroup(prefs);
    }
  }
);

export default class Prefs extends ExtensionPreferences {
  public settings?: Gio.Settings;
  public window?: Adw.PreferencesWindow;

  fillPreferencesWindow(window: Adw.PreferencesWindow) {
    this.settings = this.getSettings();
    this.window = window;

    const page = new GeneralPrefs(this);

    window.add(page);
  }
}
