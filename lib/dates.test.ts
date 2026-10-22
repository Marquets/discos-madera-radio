import { describe, expect, it } from "vitest";
import { isoWeek, month } from "./dates";

describe("isoWeek", () => {
  it("groups Monday to Sunday", () => {
    expect(isoWeek("2026-10-19T00:00:00Z").key).toBe("2026-W43");
    expect(isoWeek("2026-10-25T23:59:00Z").key).toBe("2026-W43");
    expect(isoWeek("2026-10-26T00:00:00Z").key).toBe("2026-W44");
  });

  it("labels the week by its days", () => {
    expect(isoWeek("2026-10-22T10:00:00Z").label).toBe("19 – 25 octubre 2026");
    expect(isoWeek("2026-10-01T10:00:00Z").label).toBe("28 septiembre – 4 octubre 2026");
  });

  it("assigns early January to the previous year's last week", () => {
    expect(isoWeek("2027-01-01T12:00:00Z")).toEqual({ key: "2026-W53", label: "28 diciembre 2026 – 3 enero 2027" });
  });
});

describe("month", () => {
  it("labels in Spanish", () => {
    expect(month("2026-10-22T10:00:00Z")).toEqual({ key: "2026-10", label: "octubre 2026" });
  });
});
