import {
  Color,
  DOTAGameUIState,
  EntityManager,
  EventsSDK,
  GameState,
  GUIInfo,
  Hero,
  LocalPlayer,
  Menu,
  Rectangle,
  RendererSDK,
  TextFlags,
  Utils,
  Vector2,
} from "github.com/octarine-public/wrapper/index";

function LoadTranslations(name: string) {
  return new Map<string, string>(
    Object.entries(Utils.readJSON(`translations/${name}.json`)),
  );
}
Menu.Localization.AddLocalizationUnit("english", LoadTranslations("en"));
Menu.Localization.AddLocalizationUnit("russian", LoadTranslations("ru"));
Menu.Localization.AddLocalizationUnit("chinese", LoadTranslations("cn"));

const streakNames = [
  "",
  "KILL",
  "DOUBLE KILL",
  "TRIPLE KILL",
  "ULTRA KILL",
  "RAMPAGE!",
];

new (class RampageTimer {
  private readonly entry = Menu.AddEntry("Visual");
  private readonly tree = this.entry.AddNode(
    "Rampage Timer",
    "github.com/octarine-public/rampage-timer/scripts_files/icons/time-add.svg",
  );
  private readonly state = this.tree.AddToggle("State", true);
  private readonly timeWindow = 18;
  private readonly onlyUltra = this.tree.AddToggle(
    "Only before Rampage",
    true,
    "Show timer only at 4 kills (Ultra Kill)",
  );
  private readonly size = this.tree.AddSlider("Size", 100, 50, 200);
  private readonly posX = this.tree.AddSlider("Position X (%)", 50, 0, 100);
  private readonly posY = this.tree.AddSlider("Position Y (%)", 15, 0, 100);

  private readonly killTimestamps: number[] = [];
  private rampageCount = 0;

  constructor() {
    EventsSDK.on("GameEvent", this.GameEvent.bind(this));
    EventsSDK.on("Draw", this.Draw.bind(this));
    EventsSDK.on("GameEnded", this.GameEnded.bind(this));
  }

  private GameEvent(eventName: string, obj: any): void {
    if (eventName !== "entity_killed") {
      return;
    }
    const killed = EntityManager.EntityByIndex(obj.entindex_killed);
    const attacker = EntityManager.EntityByIndex(obj.entindex_attacker);
    if (
      killed === undefined ||
      attacker === undefined ||
      !(killed instanceof Hero) ||
      !killed.IsEnemy()
    ) {
      return;
    }
    const myHero = LocalPlayer?.Hero;
    if (myHero === undefined || attacker !== myHero) {
      return;
    }
    const now = GameState.RawGameTime;
    this.pruneKills(now);
    this.killTimestamps.push(now);
    if (this.killTimestamps.length >= 5) {
      this.rampageCount++;
      // keep last kill so timer continues toward next rampage
      this.killTimestamps.splice(0, this.killTimestamps.length - 1);
    }
  }

  private Draw(): void {
    if (
      GameState.UIState !== DOTAGameUIState.DOTA_GAME_UI_DOTA_INGAME ||
      !this.state.value
    ) {
      return;
    }

    const now = GameState.RawGameTime;

    this.pruneKills(now);
    const count = this.killTimestamps.length;
    if (count === 0 && this.rampageCount === 0) {
      return;
    }

    if (count === 0) {
      // rampages happened but streak expired — show final result briefly
      return;
    }

    const lastKill = this.killTimestamps[count - 1];
    const remaining = this.timeWindow - (now - lastKill);
    const fraction = remaining / this.timeWindow;

    const effectiveCount = count + this.rampageCount * 5;
    if (this.onlyUltra.value && effectiveCount < 4) {
      return;
    }

    const label =
      this.rampageCount > 0 ? "RAMPAGE!" : streakNames[Math.min(count, 5)];

    this.drawOverlay(label, fraction, remaining);
  }

  private drawOverlay(
    label: string,
    fraction: number,
    remaining: number,
  ): void {
    const screenW = RendererSDK.WindowSize.x;
    const screenH = RendererSDK.WindowSize.y;

    const scale = this.size.value / 100;
    const panelW = GUIInfo.ScaleWidth(220) * scale;
    const panelH = GUIInfo.ScaleHeight(60) * scale;
    const x = (screenW * this.posX.value) / 100 - panelW / 2;
    const y = (screenH * this.posY.value) / 100 - panelH / 2;

    const pos = new Vector2(x, y);
    const size = new Vector2(panelW, panelH);

    // background
    RendererSDK.FilledRect(pos, size, new Color(0, 0, 0, 180));

    // color based on fraction: green > yellow > red
    let barColor: Color;
    if (fraction > 0.66) {
      barColor = new Color(50, 220, 50);
    } else if (fraction > 0.33) {
      barColor = new Color(255, 200, 0);
    } else {
      barColor = new Color(255, 50, 50);
    }

    // progress bar
    const barMargin = GUIInfo.ScaleHeight(4) * scale;
    const barH = GUIInfo.ScaleHeight(6) * scale;
    const barMaxW = panelW - barMargin * 2;
    const barPos = new Vector2(x + barMargin, y + panelH - barMargin - barH);
    const barSize = new Vector2(barMaxW * Math.max(fraction, 0), barH);
    RendererSDK.FilledRect(barPos, barSize, barColor);

    // label text
    const labelRect = new Rectangle(
      new Vector2(x, y + GUIInfo.ScaleHeight(4) * scale),
      new Vector2(x + panelW, y + GUIInfo.ScaleHeight(28) * scale),
    );
    RendererSDK.TextByFlags(
      label,
      labelRect,
      barColor,
      2,
      TextFlags.Center,
      700,
    );

    // countdown text
    if (remaining > 0) {
      const timerRect = new Rectangle(
        new Vector2(x, y + GUIInfo.ScaleHeight(26) * scale),
        new Vector2(x + panelW, y + GUIInfo.ScaleHeight(48) * scale),
      );
      RendererSDK.TextByFlags(
        `${remaining.toFixed(1)}s`,
        timerRect,
        Color.White,
        1.4,
        TextFlags.Center,
      );
    }
  }

  private pruneKills(now: number): void {
    if (
      this.killTimestamps.length > 0 &&
      now - this.killTimestamps[this.killTimestamps.length - 1] >
        this.timeWindow
    ) {
      this.killTimestamps.length = 0;
      this.rampageCount = 0;
    }
  }

  private GameEnded(): void {
    this.killTimestamps.length = 0;
    this.rampageCount = 0;
  }
})();
