"use client";

import { useEffect, useRef } from "react";

type PixiContractSceneProps = {
  scanSignal: number;
};

export function PixiContractScene({ scanSignal }: PixiContractSceneProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const appRef = useRef<any>(null);
  const scanRef = useRef({ progress: 0, active: false, lastSignal: 0 });

  useEffect(() => {
    let destroyed = false;
    let resizeObserver: ResizeObserver | null = null;

    const setup = async () => {
      if (!containerRef.current) return;
      const PIXI = await import("pixi.js");
      if (destroyed || !containerRef.current) return;

      const hasInit = "init" in PIXI.Application.prototype;
      const app = hasInit
        ? new PIXI.Application()
        : new PIXI.Application({
            width: containerRef.current.clientWidth,
            height: containerRef.current.clientHeight,
            backgroundAlpha: 0,
            antialias: true,
            resolution: window.devicePixelRatio || 1,
            autoDensity: true,
          });

      if (hasInit) {
        await app.init({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
          backgroundAlpha: 0,
          antialias: true,
          resolution: window.devicePixelRatio || 1,
          autoDensity: true,
        });
      }

      appRef.current = app;
      const view = (app.view ?? app.canvas) as HTMLCanvasElement;
      containerRef.current.appendChild(view);

      const stage = app.stage;

      // --- Desk background ---
      const deskBg = new PIXI.Sprite();
      stage.addChild(deskBg);

      const createDeskTexture = () => {
        const c = document.createElement("canvas");
        c.width = 4;
        c.height = 512;
        const ctx = c.getContext("2d");
        if (!ctx) return PIXI.Texture.WHITE;
        const g = ctx.createLinearGradient(0, 0, 0, c.height);
        g.addColorStop(0, "#2a1f15");
        g.addColorStop(0.5, "#221a12");
        g.addColorStop(1, "#1a1410");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, c.width, c.height);
        return PIXI.Texture.from(c);
      };
      deskBg.texture = createDeskTexture();
      deskBg.anchor.set(0);

      // --- Vignette ---
      const vignette = new PIXI.Sprite();
      stage.addChild(vignette);

      const createVignetteTexture = () => {
        const c = document.createElement("canvas");
        c.width = 512;
        c.height = 512;
        const ctx = c.getContext("2d");
        if (!ctx) return PIXI.Texture.WHITE;
        const g = ctx.createRadialGradient(256, 256, 80, 256, 256, 360);
        g.addColorStop(0, "rgba(0,0,0,0)");
        g.addColorStop(0.6, "rgba(0,0,0,0.15)");
        g.addColorStop(1, "rgba(0,0,0,0.65)");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, 512, 512);
        return PIXI.Texture.from(c);
      };
      vignette.texture = createVignetteTexture();
      vignette.anchor.set(0);

      // --- Lamp glow ---
      const lampGlow = new PIXI.Sprite();
      stage.addChild(lampGlow);

      const createLampTexture = () => {
        const c = document.createElement("canvas");
        c.width = 512;
        c.height = 512;
        const ctx = c.getContext("2d");
        if (!ctx) return PIXI.Texture.WHITE;
        const g = ctx.createRadialGradient(256, 256, 0, 256, 256, 256);
        g.addColorStop(0, "rgba(255, 220, 160, 0.25)");
        g.addColorStop(0.4, "rgba(255, 200, 140, 0.1)");
        g.addColorStop(1, "rgba(255, 180, 120, 0)");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, 512, 512);
        return PIXI.Texture.from(c);
      };
      lampGlow.texture = createLampTexture();
      lampGlow.anchor.set(0.5);

      // --- Desk items ---
      const deskItems = new PIXI.Container();
      stage.addChild(deskItems);

      // Pen
      const pen = new PIXI.Graphics();
      pen.beginFill(0x333333);
      pen.drawRoundedRect(0, 0, 90, 5, 2);
      pen.endFill();
      pen.beginFill(0x222222);
      pen.moveTo(90, 0);
      pen.lineTo(100, 2.5);
      pen.lineTo(90, 5);
      pen.closePath();
      pen.endFill();
      pen.beginFill(0xc0a060);
      pen.drawRoundedRect(12, 0.5, 16, 4, 1);
      pen.endFill();
      pen.rotation = 0.35;
      deskItems.addChild(pen);

      // Coffee ring stain
      const coffeeRing = new PIXI.Graphics();
      coffeeRing.lineStyle(3, 0x5a4838, 0.12);
      coffeeRing.drawCircle(0, 0, 28);
      coffeeRing.beginFill(0x5a4838, 0.04);
      coffeeRing.drawCircle(0, 0, 26);
      coffeeRing.endFill();
      deskItems.addChild(coffeeRing);

      // Sticky note
      const stickyNote = new PIXI.Graphics();
      stickyNote.beginFill(0xfff4a3, 0.7);
      stickyNote.drawRoundedRect(0, 0, 56, 48, 2);
      stickyNote.endFill();
      stickyNote.lineStyle(1, 0xe0d080, 0.4);
      for (let i = 1; i <= 3; i++) {
        stickyNote.moveTo(6, i * 12);
        stickyNote.lineTo(50, i * 12);
      }
      stickyNote.rotation = -0.08;
      deskItems.addChild(stickyNote);

      // --- Dust particles ---
      const dustContainer = new PIXI.Container();
      stage.addChild(dustContainer);

      type Dust = {
        g: any;
        speed: number;
        drift: number;
        baseAlpha: number;
      };

      const dusts: Dust[] = [];
      for (let i = 0; i < 25; i++) {
        const d = new PIXI.Graphics();
        const size = 1 + Math.random() * 1.5;
        const alpha = 0.1 + Math.random() * 0.3;
        d.beginFill(0xffeedd, alpha);
        d.drawCircle(0, 0, size);
        d.endFill();
        d.position.set(Math.random() * 1200, Math.random() * 800);
        dustContainer.addChild(d);
        dusts.push({
          g: d,
          speed: 0.15 + Math.random() * 0.35,
          drift: Math.random() * Math.PI * 2,
          baseAlpha: alpha,
        });
      }

      // --- Scan beam (Pixi layer) ---
      const scanBeam = new PIXI.Graphics();
      stage.addChild(scanBeam);

      // --- Resize ---
      const resize = () => {
        if (!containerRef.current) return;
        const { width, height } = containerRef.current.getBoundingClientRect();
        app.renderer.resize(width, height);

        deskBg.width = width;
        deskBg.height = height;
        vignette.width = width;
        vignette.height = height;

        lampGlow.position.set(width * 0.15, height * 0.12);
        lampGlow.scale.set((Math.max(width, height) * 0.9) / 512);

        pen.position.set(width * 0.82, height * 0.88);
        coffeeRing.position.set(width * 0.1, height * 0.15);
        stickyNote.position.set(width * 0.06, height * 0.78);
      };

      resize();
      resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(containerRef.current);

      // --- Ticker ---
      let time = 0;
      app.ticker.add((ticker) => {
        const dt = ticker.deltaMS / 1000;
        time += dt;
        const w = app.renderer.width;
        const h = app.renderer.height;

        // Lamp breathing
        const breathe = 1 + Math.sin(time * 1.2) * 0.06;
        lampGlow.alpha = 0.8 * breathe;

        // Dust
        for (const dust of dusts) {
          dust.g.position.y += dust.speed * dt * 30;
          dust.g.position.x += Math.sin(time * 0.8 + dust.drift) * 0.15;
          dust.g.alpha = dust.baseAlpha * (0.7 + Math.sin(time + dust.drift) * 0.3);
          if (dust.g.position.y > h + 10) {
            dust.g.position.y = -10;
            dust.g.position.x = Math.random() * w * 0.6 + w * 0.05;
          }
        }

        // Scan beam
        scanBeam.clear();
        if (scanRef.current.active) {
          scanRef.current.progress += dt / 2.5;
          if (scanRef.current.progress >= 1) {
            scanRef.current.active = false;
            scanRef.current.progress = 0;
          } else {
            const beamY = scanRef.current.progress * h;
            const cx = w * 0.5;
            const bw = w * 0.55;
            scanBeam.beginFill(0x3b82f6, 0.06);
            scanBeam.drawRoundedRect(cx - bw / 2, beamY - 16, bw, 32, 8);
            scanBeam.endFill();
            scanBeam.beginFill(0x3b82f6, 0.12);
            scanBeam.drawRoundedRect(cx - bw / 2, beamY - 2, bw, 4, 2);
            scanBeam.endFill();
          }
        }
      });
    };

    setup();

    return () => {
      destroyed = true;
      if (resizeObserver && containerRef.current) {
        resizeObserver.unobserve(containerRef.current);
      }
      const app = appRef.current;
      if (app) {
        (app as any).destroy(true, {
          children: true,
          texture: true,
          baseTexture: true,
        });
      }
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
    };
  }, []);

  useEffect(() => {
    if (scanSignal <= 0) return;
    if (scanRef.current.lastSignal === scanSignal) return;
    scanRef.current.lastSignal = scanSignal;
    scanRef.current.progress = 0;
    scanRef.current.active = true;
  }, [scanSignal]);

  return <div ref={containerRef} className="h-full w-full" />;
}
