"use client";

import { useEffect, useRef } from "react";

export function PixiLawScene() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const appRef = useRef<any>(null);

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

      const bg = new PIXI.Sprite();
      stage.addChild(bg);

      const createBackgroundTexture = () => {
        const c = document.createElement("canvas");
        c.width = 4;
        c.height = 800;
        const ctx = c.getContext("2d");
        if (!ctx) return PIXI.Texture.WHITE;
        const g = ctx.createLinearGradient(0, 0, 0, c.height);
        g.addColorStop(0, "#0b1220");
        g.addColorStop(0.5, "#0f1b2d");
        g.addColorStop(1, "#0b0f1e");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, c.width, c.height);
        return PIXI.Texture.from(c);
      };

      bg.texture = createBackgroundTexture();
      bg.anchor.set(0);

      const gridTexture = (() => {
        const c = document.createElement("canvas");
        c.width = 160;
        c.height = 160;
        const ctx = c.getContext("2d");
        if (!ctx) return PIXI.Texture.WHITE;
        ctx.strokeStyle = "rgba(255,255,255,0.06)";
        ctx.lineWidth = 1;
        for (let i = 0; i <= 160; i += 32) {
          ctx.beginPath();
          ctx.moveTo(i, 0);
          ctx.lineTo(i, 160);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(0, i);
          ctx.lineTo(160, i);
          ctx.stroke();
        }
        return PIXI.Texture.from(c);
      })();

      const grid = new PIXI.TilingSprite(gridTexture, 100, 100);
      grid.alpha = 0.45;
      stage.addChild(grid);

      const nodeLayer = new PIXI.Container();
      stage.addChild(nodeLayer);

      type Node = {
        g: any;
        baseX: number;
        baseY: number;
        drift: number;
        speed: number;
        radius: number;
      };

      const nodes: Node[] = [];
      for (let i = 0; i < 22; i += 1) {
        const g = new PIXI.Graphics();
        const radius = 2 + Math.random() * 3;
        g.beginFill(0x7cc4ff, 0.35);
        g.drawCircle(0, 0, radius);
        g.endFill();
        g.lineStyle(1, 0x7cc4ff, 0.2);
        g.drawCircle(0, 0, radius + 6);
        g.position.set(Math.random() * 1200, Math.random() * 800);
        nodeLayer.addChild(g);
        nodes.push({
          g,
          baseX: g.x,
          baseY: g.y,
          drift: Math.random() * Math.PI * 2,
          speed: 0.3 + Math.random() * 0.6,
          radius,
        });
      }

      const scanBeam = new PIXI.Graphics();
      stage.addChild(scanBeam);

      const glow = new PIXI.Sprite();
      stage.addChild(glow);

      const createGlowTexture = () => {
        const c = document.createElement("canvas");
        c.width = 512;
        c.height = 512;
        const ctx = c.getContext("2d");
        if (!ctx) return PIXI.Texture.WHITE;
        const g = ctx.createRadialGradient(256, 256, 0, 256, 256, 240);
        g.addColorStop(0, "rgba(120, 196, 255, 0.25)");
        g.addColorStop(0.5, "rgba(120, 196, 255, 0.12)");
        g.addColorStop(1, "rgba(120, 196, 255, 0)");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, 512, 512);
        return PIXI.Texture.from(c);
      };

      glow.texture = createGlowTexture();
      glow.anchor.set(0.5);

      let scanY = 0;
      const animate = (delta: number) => {
        const width = app.renderer.width;
        const height = app.renderer.height;
        grid.width = width;
        grid.height = height;
        grid.tilePosition.x -= 0.2 * delta;
        grid.tilePosition.y -= 0.15 * delta;

        nodes.forEach((node, index) => {
          const t = performance.now() / 1000 + node.drift + index * 0.3;
          node.g.x = node.baseX + Math.cos(t) * 12;
          node.g.y = node.baseY + Math.sin(t * 0.9) * 10;
        });

        scanY += 0.6 * delta;
        if (scanY > height + 120) scanY = -120;

        scanBeam.clear();
        scanBeam.beginFill(0x84b9ff, 0.08);
        scanBeam.drawRect(0, scanY, width, 90);
        scanBeam.endFill();

        glow.x = width * 0.72;
        glow.y = height * 0.22;
      };

      app.ticker.add(animate as unknown as import("pixi.js").TickerCallback<unknown>);

      const resize = () => {
        if (!containerRef.current) return;
        const { width, height } = containerRef.current.getBoundingClientRect();
        app.renderer.resize(width, height);
        bg.width = width;
        bg.height = height;
        grid.width = width;
        grid.height = height;
        nodes.forEach((node) => {
          node.baseX = Math.random() * width;
          node.baseY = Math.random() * height;
        });
      };

      resize();
      resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(containerRef.current);
    };

    setup();

    return () => {
      destroyed = true;
      if (resizeObserver) resizeObserver.disconnect();
      if (appRef.current) {
        appRef.current.destroy(true, {
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

  return <div ref={containerRef} className="h-full w-full" />;
}
