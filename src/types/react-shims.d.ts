// Ambient type shims to satisfy TypeScript when node_modules are unavailable.

declare module "react" {
  export type ReactNode = any;
  export type ReactElement = any;
  export type ComponentType<P = any> = any;
  
  export type KeyboardEvent<T = any> = {
    key: string;
    code: string;
    shiftKey: boolean;
    ctrlKey: boolean;
    altKey: boolean;
    metaKey: boolean;
    preventDefault: () => void;
    stopPropagation: () => void;
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
    screenX: number;
    screenY: number;
    pageX: number;
    pageY: number;
    button: number;
    buttons: number;
    ctrlKey: boolean;
    shiftKey: boolean;
    altKey: boolean;
    metaKey: boolean;
    type: string;
  };
  export type FormEvent<T = any> = {
    preventDefault: () => void;
    target: any;
  };
  export type WheelEvent<T = any> = {
    deltaX: number;
    deltaY: number;
    deltaZ: number;
    deltaMode: number;
    preventDefault: () => void;
    stopPropagation: () => void;
    clientX: number;
    clientY: number;
    ctrlKey: boolean;
    shiftKey: boolean;
    altKey: boolean;
    metaKey: boolean;
  };
  export type SyntheticEvent<T = any> = {
    preventDefault: () => void;
    stopPropagation: () => void;
    target: any;
    currentTarget: any;
    type: string;
    nativeEvent: any;
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
      createElement: (type: any, props?: any, ...children: any[]) => any;
      Component: typeof Component;
      Fragment: any;
  };
  export default React;
}

declare module "react/jsx-runtime" {
  export namespace JSX {
      interface Element { }
      interface IntrinsicAttributes {
          key?: any;
      }
      interface IntrinsicElements {
          [elemName: string]: any;
      }
  }
}

declare module "react-dom/client" {
  export function createRoot(container: Element | DocumentFragment): {
    render(children: React.ReactNode): void;
    unmount(): void;
  };
}

declare module "lucide-react" {
  export const ChevronRight: any;
  export const ChevronDown: any;
  export const File: any;
  export const Folder: any;
  export const MoreVertical: any;
  export const Plus: any;
  export const Search: any;
  export const Settings: any;
  export const Trash: any;
  export const X: any;
  // Add other icons as needed
}

declare module "clsx" {
  export default function clsx(...args: any[]): string;
}

declare module "tailwind-merge" {
  export function twMerge(...args: any[]): string;
}

declare module "date-fns" {
  export function format(date: Date | number, format: string): string;
  export function formatDistanceToNow(date: Date | number, options?: { addSuffix?: boolean }): string;
}

declare module "react-router-dom" {
  export function BrowserRouter(props: any): any;
  export function Routes(props: any): any;
  export function Route(props: any): any;
  export function Link(props: any): any;
  export function useNavigate(): (path: string | number) => void;
  export function useLocation(): { pathname: string; search: string; hash: string; state: any };
  export function useParams<T extends string = string>(): Readonly<Record<T, string | undefined>>;
  export function Outlet(): any;
  export function useOutlet(): any;
  export function Navigate(props: { to: string; replace?: boolean }): any;
  export function useSearchParams(): [URLSearchParams, (newParams: any) => void];
}

declare module "radix-ui" {
  export const Select: any;
  export const Popover: any;
  export const DropdownMenu: any;
  export const ContextMenu: any;
  export const AlertDialog: any;
  export const Dialog: any;
  export const Slot: any;
}

declare module "cmdk" {
  export const Command: any;
}

