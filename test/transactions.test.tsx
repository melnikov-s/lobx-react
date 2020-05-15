import { transaction, autorun, computed, observable } from "lobx"
import * as React from "react"
import { act, render } from "@testing-library/react"

import { observer } from "../src"

test("lobx issue 50", done => {
    const foo = {
        a: observable.box(true),
        b: observable.box(false),
        c: computed((): boolean => {
            // console.log("evaluate c")
            return foo.b.get()
        })
    }
    function flipStuff() {
        transaction(() => {
            foo.a.set(!foo.a.get())
            foo.b.set(!foo.b.get())
        })
    }
    let asText = ""
    let willReactCount = 0
    autorun(() => (asText = [foo.a.get(), foo.b.get(), foo.c.get()].join(":")))
    const Test = observer(() => {
        willReactCount++
        return <div id="x">{[foo.a.get(), foo.b.get(), foo.c.get()].join(",")}</div>
    })

    render(<Test />)

    setImmediate(() => {
        act(() => {
            flipStuff()
        })
        expect(asText).toBe("false:true:true")
        expect(document.getElementById("x")!.innerHTML).toBe("false,true,true")
        expect(willReactCount).toBe(2)
        done()
    })
})

it("should respect transaction", async () => {
    const a = observable.box(2)
    const loaded = observable.box(false)
    const valuesSeen = [] as number[]

    const Component = observer(() => {
        valuesSeen.push(a.get())
        if (loaded.get()) {
            return <div>{a.get()}</div>
        }
        return <div>loading</div>
    })

    const { container } = render(<Component />)

    act(() => {
        transaction(() => {
            a.set(3)
            a.set(4)
            loaded.set(true)
        })
    })

    expect(container.textContent!.replace(/\s+/g, "")).toBe("4")
    expect(valuesSeen.sort()).toEqual([2, 4].sort())
})
