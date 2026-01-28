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
    target: { value?: string } & T;
  };
  export type MouseEvent<T = any> = {
    preventDefault: () => void;
    stopPropagation: () => void;
    target: any;
    currentTarget: any;
  };

  export function useState<T>(initial: T | (() => T)): [T, (next: T) => void];
  export function useEffect(effect: () => void | (() => void), deps?: unknown[]): void;
  export function createContext<T>(defaultValue: T): any;
  export function useContext<T>(context: any): T;
  export function forwardRef<T, P = {}>(render: (props: P, ref: any) => any): any;
  
  export namespace JSX {
      interface Element { }
      interface IntrinsicElements {
          [elemName: string]: any;
      }
  }
  
  const React: any;
  export default React;
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

declare module "react-dom" {
    export function createPortal(children: any, container: any): any;
}

declare module "react/jsx-runtime" {
  export const jsx: any;
  export const jsxs: any;
  export const Fragment: any;
  
  export namespace JSX {
      interface Element { }
      interface IntrinsicElements {
          [elemName: string]: any;
      }
  }
}

declare module "@phosphor-icons/react" {
  export type IconProps = { size?: number; weight?: string; className?: string; style?: any };
  export const Folder: (props: IconProps) => any;
  export const Star: (props: IconProps) => any;
  export const Heart: (props: IconProps) => any;
  export const Flag: (props: IconProps) => any;
  export const Tag: (props: IconProps) => any;
  export const Bookmark: (props: IconProps) => any;
  export const Briefcase: (props: IconProps) => any;
  export const House: (props: IconProps) => any;
  export const User: (props: IconProps) => any;
  export const Users: (props: IconProps) => any;
  export const Planet: (props: IconProps) => any;
  export const Rocket: (props: IconProps) => any;
  export const Code: (props: IconProps) => any;
  export const Cpu: (props: IconProps) => any;
  export const Database: (props: IconProps) => any;
  export const GameController: (props: IconProps) => any;
  export const MusicNotes: (props: IconProps) => any;
  export const Image: (props: IconProps) => any;
  export const FilmStrip: (props: IconProps) => any;
  export const FileText: (props: IconProps) => any;
  export const Book: (props: IconProps) => any;
  export const Palette: (props: IconProps) => any;
  export const Check: (props: IconProps) => any;
  
  // Added icons
  export const File: (props: IconProps) => any;
  export const MusicNote: (props: IconProps) => any;
  export const FilePdf: (props: IconProps) => any;
  export const Clock: (props: IconProps) => any;
  export const Plus: (props: IconProps) => any;
  export const Graph: (props: IconProps) => any;
  export const HardDrives: (props: IconProps) => any;
  export const NotePencil: (props: IconProps) => any;
  export const ProjectorScreenChart: (props: IconProps) => any;
  export const Copy: (props: IconProps) => any;
  export const Trash: (props: IconProps) => any;
  export const ArrowSquareOut: (props: IconProps) => any;
  export const PencilSimple: (props: IconProps) => any;

  // More added icons
  export const SidebarSimple: (props: IconProps) => any;
  export const FolderOpen: (props: IconProps) => any;
  export const FolderPlus: (props: IconProps) => any;
  export const MagnifyingGlass: (props: IconProps) => any;
  export const ArrowsClockwise: (props: IconProps) => any;
  export const WaveSine: (props: IconProps) => any;
  export const CaretDown: (props: IconProps) => any;
  export const CaretLeft: (props: IconProps) => any;
  export const CaretRight: (props: IconProps) => any;
  export const Cloud: (props: IconProps) => any;
  export const Gear: (props: IconProps) => any;
  export const Share: (props: IconProps) => any;
  export const CheckCircle: (props: IconProps) => any;
  export const WarningCircle: (props: IconProps) => any;
  export const CloudCheck: (props: IconProps) => any;
  export const CloudWarning: (props: IconProps) => any;
  export const UploadSimple: (props: IconProps) => any;
  export const DownloadSimple: (props: IconProps) => any;
  export const ClockCounterClockwise: (props: IconProps) => any;
  export const CheckSquare: (props: IconProps) => any;
  export const Square: (props: IconProps) => any;
  export const X: (props: IconProps) => any;
  export const Rows: (props: IconProps) => any;
  export const GridFour: (props: IconProps) => any;
  export const LinkSimple: (props: IconProps) => any;
  export const ShareNetwork: (props: IconProps) => any;
  export const FileVideo: (props: IconProps) => any;
  export const Lightning: (props: IconProps) => any;
}

// Image imports
declare module "*.png" {
  const value: string;
  export default value;
}

// External libs
declare module "date-fns" {
  export function formatDistanceToNow(date: number | Date, options?: any): string;
}

declare module "react-router-dom" {
  export const Link: any;
  export function useNavigate(): (path: string) => void;
  export function useLocation(): { pathname: string };
  export function useSearchParams(): [URLSearchParams, (params: any) => void];
  export const Outlet: any;
  export function useOutlet(): any;
}

declare module "framer-motion" {
    export const motion: any;
    export const AnimatePresence: any;
}

// Global JSX namespace
declare namespace JSX {
  interface Element { }
  interface IntrinsicElements {
    [elemName: string]: any;
  }
}
