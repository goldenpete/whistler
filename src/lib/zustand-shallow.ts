import { useRef } from 'react';

function shallow(objA: any, objB: any) {
    if (Object.is(objA, objB)) {
        return true;
    }
    if (typeof objA !== 'object' || objA === null || typeof objB !== 'object' || objB === null) {
        return false;
    }
    const keysA = Object.keys(objA);
    const keysB = Object.keys(objB);
    if (keysA.length !== keysB.length) {
        return false;
    }
    for (let i = 0; i < keysA.length; i++) {
        if (!Object.prototype.hasOwnProperty.call(objB, keysA[i]) || !Object.is(objA[keysA[i]], objB[keysA[i]])) {
            return false;
        }
    }
    return true;
}

export function useShallow<S, U>(selector: (state: S) => U): (state: S) => U {
    const prev = useRef<U | undefined>(undefined);
    return (state: S) => {
        const next = selector(state);
        if (prev.current !== undefined && shallow(prev.current, next)) {
            return prev.current;
        }
        prev.current = next;
        return next;
    };
}
