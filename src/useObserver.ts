import { listener, Graph, getDefaultGraph } from "lobx"
import React from "react"

import {
    createTrackingData,
    ReactionTracking,
    recordReactionAsCommitted,
    scheduleCleanupOfReactionIfLeaked
} from "./reactionCleanupTracking"
import { isUsingStaticRendering } from "./staticRendering"
import { useForceUpdate } from "./utils"
import { unstable_batchedUpdates } from "react-dom"

export type ForceUpdateHook = () => () => void

export interface UseObserverOptions {
    useForceUpdate?: ForceUpdateHook
    graph?: Graph
}

const EMPTY_OBJECT = {}

const pendingReactionsMap: WeakMap<
    Graph,
    { reactions: Set<() => void>; unsub?: () => void }
> = new WeakMap()

function addPendingReaction(reaction: () => void, graph: Graph): void {
    let pendingReactionsData = pendingReactionsMap.get(graph)
    if (!pendingReactionsData) {
        pendingReactionsData = { reactions: new Set() }
        pendingReactionsMap.set(graph, pendingReactionsData)
    }

    const { reactions } = pendingReactionsData

    if (reactions.size === 0) {
        pendingReactionsData!.unsub = graph.onTransactionDone(() => {
            unstable_batchedUpdates(() => {
                reactions!.forEach(fn => fn())
            })
            reactions!.clear()
            pendingReactionsData!.unsub!()
        })
    }

    reactions.add(reaction)
}

function deletePendingReaction(reaction: () => void, graph: Graph): void {
    const pendingReactions = pendingReactionsMap.get(graph)

    pendingReactions?.reactions.delete(reaction)
    if (pendingReactions?.reactions.size === 0) {
        pendingReactions.unsub?.()
    }
}

export function useObserver<T>(fn: () => T, options: UseObserverOptions = EMPTY_OBJECT): T {
    if (isUsingStaticRendering()) {
        return fn()
    }

    const wantedForceUpdateHook = options.useForceUpdate || useForceUpdate
    const graph = options.graph || getDefaultGraph()
    const forceUpdate = wantedForceUpdateHook()

    // StrictMode/ConcurrentMode/Suspense may mean that our component is
    // rendered and abandoned multiple times, so we need to track leaked
    // Reactions.
    const reactionTrackingRef = React.useRef<ReactionTracking | null>(null)

    if (!reactionTrackingRef.current) {
        // First render for this component (or first time since a previous
        // reaction from an abandoned render was disposed).

        const newReaction = listener(
            () => {
                // Observable has changed, meaning we want to re-render
                // BUT if we're a component that hasn't yet got to the useEffect()
                // stage, we might be a component that _started_ to render, but
                // got dropped, and we don't want to make state changes then.
                // (It triggers warnings in StrictMode, for a start.)
                if (trackingData.mounted) {
                    // We have reached useEffect(), so we're mounted, and can trigger an update
                    addPendingReaction(forceUpdate, graph)
                } else {
                    // We haven't yet reached useEffect(), so we'll need to trigger a re-render
                    // when (and if) useEffect() arrives.  The easiest way to do that is just to
                    // drop our current reaction and allow useEffect() to recreate it.
                    deletePendingReaction(forceUpdate, graph)
                    newReaction.dispose()
                    reactionTrackingRef.current = null
                }
            },
            { graph }
        )

        const trackingData = createTrackingData(newReaction)
        reactionTrackingRef.current = trackingData
        scheduleCleanupOfReactionIfLeaked(reactionTrackingRef)
    }

    const { reaction } = reactionTrackingRef.current!

    React.useEffect(() => {
        // Called on first mount only
        recordReactionAsCommitted(reactionTrackingRef)

        if (reactionTrackingRef.current) {
            // Great. We've already got our reaction from our render;
            // all we need to do is to record that it's now mounted,
            // to allow future observable changes to trigger re-renders
            reactionTrackingRef.current.mounted = true
        } else {
            // The reaction we set up in our render has been disposed.
            // This is either due to bad timings of renderings, e.g. our
            // component was paused for a _very_ long time, and our
            // reaction got cleaned up, or we got a observable change
            // between render and useEffect

            // Re-create the reaction
            reactionTrackingRef.current = {
                reaction: listener(
                    () => {
                        // We've definitely already been mounted at this point
                        addPendingReaction(forceUpdate, graph)
                    },
                    { graph }
                ),
                cleanAt: Infinity
            }
            forceUpdate()
        }

        return () => {
            deletePendingReaction(forceUpdate, graph)
            reactionTrackingRef.current!.reaction.dispose()
            reactionTrackingRef.current = null
        }
    }, [])

    // render the original component, but have the
    // reaction track the observables, so that rendering
    // can be invalidated (see above) once a dependency changes
    let rendering!: T
    let exception
    reaction.track(() => {
        try {
            rendering = fn()
        } catch (e) {
            exception = e
        }
    })
    if (exception) {
        throw exception // re-throw any exceptions catched during rendering
    }
    return rendering
}
