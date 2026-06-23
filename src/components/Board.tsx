import { useEffect, useRef } from "react";
import { Chessground } from "chessground";
import type { Api } from "chessground/api";
import type { Config } from "chessground/config";
import type { DrawShape } from "chessground/draw";

interface BoardProps {
  fen: string;
  orientation: "white" | "black";
  turnColor: "white" | "black";
  movableColor?: "white" | "black";
  dests?: Map<string, string[]>;
  lastMove?: [string, string];
  check?: boolean;
  shapes?: DrawShape[];
  viewOnly?: boolean;
  onMove?: (from: string, to: string) => void;
}

export default function Board(props: BoardProps) {
  const el = useRef<HTMLDivElement>(null);
  const api = useRef<Api | null>(null);

  function buildConfig(): Config {
    return {
      fen: props.fen,
      orientation: props.orientation,
      turnColor: props.turnColor,
      check: props.check,
      lastMove: props.lastMove as any,
      viewOnly: props.viewOnly,
      coordinates: true,
      addPieceZIndex: false,
      movable: {
        free: false,
        color: props.movableColor,
        dests: (props.dests as any) ?? new Map(),
        showDests: true,
        events: {
          after: (orig: string, dest: string) => props.onMove?.(orig, dest)
        }
      },
      premovable: { enabled: false },
      animation: { enabled: true, duration: 200 },
      draggable: { enabled: true, showGhost: true },
      drawable: { enabled: false, visible: true, autoShapes: props.shapes ?? [] }
    };
  }

  useEffect(() => {
    if (!el.current) return;
    api.current = Chessground(el.current, buildConfig());
    return () => {
      api.current?.destroy();
      api.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    api.current?.set(buildConfig());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  });

  return (
    <div className="cg-board-host">
      <div ref={el} style={{ width: "100%", height: "100%" }} />
    </div>
  );
}
