# lobx-react (Forked from mobx-react-lite)

**You need React version 16.8.0 and above**

## API reference ⚒

### **`<Observer>{renderFn}</Observer>`**

Is a React component, which applies observer to an anonymous region in your component.

### **`observer<P>(baseComponent: FunctionComponent<P>, options?: ObserverOptions): FunctionComponent<P>`**

```ts
interface ObserverOptions {
    // Pass true to wrap the inner component with React.forwardRef.
    // It's false by the default.
    forwardRef?: boolean
}
```

The observer converts a component into a reactive component, which tracks which observables are used automatically and re-renders the component when one of these values changes.

### **`useObserver<T>(fn: () => T, baseComponentName = "observed", options?: UseObserverOptions): T`**

```ts
interface UseObserverOptions {
    // optional custom hook that should make a component re-render (or not) upon changes
    useForceUpdate: () => () => void
}
```

It allows you to use an observer like behaviour, but still allowing you to optimize the component in any way you want (e.g. using memo with a custom areEqual, using forwardRef, etc.) and to declare exactly the part that is observed (the render phase).

### **`useLocalStore<T, S>(initializer: () => T, source?: S): T`**

Local observable state can be introduced by using the useLocalStore hook, that runs its initializer function once to create an observable store and keeps it around for a lifetime of a component.

### **`useAsObservableSource<T>(source: T): T`**

The useAsObservableSource hook can be used to turn any set of values into an observable object that has a stable reference (the same object is returned every time from the hook).
