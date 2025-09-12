import { chromium, Browser, BrowserContext, Page } from "playwright";

export class PlaywrightDesktopAgent {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private isInitialized = false;

  async initialize() {
    try {
      // Usar navegador instalado do usuário (não headless)
      console.log("🌐 Abrindo Chrome...");
      this.browser = await chromium.launch({
        headless: false, // ✅ NAVEGADOR VISÍVEL no cliente
        channel: "chrome", // Usar Chrome do usuário
        timeout: 30000, // 30 segundos timeout
        args: [
          "--start-maximized",
          "--disable-web-security",
          "--disable-features=VizDisplayCompositor",
          "--remote-debugging-port=9222", // Para debug
        ],
      });
      console.log("✅ Chrome aberto!");

      this.context = await this.browser.newContext({
        viewport: null, // Usar viewport do navegador
        userAgent:
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 BetterChatbot/1.0",
      });

      this.page = await this.context.newPage();

      // Navegar para página inicial
      await this.page.goto("https://www.google.com");

      this.isInitialized = true;
      console.log("✅ Playwright inicializado com sucesso!");
    } catch (error) {
      console.error("❌ Erro ao inicializar Playwright:", error);
      throw error;
    }
  }

  async navigate(url: string) {
    if (!this.page) throw new Error("Playwright não inicializado");

    console.log(`🌐 Navegando para: ${url}`);
    await this.page.goto(url);

    return {
      url: this.page.url(),
      title: await this.page.title(),
    };
  }

  async click(selector: string) {
    if (!this.page) throw new Error("Playwright não inicializado");

    console.log(`🖱️ Clicando em: ${selector}`);

    // Destacar elemento antes de clicar
    await this.page.evaluate((sel) => {
      const element = (window as any).document.querySelector(sel);
      if (element) {
        element.style.outline = "3px solid red";
        element.style.backgroundColor = "yellow";
        setTimeout(() => {
          element.style.outline = "";
          element.style.backgroundColor = "";
        }, 2000);
      }
    }, selector);

    await this.page.click(selector);

    return {
      selector,
      success: true,
      url: this.page.url(),
    };
  }

  async type(selector: string, text: string) {
    if (!this.page) throw new Error("Playwright não inicializado");

    console.log(`⌨️ Digitando "${text}" em: ${selector}`);

    // Limpar campo e digitar
    await this.page.fill(selector, "");
    await this.page.type(selector, text, { delay: 100 }); // Delay realista

    return {
      selector,
      text,
      success: true,
    };
  }

  async screenshot() {
    if (!this.page) throw new Error("Playwright não inicializado");

    console.log("📸 Capturando screenshot...");

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `screenshot-${timestamp}.png`;

    const screenshotBuffer = await this.page.screenshot({
      fullPage: true,
      path: `./screenshots/${filename}`,
    });

    return {
      filename,
      path: `./screenshots/${filename}`,
      size: screenshotBuffer.length,
      timestamp,
    };
  }

  async getTitle() {
    if (!this.page) throw new Error("Playwright não inicializado");
    return await this.page.title();
  }

  async getUrl() {
    if (!this.page) throw new Error("Playwright não inicializado");
    return this.page.url();
  }

  async getStatus() {
    return {
      initialized: this.isInitialized,
      hasPage: !!this.page,
      currentUrl: this.page ? this.page.url() : null,
      currentTitle: this.page ? await this.page.title() : null,
    };
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.context = null;
      this.page = null;
      this.isInitialized = false;
    }
  }
}
