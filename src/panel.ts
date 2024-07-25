import GObject from "@girs/gobject-2.0";
import Gio from "@girs/gio-2.0";
import St from "@girs/st-14";
import Pango from "@girs/pango-1.0";

import * as Main from "@girs/gnome-shell/ui/main";

enum PanelPosition {
  Top = 0,
  Bottom = 1,
}

type RGBA = {
  red: number;
  green: number;
  blue: number;
  alpha: number;
};

export default GObject.registerClass(
  class Panel extends St.Bin {
    private label: St.Label;
    private action: Gio.SimpleAction;
    private actionHandlerId: number;

    private positionType: PanelPosition = PanelPosition.Top;
    private margin: number = 0;
    private shouldShow = true;

    private monitorWidth: number;
    private monitorHeight: number;

    constructor(
      action: Gio.SimpleAction,
      lyricsFont: string,
      lyricsFontColor: RGBA,
      lyricsBackgroundColor: RGBA,
      lyricsPosition: number,
      lyricsMargin: number
    ) {
      super({
        styleClass: "panel",
        visible: false,
        reactive: false,
      });

      const monitor = Main.layoutManager.primaryMonitor;
      if (!monitor) throw new Error("No primary monitor found");
      this.monitorWidth = monitor.width;
      this.monitorHeight = monitor.height;

      this.label = new St.Label();
      this.add_child(this.label);

      this.action = action;
      this.actionHandlerId = this.action.connect(
        "activate",
        (_source, parameter) => {
          if (!parameter) return;
          const [_lineNumber, content] = parameter.deepUnpack() as [
            number,
            string,
          ];
          this.updateLine(content);
        }
      );

      this.setAppearance(
        lyricsFont,
        lyricsFontColor,
        lyricsBackgroundColor,
        lyricsPosition,
        lyricsMargin
      );
    }

    destroy() {
      this.label.destroy();
      this.action.disconnect(this.actionHandlerId);
      super.destroy();
    }

    private updateLine(content: string) {
      if (content && this.shouldShow) this.visible = true;
      else this.visible = false;

      this.label.text = content;

      this.x = Math.floor((this.monitorWidth - this.width) / 2);
      this.y = Math.floor(
        this.positionType === PanelPosition.Top
          ? this.margin
          : this.monitorHeight - this.height - this.margin
      );
    }

    public setAppearance(
      lyricsFont: string,
      lyricsFontColor: RGBA,
      lyricsBackgroundColor: RGBA,
      lyricsPosition: number,
      lyricsMargin: number
    ) {
      const font = Pango.FontDescription.from_string(lyricsFont);

      this.label.style = `font-family: ${font.get_family()}; font-weight: ${font.get_weight()}; font-size: ${font.get_size() / Pango.SCALE}px; color: rgba(${lyricsFontColor.red}, ${lyricsFontColor.green}, ${lyricsFontColor.blue}, ${lyricsFontColor.alpha});`;

      this.style = `background-color: rgba(${lyricsBackgroundColor.red}, ${lyricsBackgroundColor.green}, ${lyricsBackgroundColor.blue}, ${lyricsBackgroundColor.alpha});`;

      this.positionType = lyricsPosition;
      this.margin = lyricsMargin;
      const monitor = Main.layoutManager.primaryMonitor;
      if (!monitor) throw new Error("No primary monitor found");
      this.x = Math.floor((monitor.width - this.width) / 2);
      this.y = Math.floor(
        this.positionType === PanelPosition.Top
          ? this.margin
          : monitor.height - this.height - this.margin
      );
    }

    public toggleShouldShow() {
      this.shouldShow = !this.shouldShow;
      if (this.label.text && this.shouldShow) this.visible = true;
      else this.visible = false;
    }
  }
);