declare module "@phosphor-icons/react" {
    export const CaretRight: any;
    export const CaretDown: any;
    export const CaretUp: any;
    export const DotsThree: any;
    export const House: any;
    export const Folder: any;
    export const FolderPlus: any;
    export const Trash: any;
    export const Plus: any;
    export const Minus: any;
    export const MagnifyingGlass: any;
    export const FileText: any;
    export const FilePdf: any;
    export const Image: any;
    export const FilmStrip: any;
    export const DotsThreeVertical: any;
    export const X: any;
    export const Check: any;
    export const ArrowsDownUp: any;
    export const FunnelSimple: any;
    export const SquaresFour: any;
    export const List: any;
    export const CaretLeft: any;
    export const DownloadSimple: any;
    export const ShareNetwork: any;
    export const PencilSimple: any;
    export const Star: any;
    export const Heart: any;
    export const Flag: any;
    export const Tag: any;
    export const Bookmark: any;
    export const Briefcase: any;
    export const Clock: any;
    export const User: any;
    export const Users: any;
    export const Planet: any;
    export const Rocket: any;
    export const Code: any;
    export const Cpu: any;
    export const Database: any;
    export const GameController: any;
    export const MusicNotes: any;
    export const Book: any;
    export const Cloud: any;
    export const CloudCheck: any;
    export const CloudWarning: any;
    export const CloudArrowDown: any;
    export const CloudArrowUp: any;
    export const HardDrives: any;
    export const ArrowsClockwise: any;
    export const WaveSine: any;
    export const Gear: any;
    export const VideoCamera: any;
    export const MusicNote: any;
    export const File: any;
    export const CheckCircle: any;
    export const WarningCircle: any;
    export const ArrowCounterClockwise: any;
    export const ArrowsCounterClockwise: any;
    export const XCircle: any;
    export const Circle: any;
    export const Graph: any;
    export const NotePencil: any;
    export const Note: any;
    export const LineSegment: any;
    export const Article: any;
    export const Rows: any;
    export const ProjectorScreenChart: any;
    export const FolderOpen: any;
    export const ArrowSquareOut: any;
    export const Copy: any;
    export const Palette: any;
    export const Share: any;
    export const FileVideo: any;
    export const CheckSquare: any;
    export const Square: any;
    export const LinkSimple: any;
    export const Link: any;
    export const ArrowsOutSimple: any;
    export const MagnifyingGlassPlus: any;
    export const MagnifyingGlassMinus: any;
    export const SidebarSimple: any;
    export const UploadSimple: any;
    export const ClockCounterClockwise: any;
    export const EyeSlash: any;
    export const Eye: any;
    export const CornersIn: any;
    export const CornersOut: any;
    export const TextB: any;
    export const TextItalic: any;
    export const TextUnderline: any;
    export const TextStrikethrough: any;
    export const TextAlignLeft: any;
    export const TextAlignCenter: any;
    export const TextAlignRight: any;
    export const ListBullets: any;
    export const Layout: any;
    export const Play: any;
    export const Pause: any;
    export const SpeakerHigh: any;
    export const SpeakerX: any;
    export const Repeat: any;
    export const Lightning: any;
    export const CircleNotch: any;
    export const SignIn: any;
    export const SignOut: any;
    export const Shuffle: any;
    export const ShieldCheck: any;
    export const Warning: any;
    export const QrCode: any;
}

declare module "framer-motion" {
    export const motion: any;
    export const AnimatePresence: any;
}

declare module "*.png" {
    const value: string;
    export default value;
}

declare module "*.css" {
    const value: string;
    export default value;
}

declare module "@dnd-kit/core" {
    export const DndContext: any;
    export const closestCenter: any;
    export const pointerWithin: any;
    export const KeyboardSensor: any;
    export const PointerSensor: any;
    export const useSensor: any;
    export const useSensors: any;
    export const DragOverlay: any;
    export const useDraggable: any;
    export const useDroppable: any;
    export type DragEndEvent = any;
    export type DragStartEvent = any;
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

declare module "usehooks-ts" {
    export function useDebounceValue<T>(value: T, delay: number): [T, (value: T) => void];
}

declare module "react-pdf" {
    export const Document: any;
    export const Page: any;
    export const pdfjs: any;
}

declare module "react-pdf/dist/Page/AnnotationLayer.css";
declare module "react-pdf/dist/Page/TextLayer.css";

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

declare module "zustand" {
    export type StateCreator<T> = (
        set: (partial: T | Partial<T> | ((state: T) => T | Partial<T>)) => void,
        get: () => T,
        api: any
    ) => T;
    export type UseBoundStore<T> = {
        (): T;
        <U>(selector: (state: T) => U): U;
        setState: (partial: T | Partial<T> | ((state: T) => T | Partial<T>), replace?: boolean) => void;
        getState: () => T;
    };
    export function create<T>(): (initializer: StateCreator<T>) => UseBoundStore<T>;
}

declare module "zustand/middleware" {
    import type { StateCreator } from "zustand";
    export function persist<T>(initializer: StateCreator<T>, options: any): StateCreator<T>;
    export function createJSONStorage<T>(getStorage: () => Storage): any;
}

declare module "react-dom/server" {
    export function renderToStaticMarkup(element: any): string;
}
