"use client";

import { useEffect, useRef, useState } from "react";

export type HotspotInfo = {
  id: string;
  title: string;
  detail: string;
  position: { x: number; y: number };
};

type PixiPrototypeSceneProps = {
  onHotspot?: (info: HotspotInfo) => void;
};

const BASE_WIDTH = 900;
const BASE_HEIGHT = 560;

const HOTSPOTS: HotspotInfo[] = [
  {
    id: "gate",
    title: "折角石门",
    detail: "触发机关后墙体微移，露出隐藏的符号刻印。",
    position: { x: 320, y: 260 },
  },
  {
    id: "arch",
    title: "悬浮拱廊",
    detail: "视觉错位制造的虚空桥，只在特定角度才可通行。",
    position: { x: 520, y: 210 },
  },
  {
    id: "dial",
    title: "青铜旋盘",
    detail: "旋转机关将光束折射，点亮底部的隐藏路标。",
    position: { x: 610, y: 360 },
  },
];

export function PixiPrototypeScene({ onHotspot }: PixiPrototypeSceneProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const appRef = useRef<any>(null);
  const cameraTargetRef = useRef({ x: 0, y: 0 });
  const activeHotspotRef = useRef<HotspotInfo | null>(null);
  const onHotspotRef = useRef(onHotspot);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    onHotspotRef.current = onHotspot;
  }, [onHotspot]);

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

      const glow = new PIXI.Graphics();
      stage.addChild(glow);

      const palette = {
        skyTop: 0xf6efe6,
        skyBottom: 0xcfe2f1,
        stoneTop: 0xf4efe6,
        stoneLeft: 0xe1d6c7,
        stoneRight: 0xd4c8b6,
        accentTop: 0xdfe9f7,
        accentLeft: 0xc6d5ec,
        accentRight: 0xb3c4dd,
        shadow: 0xb7a792,
        path: 0x8aa2c5,
        highlight: 0xf1b84b,
      };

      const createGradientTexture = () => {
        const canvas = document.createElement("canvas");
        canvas.width = 4;
        canvas.height = 512;
        const ctx = canvas.getContext("2d");
        if (!ctx) return PIXI.Texture.WHITE;
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, "#f9f4ec");
        gradient.addColorStop(0.6, "#e5eef6");
        gradient.addColorStop(1, "#c9dff0");
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

      drawPrism(180, 280, 240, 90, 28, {
        top: palette.stoneTop,
        left: palette.stoneLeft,
        right: palette.stoneRight,
      }, 1);

      drawPrism(420, 230, 200, 70, 24, {
        top: palette.accentTop,
        left: palette.accentLeft,
        right: palette.accentRight,
      }, 2);

      drawPrism(520, 320, 180, 80, 22, {
        top: palette.stoneTop,
        left: palette.stoneLeft,
        right: palette.stoneRight,
      }, 3);

      drawPrism(300, 360, 160, 60, 18, {
        top: palette.accentTop,
        left: palette.accentLeft,
        right: palette.accentRight,
      }, 0);

      const shadow = new PIXI.Graphics();
      shadow.beginFill(palette.shadow, 0.2);
      shadow.drawEllipse(440, 420, 260, 60);
      shadow.endFill();
      scene.addChildAt(shadow, 0);

      const pathway = new PIXI.Graphics();
      pathway.lineStyle(2, palette.path, 0.6);
      pathway.moveTo(260, 320);
      pathway.lineTo(430, 270);
      pathway.lineTo(600, 340);
      scene.addChild(pathway);

      const pathDot = new PIXI.Graphics();
      pathDot.beginFill(palette.highlight);
      pathDot.drawCircle(0, 0, 5);
      pathDot.endFill();
      scene.addChild(pathDot);

      const rippleLayer = new PIXI.Container();
      scene.addChild(rippleLayer);

      const hotspotLayer = new PIXI.Container();
      scene.addChild(hotspotLayer);

      const hotspotSprites = new Map<string, any>();

      HOTSPOTS.forEach((spot) => {
        const hotspot = new PIXI.Container();
        hotspot.position.set(spot.position.x, spot.position.y);
        hotspot.eventMode = "static";
        hotspot.cursor = "pointer";

        const ring = new PIXI.Graphics();
        ring.lineStyle(2, 0xffffff, 0.9);
        ring.drawCircle(0, 0, 16);

        const core = new PIXI.Graphics();
        core.beginFill(palette.highlight, 0.95);
        core.drawCircle(0, 0, 6);
        core.endFill();

        hotspot.addChild(ring, core);
        hotspotLayer.addChild(hotspot);
        hotspotSprites.set(spot.id, hotspot);

        hotspot.on("pointertap", () => {
          activeHotspotRef.current = spot;
          onHotspotRef.current?.(spot);
          spawnRipple(spot.position.x, spot.position.y);
          focusOn(spot.position.x, spot.position.y);
        });

        hotspot.on("pointerover", () => {
          hotspot.scale.set(1.08);
        });

        hotspot.on("pointerout", () => {
          hotspot.scale.set(1);
        });
      });

      const ripplePool: Array<{ gfx: any; life: number }> = [];

      const spawnRipple = (x: number, y: number) => {
        const gfx = new PIXI.Graphics();
        gfx.lineStyle(2, 0xffffff, 0.7);
        gfx.drawCircle(0, 0, 18);
        gfx.position.set(x, y);
        rippleLayer.addChild(gfx);
        ripplePool.push({ gfx, life: 0 });
      };

      const focusPoint = () => {
        const width = app.renderer.width;
        const height = app.renderer.height;
        return { x: width * 0.52, y: height * 0.56 };
      };

      const updateCameraTarget = (spot?: HotspotInfo | null) => {
        const scale = scene.scale.x || 1;
        const center = focusPoint();
        const target = spot
          ? { x: center.x - spot.position.x * scale, y: center.y - spot.position.y * scale }
          : { x: center.x - (BASE_WIDTH * 0.5) * scale, y: center.y - (BASE_HEIGHT * 0.5) * scale };
        cameraTargetRef.current = target;
      };

      const focusOn = (x: number, y: number) => {
        updateCameraTarget({ id: "temp", title: "", detail: "", position: { x, y } });
      };

      const resize = () => {
        if (!containerRef.current) return;
        const { width, height } = containerRef.current.getBoundingClientRect();
        app.renderer.resize(width, height);
        background.width = width;
        background.height = height;

        const scale = Math.min(width / BASE_WIDTH, height / BASE_HEIGHT) * 0.96;
        scene.scale.set(scale);
        updateCameraTarget(activeHotspotRef.current);
      };

      resize();

      resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(containerRef.current);

      let pathProgress = 0;
      const pathPoints = [
        { x: 260, y: 320 },
        { x: 430, y: 270 },
        { x: 600, y: 340 },
      ];

      app.ticker.add((ticker) => {
        const delta = ticker.deltaMS / 1000;
        pathProgress = (pathProgress + delta * 0.18) % 1;
        const segment = pathProgress < 0.5 ? 0 : 1;
        const localT = pathProgress < 0.5 ? pathProgress / 0.5 : (pathProgress - 0.5) / 0.5;
        const start = pathPoints[segment];
        const end = pathPoints[segment + 1];
        pathDot.position.set(
          start.x + (end.x - start.x) * localT,
          start.y + (end.y - start.y) * localT
        );

        ripplePool.forEach((ripple) => {
          ripple.life += delta;
          ripple.gfx.alpha = Math.max(0, 0.8 - ripple.life * 0.9);
          ripple.gfx.scale.set(1 + ripple.life * 1.6);
        });
        for (let i = ripplePool.length - 1; i >= 0; i -= 1) {
          if (ripplePool[i].life > 1) {
            ripplePool[i].gfx.destroy();
            ripplePool.splice(i, 1);
          }
        }

        const target = cameraTargetRef.current;
        camera.position.set(
          camera.position.x + (target.x - camera.position.x) * 0.08,
          camera.position.y + (target.y - camera.position.y) * 0.08
        );

        glow.clear();
        glow.beginFill(0xffffff, 0.12);
        glow.drawCircle(app.renderer.width * 0.82, app.renderer.height * 0.18, 140);
        glow.endFill();

        hotspotSprites.forEach((hotspot) => {
          hotspot.rotation = Math.sin(performance.now() / 800) * 0.02;
        });
      });

      updateCameraTarget(null);
      setReady(true);
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

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full rounded-[28px] overflow-hidden" />
      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center text-sm text-[color:var(--muted-ink)]">
          正在绘制场景...
        </div>
      )}
    </div>
  );
}
