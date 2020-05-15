import { useState } from "react"

if (!useState) {
    throw new Error("lobx-react-lite requires React with Hooks support")
}
