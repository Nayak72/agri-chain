import { visibleNavItems } from "@/lib/nav";

describe("navigation permissions", () => {
  it("only exposes permitted entries", () => {
    const items = visibleNavItems(["produce:read"]);
    expect(items.map((item) => item.href)).toContain("/produce");
    expect(items.map((item) => item.href)).not.toContain("/users");
  });
});
