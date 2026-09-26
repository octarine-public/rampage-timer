import { MenuManager } from "./menu"

const WIDTH = 220
const HEIGHT = 64
const PAD = 10
const NAME_SIZE = 18
const TIME_SIZE = 13
const BAR_HEIGHT = 6
/** The streak's colour while most of its window is left, then past two thirds, then the last third. */
const Plenty = new Color(50, 220, 50)
const Half = new Color(255, 200, 0)
const Last = new Color(255, 50, 50)

/** The card: the streak's name, the seconds left to extend it and a bar running them down. */
export class RampageGUI {
	private readonly size = new Vector2()
	private readonly box = new Rectangle()
	private readonly barPos = new Vector2()
	private readonly barSize = new Vector2()
	private readonly panel: MenuSDK.OverlayPanel
	private name = ""
	private remaining = 0
	private fraction = 0

	private readonly drawContent = (origin: Vector2) => {
		const box = this.box
		box.pos1.CopyFrom(origin)
		box.pos2.SetVector(origin.x + this.size.x, origin.y + this.size.y)
		MenuSDK.HudCard.Frame(box)
		const pad = MenuSDK.hudW(PAD),
			width = this.size.x,
			color = MenuSDK.HudColors.readable(this.colorOf(this.fraction))
		MenuSDK.HudText.Center(
			box.x,
			box.y + MenuSDK.hudH(PAD + NAME_SIZE / 2),
			width,
			this.name,
			NAME_SIZE,
			color,
			MenuSDK.HudBold
		)
		MenuSDK.HudText.Center(
			box.x,
			box.y + MenuSDK.hudH(PAD + NAME_SIZE + 4 + TIME_SIZE / 2),
			width,
			`${this.remaining.toFixed(1)}s`,
			TIME_SIZE,
			MenuSDK.HudColors.body
		)
		const barH = MenuSDK.hudH(BAR_HEIGHT)
		this.barPos.SetVector(box.x + pad, box.pos2.y - pad - barH)
		this.barSize.SetVector(width - pad * 2, barH)
		MenuSDK.HudCard.Bar(this.barPos, this.barSize, this.fraction, color)
	}

	constructor(menu: MenuManager) {
		this.panel = new MenuSDK.OverlayPanel(menu.Overlay, "hud-rampage-timer", MenuSDK.EPanelLife.MenuBound)
	}

	/** Draws the card for a streak, or for a sample of one while the page is open to place it. */
	public Draw(name: string, remaining: number, fraction: number): void {
		this.name = name
		this.remaining = remaining
		this.fraction = fraction
		MenuSDK.setHudScale(this.panel.Scale)
		this.size.SetVector(MenuSDK.hudW(WIDTH), MenuSDK.hudH(HEIGHT))
		this.panel.Draw(this.size, this.drawContent)
	}
	public MouseKeyDown(key: VMouseKeys): boolean {
		return this.panel.MouseKeyDown(key)
	}
	public MouseKeyUp(key: VMouseKeys): boolean {
		return key !== VMouseKeys.MK_LBUTTON || this.panel.MouseKeyUp()
	}
	public Reset(): void {
		this.panel.Reset()
	}

	private colorOf(fraction: number): Color {
		if (fraction > 2 / 3) {
			return Plenty
		}
		return fraction > 1 / 3 ? Half : Last
	}
}
