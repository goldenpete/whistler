declare module '@dnd-kit/utilities' {
    export const CSS: {
        Translate: {
            toString(transform: any): string | undefined;
        };
        Scale: {
            toString(transform: any): string | undefined;
        };
        Transform: {
            toString(transform: any): string | undefined;
        };
        Transition: {
            toString(transition: any): string;
        };
    };
}
