"use client";

import { useEffect, useRef } from "react";

type PixiGoldenEyeSceneProps = {
  scanSignal: number;
};

const BASE_WIDTH = 980;
const BASE_HEIGHT = 620;

export function PixiGoldenEyeScene({ scanSignal }: PixiGoldenEyeSceneProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const appRef = useRef<any>(null);
  const scanRef = useRef({ progress: 0, active: false, lastSignal: 0 });
  const cameraTargetRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    let destroyed = false;
    let resizeObserver: ResizeObserver | null = null;

    const setup = async () => {
      if (!containerRef.current) return;
      const PIXI = await import("pixi.js");
      if (destroyed || !containerRef.current) return;

      const hasInit = "init" in PIXI.Application.prototype;
      const app = hasInit ? new PIXI.Application() : new PIXI.Application({
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
      stage.eventMode = "static";

      const background = new PIXI.Sprite();
      stage.addChild(background);

      const camera = new PIXI.Container();
      const scene = new PIXI.Container();
      scene.sortableChildren = true;
      camera.addChild(scene);
      stage.addChild(camera);

      const overlay = new PIXI.Graphics();
      stage.addChild(overlay);

      const palette = {
        skyTop: "#f6f1e9",
        skyBottom: "#cfe2f1",
        stoneTop: 0xf6f2ea,
        stoneLeft: 0xe4d8c8,
        stoneRight: 0xd6cab8,
        accentTop: 0xe6eef9,
        accentLeft: 0xcfdcf0,
        accentRight: 0xb9cadf,
        shadow: 0xb6a893,
        highlight: 0xf1b84b,
        ink: 0x5a6b8c,
      };

      const createGradientTexture = () => {
        const canvas = document.createElement("canvas");
        canvas.width = 4;
        canvas.height = 512;
        const ctx = canvas.getContext("2d");
        if (!ctx) return PIXI.Texture.WHITE;
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, palette.skyTop);
        gradient.addColorStop(0.6, "#e8f0f7");
        gradient.addColorStop(1, palette.skyBottom);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        return PIXI.Texture.from(canvas);
      };

      background.texture = createGradientTexture();
      background.anchor.set(0);

      const drawPrism = (
        x: number,
        y: number,
        width: number,
        height: number,
        depth: number,
        colors: { top: number; left: number; right: number },
        zIndex = 0
      ) => {
        const g = new PIXI.Graphics();
        g.zIndex = zIndex;
        g.beginFill(colors.top);
        g.moveTo(x, y);
        g.lineTo(x + width, y);
        g.lineTo(x + width - depth, y - depth);
        g.lineTo(x - depth, y - depth);
        g.closePath();
        g.endFill();

        g.beginFill(colors.left);
        g.moveTo(x - depth, y - depth);
        g.lineTo(x, y);
        g.lineTo(x, y + height);
        g.lineTo(x - depth, y + height - depth);
        g.closePath();
        g.endFill();

        g.beginFill(colors.right);
        g.moveTo(x + width, y);
        g.lineTo(x + width - depth, y - depth);
        g.lineTo(x + width - depth, y + height - depth);
        g.lineTo(x + width, y + height);
        g.closePath();
        g.endFill();

        scene.addChild(g);
      };

      drawPrism(180, 320, 280, 95, 30, {
        top: palette.stoneTop,
        left: palette.stoneLeft,
        right: palette.stoneRight,
      }, 1);

      drawPrism(460, 260, 220, 75, 26, {
        top: palette.accentTop,
        left: palette.accentLeft,
        right: palette.accentRight,
      }, 2);

      drawPrism(560, 360, 200, 85, 24, {
        top: palette.stoneTop,
        left: palette.stoneLeft,
        right: palette.stoneRight,
      }, 3);

      drawPrism(320, 410, 170, 60, 20, {
        top: palette.accentTop,
        left: palette.accentLeft,
        right: palette.accentRight,
      }, 0);

      const shadow = new PIXI.Graphics();
      shadow.beginFill(palette.shadow, 0.18);
      shadow.drawEllipse(460, 460, 300, 70);
      shadow.endFill();
      scene.addChildAt(shadow, 0);

      const path = new PIXI.Graphics();
      path.lineStyle(2, palette.ink, 0.45);
      path.moveTo(260, 350);
      path.lineTo(470, 300);
      path.lineTo(650, 370);
      scene.addChild(path);

      const pathDot = new PIXI.Graphics();
      pathDot.beginFill(palette.highlight);
      pathDot.drawCircle(0, 0, 5);
      pathDot.endFill();
      scene.addChild(pathDot);

      const lens = new PIXI.Container();
      const lensRing = new PIXI.Graphics();
      lensRing.lineStyle(3, palette.ink, 0.65);
      lensRing.drawCircle(0, 0, 42);
      lens.addChild(lensRing);
      const lensGlass = new PIXI.Graphics();
      lensGlass.beginFill(0xffffff, 0.08);
      lensGlass.drawCircle(0, 0, 38);
      lensGlass.endFill();
      lens.addChild(lensGlass);
      scene.addChild(lens);

      const scanBeam = new PIXI.Graphics();
      scene.addChild(scanBeam);

      const hotspots = [
        { x: 300, y: 320 },
        { x: 520, y: 260 },
        { x: 620, y: 380 },
      ];

      const hotspotSprites: any[] = [];
      hotspots.forEach((spot) => {
        const node = new PIXI.Graphics();
        node.lineStyle(2, 0xffffff, 0.8);
        node.drawCircle(0, 0, 16);
        node.beginFill(palette.highlight, 0.9);
        node.drawCircle(0, 0, 5);
        node.endFill();
        node.position.set(spot.x, spot.y);
        scene.addChild(node);
        hotspotSprites.push(node);
      });

      const focusPoint = () => {
        const width = app.renderer.width;
        const height = app.renderer.height;
        return { x: width * 0.5, y: height * 0.58 };
      };

      const updateCameraTarget = () => {
        const scale = scene.scale.x || 1;
        const center = focusPoint();
        cameraTargetRef.current = {
          x: center.x - (BASE_WIDTH * 0.5) * scale,
          y: center.y - (BASE_HEIGHT * 0.5) * scale,
        };
      };

      const resize = () => {
        if (!containerRef.current) return;
        const { width, height } = containerRef.current.getBoundingClientRect();
        app.renderer.resize(width, height);
        background.width = width;
        background.height = height;

        const scale = Math.min(width / BASE_WIDTH, height / BASE_HEIGHT) * 0.98;
        scene.scale.set(scale);
        updateCameraTarget();
      };

      resize();
      resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(containerRef.current);

      let pathProgress = 0;
      app.ticker.add((ticker) => {
        const delta = ticker.deltaMS / 1000;
        pathProgress = (pathProgress + delta * 0.12) % 1;
        const segment = pathProgress < 0.5 ? 0 : 1;
        const localT = pathProgress < 0.5 ? pathProgress / 0.5 : (pathProgress - 0.5) / 0.5;
        const points = [
          { x: 260, y: 350 },
          { x: 470, y: 300 },
          { x: 650, y: 370 },
        ];
        const start = points[segment];
        const end = points[segment + 1];
        pathDot.position.set(
          start.x + (end.x - start.x) * localT,
          start.y + (end.y - start.y) * localT
        );

        lens.position.set(
          420 + Math.sin(performance.now() / 1200) * 80,
          280 + Math.cos(performance.now() / 1400) * 60
        );
        lens.rotation = Math.sin(performance.now() / 1000) * 0.05;

        hotspotSprites.forEach((node, index) => {
          node.scale.set(1 + Math.sin(performance.now() / 800 + index) * 0.03);
        });

        if (scanRef.current.active) {
          scanRef.current.progress += delta * 1.1;
          if (scanRef.current.progress >= 1) {
            scanRef.current.active = false;
            scanRef.current.progress = 0;
          }
        }

        scanBeam.clear();
        if (scanRef.current.active) {
          const beamY = 220 + scanRef.current.progress * 240;
          scanBeam.beginFill(0xffffff, 0.12);
          scanBeam.drawRoundedRect(200, beamY, 520, 26, 12);
          scanBeam.endFill();
          scanBeam.lineStyle(2, palette.highlight, 0.6);
          scanBeam.moveTo(220, beamY + 13);
          scanBeam.lineTo(700, beamY + 13);
        }

        const target = cameraTargetRef.current;
        camera.position.set(
          camera.position.x + (target.x - camera.position.x) * 0.08,
          camera.position.y + (target.y - camera.position.y) * 0.08
        );

        overlay.clear();
        overlay.beginFill(0xffffff, 0.1);
        overlay.drawCircle(app.renderer.width * 0.85, app.renderer.height * 0.18, 150);
        overlay.endFill();
      });

      updateCameraTarget();
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

  return <div ref={containerRef} className="h-full w-full rounded-[30px] overflow-hidden" />;
}
