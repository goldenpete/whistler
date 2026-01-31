// Ambient type shims to satisfy TypeScript when node_modules are unavailable.

declare module "react" {
  export type ReactNode = any;
  export type ReactElement = any;
  export type ComponentType<P = any> = any;
  
  export type KeyboardEvent<T = any> = {
    key: string;
    shiftKey: boolean;
    preventDefault: () => void;
    target: { value?: string } & T;
  };
  export type ChangeEvent<T = any> = {
    target: { value?: string; files?: FileList | null } & T;
  };
  export type MouseEvent<T = any> = {
    preventDefault: () => void;
    stopPropagation: () => void;
    target: any;
    currentTarget: any;
    clientX: number;
    clientY: number;
  };
  export type FormEvent<T = any> = {
    preventDefault: () => void;
    target: any;
  };
  
  export type ComponentProps<T> = any;

  export class Component<P = {}, S = {}, SS = any> {
      constructor(props: P, context?: any);
      setState<K extends keyof S>(
          state: ((prevState: Readonly<S>, props: Readonly<P>) => (Pick<S, K> | S | null)) | (Pick<S, K> | S | null),
          callback?: () => void
      ): void;
      forceUpdate(callback?: () => void): void;
      render(): ReactNode;
      readonly props: Readonly<P>;
      state: Readonly<S>;
      context: any;
      refs: {
          [key: string]: any;
      };
      componentDidMount?(): void;
      shouldComponentUpdate?(nextProps: Readonly<P>, nextState: Readonly<S>, nextContext: any): boolean;
      componentWillUnmount?(): void;
      componentDidCatch?(error: Error, errorInfo: any): void;
      getSnapshotBeforeUpdate?(prevProps: Readonly<P>, prevState: Readonly<S>): SS | null;
      componentDidUpdate?(prevProps: Readonly<P>, prevState: Readonly<S>, snapshot?: SS): void;
      static getDerivedStateFromError?(error: any): Partial<S> | null;
  }

  export interface ErrorInfo {
      componentStack: string;
  }

  export const StrictMode: any;

  export function useState<T>(initial: T | (() => T)): [T, (next: T | ((prev: T) => T)) => void];
  export function useEffect(effect: () => void | (() => void), deps?: unknown[]): void;
  export function useRef<T>(initialValue: T): { current: T };
  export function useRef<T>(initialValue: T | null): { current: T | null };
  export function useRef<T = undefined>(): { current: T | undefined };
  export function useMemo<T>(factory: () => T, deps: unknown[] | undefined): T;
  export function useCallback<T extends (...args: any[]) => any>(callback: T, deps: unknown[]): T;
  export function useImperativeHandle<T, R extends T>(ref: any, init: () => R, deps?: unknown[]): void;
  export function createContext<T>(defaultValue: T): any;
  export function useContext<T>(context: any): T;
  export function forwardRef<T, P = {}>(render: (props: P, ref: any) => any): any;
  
  export namespace JSX {
      interface Element { }
      interface IntrinsicAttributes {
          key?: any;
      }
      interface IntrinsicElements {
          [elemName: string]: any;
      }
  }
  
  const React: {
      useState: typeof useState;
      useEffect: typeof useEffect;
      useRef: typeof useRef;
      useMemo: typeof useMemo;
      useCallback: typeof useCallback;
      useImperativeHandle: typeof useImperativeHandle;
      createContext: typeof createContext;
      useContext: typeof useContext;
      forwardRef: typeof forwardRef;
      Fragment: any;
      createElement: any;
      KeyboardEvent: any;
      MouseEvent: any;
      ChangeEvent: any;
      FormEvent: any;
      Component: typeof Component;
      StrictMode: any;
  };
  export default React;
}

// Global JSX namespace for implicit JSX element types
declare namespace JSX {
    interface Element { }
    interface IntrinsicElements {
        [elemName: string]: any;
    }
}

declare module "react/jsx-runtime" {
  export namespace JSX {
      interface Element { }
      interface IntrinsicElements {
          [elemName: string]: any;
      }
  }
}

declare module "react-dom/client" {
    import React from "react";
    export function createRoot(container: Element | DocumentFragment | null): {
        render(children: React.ReactNode): void;
        unmount(): void;
    };
}

declare module "zustand" {
  export type StateCreator<T> = (
    set: (partial: Partial<T> | ((state: T) => Partial<T>), replace?: boolean) => void,
    get: () => T,
    api: StoreApi<T>
  ) => T;
  export type StoreApi<T> = {
    getState: () => T;
    setState: (partial: Partial<T> | ((state: T) => Partial<T>), replace?: boolean) => void;
    subscribe: (...args: any[]) => any;
    destroy: () => void;
  };
  export type UseBoundStore<T> = {
    (): T;
    <U>(selector: (state: T) => U): U;
  } & StoreApi<T>;
  export function create<T>(): (initializer: StateCreator<T>) => UseBoundStore<T>;
  export function create<T>(initializer: StateCreator<T>): UseBoundStore<T>;
}

declare module "zustand/middleware" {
    import { StateCreator } from "zustand";
    export const persist: <T>(
        config: StateCreator<T>,
        options: any
    ) => StateCreator<T>;
    export const createJSONStorage: any;
}

declare module "zustand/react/shallow" {
    export function useShallow<T, U>(selector: (state: T) => U): (state: T) => U;
}

