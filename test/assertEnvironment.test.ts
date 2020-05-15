afterEach(() => {
    jest.resetModules()
    jest.resetAllMocks()
})

it("throws if react is not installed", () => {
    jest.mock("react", () => ({}))
    expect(() => require("../src/assertEnvironment.ts")).toThrowErrorMatchingInlineSnapshot(
        `"lobx-react-lite requires React with Hooks support"`
    )
})
