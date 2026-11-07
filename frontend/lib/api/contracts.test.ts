import { asPage } from "@/lib/api/contracts";

describe("Page contract", () => {
  it("normalizes legacy arrays", () => {
    expect(asPage(["a", "b"], { page: 2, page_size: 1 })).toEqual({
      items: ["a", "b"], total: 2, page: 2, page_size: 1, has_next: false,
    });
  });
});