declare module "radix-ui" {
    export const Dialog: any;
    export const DialogTrigger: any;
    export const DialogContent: any;
    export const DialogHeader: any;
    export const DialogTitle: any;
    export const DialogDescription: any;
    export const DialogFooter: any;
    export const DialogClose: any;
}

declare module "@radix-ui/react-slider" {
    export const Root: any;
    export const Track: any;
    export const Range: any;
    export const Thumb: any;
}

declare module "@radix-ui/react-dialog" {
    export const Root: any;
    export const Trigger: any;
    export const Portal: any;
    export const Close: any;
    export const Overlay: any;
    export const Content: any;
    export const Title: any;
    export const Description: any;
}

declare module "date-fns" {
    export function formatDistanceToNow(date: Date | number, options?: any): string;
    export function format(date: Date | number, formatStr: string, options?: any): string;
}

declare module "react-router-dom" {
    export function useNavigate(): any;
    export function useLocation(): any;
    export function useOutlet(): any;
    export function useParams(): any;
    export function Link(props: any): any;
    export function Outlet(): any;
    export function RouterProvider(props: any): any;
    export function createBrowserRouter(routes: any): any;
    export function Routes(props: any): any;
    export function Route(props: any): any;
    export function Navigate(props: any): any;
    export function BrowserRouter(props: any): any;
}

declare module "framer-motion" {
    export const motion: any;
    export const AnimatePresence: any;
}

declare module "react-pdf" {
    export const Document: any;
    export const Page: any;
    export const pdfjs: any;
}

declare module "react-pdf/dist/Page/AnnotationLayer.css";
declare module "react-pdf/dist/Page/TextLayer.css";

declare module "usehooks-ts" {
    export const useDebounceValue: any;
}

declare module "*.png" {
    const value: string;
    export default value;
}

declare module "*.css" {
    const value: string;
    export default value;
}

declare module "@phosphor-icons/react" {
    export const CaretDown: any;
    export const CaretLeft: any;
    export const CaretRight: any;
    export const Circle: any;
    export const Cloud: any;
    export const CloudArrowDown: any;
    export const CloudArrowUp: any;
    export const Star: any;
    export const Heart: any;
    export const Flag: any;
    export const Tag: any;
    export const Bookmark: any;
    export const Briefcase: any;
    export const House: any;
    export const User: any;
    export const Users: any;
    export const Planet: any;
    export const Rocket: any;
    export const Code: any;
    export const Cpu: any;
    export const Database: any;
    export const GameController: any;
    export const MusicNotes: any;
    export const Image: any;
    export const FilmStrip: any;
    export const FileText: any;
    export const Book: any;
    export const Gear: any;
    export const Share: any;
    export const CheckCircle: any;
    export const WarningCircle: any;
    export const CloudCheck: any;
    export const CloudWarning: any;
    export const Plus: any;
    export const Trash: any;
    export const PencilSimple: any;
    export const MagnifyingGlass: any;
    export const ArrowsClockwise: any;
    export const WaveSine: any;
    export const SidebarSimple: any;
    export const Folder: any;
    export const FolderOpen: any;
    export const FolderPlus: any;
    export const NotePencil: any;
    export const Graph: any;
    export const HardDrives: any;
    export const UploadSimple: any;
    export const DownloadSimple: any;
    export const Clock: any;
    export const ClockCounterClockwise: any;
    export const X: any;
    export const ArrowSquareOut: any;
    export const Copy: any;
    export const ShareNetwork: any;
    export const CornersIn: any;
    export const CornersOut: any;
    export const Check: any;
    export const Link: any;
    export const Play: any;
    export const Pause: any;
    export const SpeakerHigh: any;
    export const SpeakerX: any;
    export const File: any;
    export const FilePdf: any;
    export const Palette: any;
    export const Minus: any;
    export const Lightning: any;
    export const Repeat: any;
    export const GridFour: any;
    export const CircleNotch: any;
    export const LineSegment: any;
    export const Eye: any;
    export const EyeSlash: any;
    export const MagnifyingGlassPlus: any;
    export const MagnifyingGlassMinus: any;
    export const Article: any;
    export const MusicNote: any;
    export const ProjectorScreenChart: any;
    export const QrCode: any;
    export const Shuffle: any;
    export const ShieldCheck: any;
    export const SignIn: any;
    export const SignOut: any;
    export const Warning: any;
    export const TextBolder: any;
    export const TextItalic: any;
    export const ListBullets: any;
    export const TextUnderline: any;
    export const TextStrikethrough: any;
    export const TextAlignLeft: any;
    export const TextAlignCenter: any;
    export const TextAlignRight: any;
    export const ArrowsCounterClockwise: any;
    export const ArrowsClockwise: any;
    export const Rows: any;
    export const ArrowsOutSimple: any;
    export const Layout: any;
    export const Note: any;
    export const XCircle: any;
    export const FunnelSimple: any;
}

declare module "react-dom/server" {
    export function renderToStaticMarkup(element: any): string;
}

declare module "@dnd-kit/core" {
    export const DndContext: any;
    export const closestCenter: any;
    export const KeyboardSensor: any;
    export const PointerSensor: any;
    export const useSensor: any;
    export const useSensors: any;
    export type DragEndEvent = any;
}

declare module "@dnd-kit/sortable" {
    export const arrayMove: any;
    export const SortableContext: any;
    export const sortableKeyboardCoordinates: any;
    export const verticalListSortingStrategy: any;
    export const useSortable: any;
}

declare module "@dnd-kit/utilities" {
    export const CSS: any;
}
