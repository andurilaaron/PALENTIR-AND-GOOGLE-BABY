/**
 * ViewerContext — provides the Cesium.Viewer instance to React components.
 *
 * Usage:
 *   <ViewerProvider viewer={viewerInstance}>
 *     <ChildComponents />
 *   </ViewerProvider>
 *
 *   const viewer = useViewer(); // returns Viewer | null
 */
import { createContext, useContext } from "react";
import type { ReactNode } from "react";
import type { Viewer } from "cesium";

const ViewerCtx = createContext<Viewer | null>(null);

export function ViewerProvider({
    viewer,
    children,
}: {
    viewer: Viewer | null;
    children: ReactNode;
}) {
    return <ViewerCtx.Provider value={viewer}>{children}</ViewerCtx.Provider>;
}

export function useViewer(): Viewer | null {
    return useContext(ViewerCtx);
}
